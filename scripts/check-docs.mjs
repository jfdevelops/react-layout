import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Validates docs/docs.json and every public page against the contract in
 * docs/maintainers/content-contract.md. It uses Node builtins only.
 */
export const SCHEMA_VERSION = 1;
export const VERSION_STATUSES = ['current', 'previous', 'legacy', 'next'];
export const EXAMPLE_VERIFICATIONS = ['typechecked', 'adapted-from-source'];
export const FENCE_LANGUAGES = [
  'ts',
  'tsx',
  'js',
  'jsx',
  'json',
  'sh',
  'bash',
  'text',
  'css',
  'diff',
  'yaml',
];
export const IMAGE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.avif',
];
export const FRONTMATTER_KEYS = ['title', 'description', 'order'];
export const COMPANION_NAMES = [
  'adapter',
  'adapters',
  'adapter-zod',
  'adapter-valibot',
  'adapter-arktype',
  'adapter-effect',
  'devtools',
  'devtools-core',
  'devtools-react',
  'devtools-vite',
  'composable-access',
  'composable-actions',
  'composable-breadcrumb',
  'composable-copy',
  'composable-navigation',
];
const COMPANION_KEYS = ['libraries', 'packages', 'companions', 'adapters'];
const SEGMENT = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COMMIT = /^[0-9a-f]{40}$/;
const VERSION_ID = /^v\d+$/;
const MAX_SEGMENTS = 3;

function issue(errors, code, file, message) {
  errors.push({
    code,
    file,
    message,
  });
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);

  return (
    relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
  );
}

/** Parses the `---` frontmatter block. Values are plain scalars. */
export function parseFrontmatter(text) {
  const normalized = text.replace(/\r\n/g, '\n');

  if (!normalized.startsWith('---\n')) {
    return {
      data: null,
      body: normalized,
      error: 'The page must start with a frontmatter block.',
    };
  }

  const end = normalized.indexOf('\n---', 4);

  if (end === -1) {
    return {
      data: null,
      body: normalized,
      error: 'The frontmatter block is not closed.',
    };
  }

  const data = {};
  const lines = normalized.slice(4, end).split('\n');

  for (const line of lines) {
    if (line.trim() === '') {
      continue;
    }

    const colon = line.indexOf(':');

    if (colon === -1) {
      return {
        data: null,
        body: normalized,
        error: `Frontmatter line "${line}" is not "key: value".`,
      };
    }

    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();

    if (/^(".*"|'.*')$/.test(value)) {
      value = value.slice(1, -1);
    }

    data[key] = value;
  }

  const after = normalized.indexOf('\n', end + 1);

  return {
    data,
    body: after === -1 ? '' : normalized.slice(after + 1),
    bodyOffset: normalized.slice(
      0,
      after === -1 ? normalized.length : after + 1,
    ).length,
  };
}

/** GitHub-style heading slug without the duplicate suffix. */
export function slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s/g, '-');
}

function plainHeading(text) {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .trim();
}

function stripInlineCode(line) {
  return line.replace(/`[^`]*`/g, (match) => ' '.repeat(match.length));
}

/**
 * Walks a Markdown body and returns its headings, links, images, code fences
 * and any construct the contract rejects.
 */
export function scanMarkdown(body) {
  const result = {
    headings: [],
    links: [],
    fences: [],
    problems: [],
  };
  const seen = new Map();
  const lines = body.split('\n');
  let fence = null;

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const fenceMatch = /^\s*(`{3,}|~{3,})\s*(.*)$/.exec(rawLine);

    if (fence) {
      if (
        fenceMatch &&
        fenceMatch[1][0] === fence.marker[0] &&
        fenceMatch[1].length >= fence.marker.length &&
        fenceMatch[2] === ''
      ) {
        result.fences.push({
          ...fence,
          content: fence.lines.join('\n'),
        });
        fence = null;
      } else {
        fence.lines.push(rawLine);
      }

      return;
    }

    if (fenceMatch) {
      const info = fenceMatch[2].trim();
      const [language = '', ...rest] = info.split(/\s+/).filter(Boolean);

      fence = {
        marker: fenceMatch[1],
        language,
        info,
        example: rest
          .map((part) => /^example=(.+)$/.exec(part)?.[1])
          .find(Boolean),
        line: lineNumber,
        lines: [],
      };

      return;
    }

    const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(rawLine);

    if (heading) {
      const text = plainHeading(heading[2]);
      const base = slugifyHeading(text);
      const count = seen.get(base) ?? 0;

      seen.set(base, count + 1);
      result.headings.push({
        level: heading[1].length,
        text,
        slug: count === 0 ? base : `${base}-${count}`,
        line: lineNumber,
      });
    }

    const line = stripInlineCode(rawLine);

    if (/<\/?[A-Za-z][^>\n]*>|<!--/.test(line)) {
      result.problems.push({
        code: 'page-html',
        line: lineNumber,
        message:
          'Raw HTML, HTML comments and angle-bracket autolinks are not supported.',
      });
    }

    if (/^\s*\[[^\]]+\]:\s+\S+/.test(line)) {
      result.problems.push({
        code: 'link-reference-style',
        line: lineNumber,
        message: 'Reference-style links are not supported. Use inline links.',
      });
    }

    for (const match of line.matchAll(
      /(!?)\[([^\]]*)\]\(([^)\s]*)(?:\s+"[^"]*")?\)/g,
    )) {
      result.links.push({
        image: match[1] === '!',
        text: match[2],
        target: match[3],
        line: lineNumber,
      });
    }
  });

  if (fence) {
    result.problems.push({
      code: 'code-fence-unclosed',
      line: fence.line,
      message: 'A code fence is never closed.',
    });
  }

  return result;
}

function readJson(file, errors) {
  if (!existsSync(file)) {
    issue(errors, 'manifest-missing', file, 'docs/docs.json does not exist.');

    return null;
  }

  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    issue(
      errors,
      'manifest-invalid-json',
      file,
      `docs.json is not valid JSON: ${error.message}`,
    );

    return null;
  }
}

function checkKeys(errors, file, label, value, required, optional = []) {
  if (!isPlainObject(value)) {
    issue(errors, 'manifest-shape', file, `${label} must be an object.`);

    return false;
  }

  let ok = true;

  for (const key of required) {
    if (!(key in value)) {
      issue(errors, 'manifest-shape', file, `${label} is missing "${key}".`);
      ok = false;
    }
  }

  for (const key of Object.keys(value)) {
    if (!required.includes(key) && !optional.includes(key)) {
      issue(
        errors,
        'manifest-shape',
        file,
        `${label} has an unknown key "${key}".`,
      );
      ok = false;
    }
  }

  return ok;
}

function namesCompanion(value) {
  const text = String(value).toLowerCase();
  const slug = slugifyHeading(text);

  return (
    COMPANION_NAMES.includes(slug) ||
    COMPANION_NAMES.includes(text) ||
    text.includes('@jfdevelops/') ||
    /^react-layout-/.test(slug)
  );
}

function validateManifest(manifest, file, errors) {
  const topRequired = [
    'schemaVersion',
    'library',
    'defaultVersion',
    'docsBaseCommit',
    'auditedOn',
    'excluded',
    'legacyRedirects',
    'versions',
  ];

  if (
    !checkKeys(errors, file, 'The manifest', manifest, topRequired, ['$schema'])
  ) {
    for (const key of Object.keys(manifest ?? {})) {
      if (COMPANION_KEYS.includes(key)) {
        issue(
          errors,
          'companion-collection',
          file,
          `The manifest has a "${key}" collection. Companion packages are documented inside the library, never as their own collection.`,
        );
      }
    }
  }

  if (!isPlainObject(manifest)) {
    return false;
  }

  if (manifest.schemaVersion !== SCHEMA_VERSION) {
    issue(
      errors,
      'schema-version',
      file,
      `schemaVersion must be ${SCHEMA_VERSION}, found ${JSON.stringify(manifest.schemaVersion)}.`,
    );
  }

  const library = manifest.library;

  if (Array.isArray(library)) {
    issue(
      errors,
      'library-identity',
      file,
      'There must be exactly one library, so "library" cannot be a list.',
    );
  } else if (
    checkKeys(errors, file, '"library"', library, [
      'id',
      'name',
      'npmPackage',
      'repository',
    ])
  ) {
    if (library.id !== 'react-layout') {
      issue(
        errors,
        'library-identity',
        file,
        `library.id must be "react-layout", found "${library.id}".`,
      );
    }

    if (!/^@[a-z0-9-]+\/[a-z0-9-]+$/.test(library.npmPackage ?? '')) {
      issue(
        errors,
        'library-identity',
        file,
        'library.npmPackage must look like "@scope/name".',
      );
    }

    if (!/^https:\/\//.test(library.repository ?? '')) {
      issue(
        errors,
        'library-identity',
        file,
        'library.repository must be an https URL.',
      );
    }
  }

  if (!COMMIT.test(manifest.docsBaseCommit ?? '')) {
    issue(
      errors,
      'manifest-shape',
      file,
      'docsBaseCommit must be a 40-character commit hash.',
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.auditedOn ?? '')) {
    issue(errors, 'manifest-shape', file, 'auditedOn must be YYYY-MM-DD.');
  }

  if (
    !Array.isArray(manifest.excluded) ||
    !manifest.excluded.includes('maintainers')
  ) {
    issue(
      errors,
      'manifest-shape',
      file,
      '"excluded" must be a list that includes "maintainers".',
    );
  } else if (manifest.excluded.some((entry) => !SEGMENT.test(entry))) {
    issue(
      errors,
      'path-containment',
      file,
      '"excluded" entries must be single directory names.',
    );
  }

  if (!Array.isArray(manifest.legacyRedirects)) {
    issue(errors, 'manifest-shape', file, '"legacyRedirects" must be a list.');
  }

  if (!Array.isArray(manifest.versions) || manifest.versions.length === 0) {
    issue(
      errors,
      'manifest-shape',
      file,
      '"versions" must be a non-empty list.',
    );

    return false;
  }

  return true;
}

function validateVersions(manifest, file, errors) {
  const ids = new Set();
  const valid = [];
  let previousMajor = Infinity;

  manifest.versions.forEach((version, index) => {
    const label = `versions[${index}]`;
    const required = [
      'id',
      'label',
      'major',
      'status',
      'path',
      'package',
      'source',
      'examples',
      'navigation',
    ];

    if (!checkKeys(errors, file, label, version, required, ['note'])) {
      return;
    }

    if (!VERSION_ID.test(version.id)) {
      issue(
        errors,
        'version-id',
        file,
        `${label}.id "${version.id}" must match v<number>.`,
      );

      return;
    }

    if (ids.has(version.id)) {
      issue(
        errors,
        'version-id',
        file,
        `Version id "${version.id}" is used more than once.`,
      );

      return;
    }

    ids.add(version.id);

    if (version.path !== version.id) {
      issue(
        errors,
        'path-containment',
        file,
        `${version.id}: path must equal the id, found "${version.path}".`,
      );
    }

    if (!VERSION_STATUSES.includes(version.status)) {
      issue(
        errors,
        'version-status',
        file,
        `${version.id}: status "${version.status}" is not one of ${VERSION_STATUSES.join(', ')}.`,
      );
    }

    if (
      !Number.isInteger(version.major) ||
      `v${version.major}` !== version.id
    ) {
      issue(
        errors,
        'version-id',
        file,
        `${version.id}: major must be the integer in the id.`,
      );
    } else if (version.major >= previousMajor) {
      issue(
        errors,
        'version-order',
        file,
        `${version.id}: versions must be ordered newest first.`,
      );
    } else {
      previousMajor = version.major;
    }

    if (typeof version.label !== 'string' || version.label.trim() === '') {
      issue(
        errors,
        'manifest-shape',
        file,
        `${version.id}: label must be text.`,
      );
    }

    validateProvenance(manifest, version, file, errors);
    valid.push(version);
  });

  const current = valid.filter((version) => version.status === 'current');

  if (current.length !== 1) {
    issue(
      errors,
      'default-version',
      file,
      `Exactly one version must have status "current", found ${current.length}.`,
    );
  }

  if (!ids.has(manifest.defaultVersion)) {
    issue(
      errors,
      'default-version',
      file,
      `defaultVersion "${manifest.defaultVersion}" is not a documented version.`,
    );
  } else if (
    current.length === 1 &&
    current[0].id !== manifest.defaultVersion
  ) {
    issue(
      errors,
      'default-version',
      file,
      `defaultVersion "${manifest.defaultVersion}" must be the "current" version "${current[0].id}".`,
    );
  }

  return valid;
}

function validateProvenance(manifest, version, file, errors) {
  const id = version.id;
  const pkg = version.package;
  const source = version.source;
  const examples = version.examples;

  if (
    checkKeys(errors, file, `${id}.package`, pkg, [
      'name',
      'publishedVersions',
      'firstVersion',
      'endpointVersion',
    ])
  ) {
    if (pkg.name !== manifest.library?.npmPackage) {
      issue(
        errors,
        'library-identity',
        file,
        `${id}: package.name "${pkg.name}" must equal library.npmPackage. Companion packages have no versions of their own.`,
      );
    }

    if (!Number.isInteger(pkg.publishedVersions) || pkg.publishedVersions < 0) {
      issue(
        errors,
        'source-provenance',
        file,
        `${id}: package.publishedVersions must be a non-negative integer.`,
      );
    }
  }

  if (
    checkKeys(errors, file, `${id}.source`, source, [
      'kind',
      'repository',
      'tag',
      'commit',
      'publishedAt',
      'provenance',
      'firstRelease',
    ])
  ) {
    if (source.kind !== 'release-tag') {
      issue(
        errors,
        'source-provenance',
        file,
        `${id}: source.kind must be "release-tag".`,
      );
    }

    if (source.tag !== `${pkg?.name}@${pkg?.endpointVersion}`) {
      issue(
        errors,
        'source-provenance',
        file,
        `${id}: source.tag "${source.tag}" must be "<package>@<endpointVersion>".`,
      );
    }

    if (!COMMIT.test(source.commit ?? '')) {
      issue(
        errors,
        'source-provenance',
        file,
        `${id}: source.commit must be a 40-character commit hash.`,
      );
    }

    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(source.publishedAt ?? '')
    ) {
      issue(
        errors,
        'source-provenance',
        file,
        `${id}: source.publishedAt must be an ISO UTC timestamp from the registry.`,
      );
    }

    const first = source.firstRelease;

    if (
      checkKeys(errors, file, `${id}.source.firstRelease`, first, [
        'version',
        'tag',
        'commit',
      ])
    ) {
      if (first.commit !== null && !COMMIT.test(first.commit)) {
        issue(
          errors,
          'source-provenance',
          file,
          `${id}: firstRelease.commit must be a commit hash or null.`,
        );
      }

      if (first.version !== pkg?.firstVersion) {
        issue(
          errors,
          'source-provenance',
          file,
          `${id}: firstRelease.version must equal package.firstVersion.`,
        );
      }
    }
  }

  if (
    checkKeys(errors, file, `${id}.examples`, examples, [
      'verification',
      'fixtures',
      'command',
    ])
  ) {
    if (!EXAMPLE_VERIFICATIONS.includes(examples.verification)) {
      issue(
        errors,
        'manifest-shape',
        file,
        `${id}: examples.verification must be one of ${EXAMPLE_VERIFICATIONS.join(', ')}.`,
      );
    } else if (
      examples.verification === 'typechecked' &&
      (!examples.fixtures || !examples.command)
    ) {
      issue(
        errors,
        'manifest-shape',
        file,
        `${id}: "typechecked" examples need fixtures and command.`,
      );
    } else if (
      examples.verification === 'adapted-from-source' &&
      (examples.fixtures || examples.command)
    ) {
      issue(
        errors,
        'manifest-shape',
        file,
        `${id}: "adapted-from-source" examples must not claim fixtures or a command.`,
      );
    }
  }
}

function collectFiles(directory) {
  const entries = readdirSync(directory, {
    withFileTypes: true,
  });

  return entries.flatMap((entry) => {
    const full = path.join(directory, entry.name);

    return entry.isDirectory() ? collectFiles(full) : [full];
  });
}

function loadPages(docsRoot, version, errors) {
  const versionDir = path.join(docsRoot, version.path);
  const pages = new Map();
  const assets = new Set();

  if (!existsSync(versionDir) || !statSync(versionDir).isDirectory()) {
    issue(
      errors,
      'version-directory',
      `docs/${version.path}`,
      `The directory for ${version.id} does not exist.`,
    );

    return {
      versionDir,
      pages,
      assets,
    };
  }

  for (const full of collectFiles(versionDir)) {
    const relative = toPosix(path.relative(versionDir, full));
    const display = `docs/${version.path}/${relative}`;

    if (relative.startsWith('assets/')) {
      if (IMAGE_EXTENSIONS.includes(path.extname(relative).toLowerCase())) {
        assets.add(relative);
      } else {
        issue(
          errors,
          'unsupported-file',
          display,
          `Assets must be images (${IMAGE_EXTENSIONS.join(', ')}).`,
        );
      }

      continue;
    }

    if (!relative.endsWith('.md')) {
      issue(
        errors,
        'unsupported-file',
        display,
        'Only .md pages and images under assets/ are allowed in a version directory.',
      );

      continue;
    }

    const id = relative.slice(0, -3);
    const segments = id.split('/');

    if (
      segments.length > MAX_SEGMENTS ||
      segments.some((segment) => !SEGMENT.test(segment))
    ) {
      issue(
        errors,
        'page-slug',
        display,
        `Page id "${id}" must be lowercase kebab-case with at most ${MAX_SEGMENTS} segments.`,
      );
    }

    pages.set(id, {
      id,
      file: display,
      full,
    });
  }

  return {
    versionDir,
    pages,
    assets,
  };
}

function checkNavigation(version, collection, errors) {
  const where = `docs/docs.json`;
  const listed = new Map();
  const flat = [];

  version.navigation.forEach((group, index) => {
    const label = `${version.id}.navigation[${index}]`;

    if (!checkKeys(errors, where, label, group, ['title', 'pages'])) {
      return;
    }

    if (typeof group.title !== 'string' || group.title.trim() === '') {
      issue(errors, 'nav-shape', where, `${label}.title must be text.`);
    } else if (namesCompanion(group.title)) {
      issue(
        errors,
        'companion-collection',
        where,
        `${label}: "${group.title}" is a companion package section. Document companions inside library guides.`,
      );
    }

    if (!Array.isArray(group.pages) || group.pages.length === 0) {
      issue(
        errors,
        'nav-shape',
        where,
        `${label}.pages must be a non-empty list.`,
      );

      return;
    }

    for (const pageId of group.pages) {
      if (typeof pageId !== 'string') {
        issue(
          errors,
          'nav-shape',
          where,
          `${label} has a page id that is not text.`,
        );

        continue;
      }

      flat.push(pageId);

      if (listed.has(pageId)) {
        issue(
          errors,
          'nav-duplicate',
          where,
          `${version.id}: "${pageId}" appears in navigation more than once.`,
        );
      }

      listed.set(pageId, true);

      if (!collection.pages.has(pageId)) {
        issue(
          errors,
          'page-missing',
          where,
          `${version.id}: navigation lists "${pageId}" but docs/${version.path}/${pageId}.md does not exist.`,
        );
      }

      const segments = pageId.split('/');

      if (segments.some((segment) => namesCompanion(segment))) {
        issue(
          errors,
          'companion-collection',
          where,
          `${version.id}: page id "${pageId}" names a companion package. Companions are covered inside library guides.`,
        );
      }
    }
  });

  for (const page of collection.pages.values()) {
    if (!listed.has(page.id)) {
      issue(
        errors,
        'nav-orphan',
        page.file,
        `${version.id}: page "${page.id}" is not in navigation.`,
      );
    }
  }

  return flat;
}

function validatePage(page, version, context, errors) {
  const text = readFileSync(page.full, 'utf8');
  const parsed = parseFrontmatter(text);

  if (parsed.error) {
    issue(errors, 'page-frontmatter', page.file, parsed.error);

    return null;
  }

  const { data } = parsed;

  for (const key of Object.keys(data)) {
    if (!FRONTMATTER_KEYS.includes(key)) {
      issue(
        errors,
        'page-frontmatter',
        page.file,
        `Unknown frontmatter key "${key}". Allowed: ${FRONTMATTER_KEYS.join(', ')}.`,
      );
    }
  }

  const title = data.title ?? '';
  const description = data.description ?? '';

  if (title === '' || title.length > 80) {
    issue(
      errors,
      'page-frontmatter',
      page.file,
      'title is required and at most 80 characters.',
    );
  }

  if (description === '' || description.length > 220) {
    issue(
      errors,
      'page-frontmatter',
      page.file,
      'description is required and at most 220 characters.',
    );
  }

  if (!/^\d+$/.test(data.order ?? '')) {
    issue(
      errors,
      'page-frontmatter',
      page.file,
      'order is required and must be an integer.',
    );
  }

  const versionWord = /(^|[^\w.])(v\d+|react layout \d+)(?![\w.])/i;

  if (page.id !== 'migration' && versionWord.test(`${title} ${description}`)) {
    issue(
      errors,
      'title-version',
      page.file,
      "Titles and descriptions must not name the page's own version. The URL already says it.",
    );
  }

  const scan = scanMarkdown(parsed.body);

  for (const problem of scan.problems) {
    issue(
      errors,
      problem.code,
      `${page.file}:${problem.line}`,
      problem.message,
    );
  }

  let lastLevel = 1;

  for (const heading of scan.headings) {
    if (heading.level === 1) {
      issue(
        errors,
        'page-h1',
        `${page.file}:${heading.line}`,
        'The body must not contain a "#" heading. The title comes from frontmatter.',
      );
    } else if (heading.level > lastLevel + 1) {
      issue(
        errors,
        'heading-level',
        `${page.file}:${heading.line}`,
        `Heading "${heading.text}" skips from level ${lastLevel} to ${heading.level}.`,
      );
    }

    lastLevel = Math.max(heading.level, 2);
  }

  for (const fence of scan.fences) {
    const where = `${page.file}:${fence.line}`;

    if (!FENCE_LANGUAGES.includes(fence.language)) {
      issue(
        errors,
        'code-fence-language',
        where,
        `A code fence needs a language from: ${FENCE_LANGUAGES.join(', ')}. Found "${fence.language}".`,
      );
    }

    if (fence.example) {
      checkExample(fence, where, context, errors);
    }
  }

  return {
    order: Number(data.order),
    scan,
  };
}

function checkExample(fence, where, context, errors) {
  const requested = fence.example;
  const root = path.join(context.root, context.examplesDir);
  const resolved = path.resolve(root, requested);

  if (
    requested.includes('..') ||
    path.isAbsolute(requested) ||
    !isInside(root, resolved)
  ) {
    issue(
      errors,
      'example-path',
      where,
      `example="${requested}" must stay inside ${context.examplesDir}.`,
    );

    return;
  }

  if (!existsSync(resolved)) {
    issue(
      errors,
      'example-missing',
      where,
      `The example fixture ${context.examplesDir}/${requested} does not exist.`,
    );

    return;
  }

  const expected = readFileSync(resolved, 'utf8')
    .replace(/\r\n/g, '\n')
    .trimEnd();

  if (fence.content.replace(/\r\n/g, '\n').trimEnd() !== expected) {
    issue(
      errors,
      'example-mismatch',
      where,
      `The code block differs from ${context.examplesDir}/${requested}. Update the page to match the type-checked fixture.`,
    );
  }
}

function resolveLink(link, page, context, errors, options) {
  const where = `${page.file}:${link.line}`;
  const target = link.target;

  if (target === '') {
    issue(errors, 'link-empty', where, 'A link has an empty target.');

    return null;
  }

  if (/^https:\/\//.test(target)) {
    return null;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//')) {
    issue(
      errors,
      'link-scheme',
      where,
      `Link "${target}" is not allowed. Use https:// or a relative page link.`,
    );

    return null;
  }

  if (target.startsWith('/')) {
    issue(
      errors,
      'link-absolute',
      where,
      `Link "${target}" is an absolute path. Use a relative link to a page.`,
    );

    return null;
  }

  const hashIndex = target.indexOf('#');
  const filePart = hashIndex === -1 ? target : target.slice(0, hashIndex);
  const anchor =
    hashIndex === -1 ? null : decodeURIComponent(target.slice(hashIndex + 1));

  if (filePart === '') {
    return {
      full: page.full,
      anchor,
      where,
    };
  }

  const resolved = path.resolve(
    path.dirname(page.full),
    decodeURIComponent(filePart),
  );

  if (!isInside(context.docsRoot, resolved)) {
    issue(
      errors,
      'path-containment',
      where,
      `Link "${target}" resolves outside docs/.`,
    );

    return null;
  }

  if (!existsSync(resolved)) {
    issue(
      errors,
      link.image ? 'image-missing' : 'link-missing-file',
      where,
      `Link "${target}" does not resolve to a file.`,
    );

    return null;
  }

  if (!isInside(realpathSync(context.docsRoot), realpathSync(resolved))) {
    issue(
      errors,
      'path-containment',
      where,
      `Link "${target}" leaves docs/ through a symbolic link.`,
    );

    return null;
  }

  const relative = toPosix(path.relative(context.docsRoot, resolved));
  const top = relative.split('/')[0];

  if (!options.allowExcluded && context.excluded.includes(top)) {
    issue(
      errors,
      'link-excluded',
      where,
      `Link "${target}" points into the excluded "${top}" directory. Public pages cannot link to maintainer pages.`,
    );

    return null;
  }

  if (link.image) {
    const segments = relative.split('/');

    if (
      segments[1] !== 'assets' ||
      !IMAGE_EXTENSIONS.includes(path.extname(relative).toLowerCase())
    ) {
      issue(
        errors,
        'image-asset-location',
        where,
        `Image "${target}" must be an image file under a version's assets/ directory.`,
      );

      return null;
    }

    return null;
  }

  if (!resolved.endsWith('.md')) {
    issue(
      errors,
      'link-not-page',
      where,
      `Link "${target}" must point to a .md page.`,
    );

    return null;
  }

  return {
    full: resolved,
    anchor,
    where,
  };
}

function headingSlugsFor(full, cache) {
  if (!cache.has(full)) {
    const parsed = parseFrontmatter(readFileSync(full, 'utf8'));
    const slugs = new Set(
      scanMarkdown(parsed.body).headings.map((heading) => heading.slug),
    );

    cache.set(full, slugs);
  }

  return cache.get(full);
}

function checkLinks(page, scan, context, errors, options = {}) {
  for (const link of scan.links) {
    const resolved = resolveLink(link, page, context, errors, options);

    if (resolved && resolved.anchor) {
      const slugs = headingSlugsFor(resolved.full, context.slugCache);

      if (!slugs.has(resolved.anchor)) {
        issue(
          errors,
          'link-anchor',
          resolved.where,
          `Anchor "#${resolved.anchor}" does not exist in ${toPosix(path.relative(context.docsRoot, resolved.full))}.`,
        );
      }
    }
  }
}

function checkOrder(version, flat, orders, errors) {
  const seen = new Map();

  for (const pageId of flat) {
    const order = orders.get(pageId);

    if (order === undefined) {
      continue;
    }

    if (seen.has(order)) {
      issue(
        errors,
        'nav-order',
        `docs/${version.path}/${pageId}.md`,
        `${version.id}: order ${order} is already used by "${seen.get(order)}".`,
      );
    }

    seen.set(order, pageId);
  }

  let previous = -Infinity;

  for (const pageId of flat) {
    const order = orders.get(pageId);

    if (order === undefined) {
      continue;
    }

    if (order <= previous) {
      issue(
        errors,
        'nav-order',
        `docs/${version.path}/${pageId}.md`,
        `${version.id}: "${pageId}" has order ${order}, which is not greater than the page before it in navigation.`,
      );
    }

    previous = order;
  }
}

function checkCollectionLayout(docsRoot, manifest, versions, errors) {
  const known = new Set(versions.map((version) => version.path));
  const excluded = new Set(
    Array.isArray(manifest.excluded) ? manifest.excluded : [],
  );
  const stubs = new Set(
    (Array.isArray(manifest.legacyRedirects)
      ? manifest.legacyRedirects
      : []
    ).map((entry) => entry?.from),
  );

  for (const entry of readdirSync(docsRoot, {
    withFileTypes: true,
  })) {
    if (entry.isDirectory()) {
      if (excluded.has(entry.name) || known.has(entry.name)) {
        continue;
      }

      if (VERSION_ID.test(entry.name)) {
        issue(
          errors,
          'version-directory',
          `docs/${entry.name}`,
          `Directory ${entry.name} is not a version in docs.json.`,
        );
      } else {
        issue(
          errors,
          'stray-file',
          `docs/${entry.name}`,
          `Directory "${entry.name}" is not a documented version or an excluded directory.`,
        );
      }

      continue;
    }

    const relative = `docs/${entry.name}`;

    if (
      entry.name === 'docs.json' ||
      entry.name === 'README.md' ||
      stubs.has(relative)
    ) {
      continue;
    }

    issue(
      errors,
      'stray-file',
      relative,
      'This file is not part of the public collection, the manifest or a legacy redirect.',
    );
  }
}

function checkLegacyRedirects(
  manifest,
  versions,
  collections,
  context,
  errors,
) {
  if (!Array.isArray(manifest.legacyRedirects)) {
    return;
  }

  const seen = new Set();
  const pageIds = new Map();

  for (const version of versions) {
    for (const page of collections.get(version.id)?.pages.values() ?? []) {
      pageIds.set(`${version.id}/${page.id}`, page);
    }
  }

  manifest.legacyRedirects.forEach((entry, index) => {
    const label = `legacyRedirects[${index}]`;

    if (!isPlainObject(entry) || typeof entry.from !== 'string') {
      issue(
        errors,
        'legacy-redirect',
        'docs/docs.json',
        `${label} must be an object with "from".`,
      );

      return;
    }

    if (!/^docs\/[a-z0-9-]+\.md$/.test(entry.from)) {
      issue(
        errors,
        'legacy-redirect',
        'docs/docs.json',
        `${label}.from "${entry.from}" must be a root docs/*.md path.`,
      );

      return;
    }

    if (seen.has(entry.from)) {
      issue(
        errors,
        'legacy-redirect',
        'docs/docs.json',
        `${entry.from} is listed more than once.`,
      );
    }

    seen.add(entry.from);

    const hasPublic = typeof entry.to === 'string';
    const hasMaintainer = typeof entry.toMaintainerPage === 'string';

    if (hasPublic === hasMaintainer) {
      issue(
        errors,
        'legacy-redirect',
        'docs/docs.json',
        `${label} needs exactly one of "to" or "toMaintainerPage".`,
      );

      return;
    }

    const stubFull = path.join(context.root, entry.from);
    let targetFull = null;

    if (hasPublic) {
      const targetPage = pageIds.get(entry.to);

      if (!targetPage) {
        issue(
          errors,
          'legacy-target-missing',
          'docs/docs.json',
          `${entry.from} points to "${entry.to}", which is not a public page.`,
        );

        return;
      }

      targetFull = targetPage.full;
    } else {
      targetFull = path.resolve(context.docsRoot, entry.toMaintainerPage);

      if (
        !isInside(context.docsRoot, targetFull) ||
        !context.excluded.includes(entry.toMaintainerPage.split('/')[0]) ||
        !existsSync(targetFull)
      ) {
        issue(
          errors,
          'legacy-target-missing',
          'docs/docs.json',
          `${entry.from} points to "${entry.toMaintainerPage}", which is not an existing page in an excluded directory.`,
        );

        return;
      }
    }

    if (!existsSync(stubFull)) {
      issue(
        errors,
        'legacy-stub-missing',
        entry.from,
        'The old link has no retained page or stub.',
      );

      return;
    }

    const stub = {
      file: entry.from,
      full: stubFull,
    };
    const stubText = readFileSync(stubFull, 'utf8');
    const scan = scanMarkdown(stubText);

    for (const problem of scan.problems) {
      issue(
        errors,
        problem.code,
        `${entry.from}:${problem.line}`,
        problem.message,
      );
    }

    const linksTarget = scan.links.some((link) => {
      const file = link.target.split('#')[0];

      return (
        file !== '' && path.resolve(path.dirname(stubFull), file) === targetFull
      );
    });

    if (!linksTarget) {
      issue(
        errors,
        'legacy-stub-link',
        entry.from,
        `The stub must link to its target ${entry.to ?? entry.toMaintainerPage}.`,
      );
    }

    checkLinks(stub, scan, context, errors, {
      allowExcluded: true,
    });
  });
}

/** Runs every check. `root` is the repository root. */
export function checkDocs({ root, examplesDir = 'tools/docs/examples' } = {}) {
  const errors = [];
  const docsRoot = path.join(root, 'docs');
  const manifestFile = path.join(docsRoot, 'docs.json');
  const stats = {
    versions: 0,
    pages: 0,
    links: 0,
    examples: 0,
  };

  if (!existsSync(docsRoot)) {
    issue(
      errors,
      'manifest-missing',
      'docs',
      'The docs directory does not exist.',
    );

    return {
      errors,
      stats,
    };
  }

  const manifest = readJson(manifestFile, errors);

  if (!manifest || !validateManifest(manifest, 'docs/docs.json', errors)) {
    return {
      errors,
      stats,
    };
  }

  const versions = validateVersions(manifest, 'docs/docs.json', errors);
  const context = {
    root,
    docsRoot,
    examplesDir,
    excluded: Array.isArray(manifest.excluded) ? manifest.excluded : [],
    slugCache: new Map(),
  };
  const collections = new Map();

  stats.versions = versions.length;
  checkCollectionLayout(docsRoot, manifest, versions, errors);

  for (const version of versions) {
    const collection = loadPages(docsRoot, version, errors);

    collections.set(version.id, collection);

    if (!Array.isArray(version.navigation)) {
      continue;
    }

    const flat = checkNavigation(version, collection, errors);
    const orders = new Map();

    for (const page of collection.pages.values()) {
      const checked = validatePage(page, version, context, errors);

      if (!checked) {
        continue;
      }

      stats.pages += 1;
      stats.links += checked.scan.links.length;
      stats.examples += checked.scan.fences.filter(
        (fence) => fence.example,
      ).length;
      orders.set(page.id, checked.order);
      checkLinks(page, checked.scan, context, errors);
    }

    checkOrder(version, flat, orders, errors);
  }

  checkLegacyRedirects(manifest, versions, collections, context, errors);

  return {
    errors,
    stats,
  };
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { errors, stats } = checkDocs({
    root,
  });

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`${error.file}: [${error.code}] ${error.message}`);
    }

    console.error(
      `\nDocs check failed with ${errors.length} problem${errors.length === 1 ? '' : 's'}.`,
    );
    process.exitCode = 1;

    return;
  }

  console.log(
    `Docs check passed: ${stats.versions} versions, ${stats.pages} pages, ${stats.links} links, ${stats.examples} embedded examples.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}

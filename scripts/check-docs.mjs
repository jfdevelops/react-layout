import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  buildDocsNavigation,
  listVersions,
  parseFrontmatter,
} from './docs-manifest.mjs';

export { parseFrontmatter };

/**
 * Validates every public page against the contract in
 * docs/maintainers/content-contract.md. docs.json and meta.json are generated
 * from the same tree, so the checker builds them in memory instead of reading
 * them. It uses Node builtins only.
 */
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
const EXCLUDED = ['maintainers'];
const GENERATED_FILES = ['docs.json', 'meta.json'];
const SEGMENT = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_SEGMENTS = 3;

function issue(errors, code, file, message) {
  errors.push({
    code,
    file,
    message,
  });
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

function collectFiles(directory) {
  const entries = readdirSync(directory, {
    withFileTypes: true,
  });

  return entries.flatMap((entry) => {
    const full = path.join(directory, entry.name);

    return entry.isDirectory() ? collectFiles(full) : [full];
  });
}

function loadPages(version, errors) {
  const versionDir = version.full;
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

    if (
      path.basename(full) === 'meta.json' ||
      (version.generatedReference && isInside(version.generatedReference, full))
    ) {
      continue;
    }

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

/**
 * The current version follows the latest release, so its installs may be
 * unpinned. Older versions pin every package so a reader gets that major.
 */
function checkInstall(specifier, version, where, errors) {
  const pinned = /^@jfdevelops\/[a-z0-9-]+@\d+\.\d+\.\d+$/.test(specifier);
  const unpinned = /^@jfdevelops\/[a-z0-9-]+$/.test(specifier);
  const core = version.package.name;

  if (!pinned && !(unpinned && version.status === 'current')) {
    issue(
      errors,
      'install-version',
      where,
      `Pin ${specifier} to the audited package version so this guide does not install a different major.`,
    );
  }

  const sameRelease =
    version.status === 'current'
      ? specifier.startsWith(`${core}@${version.major}.`)
      : specifier === `${core}@${version.package.endpointVersion}`;

  if (pinned && specifier.startsWith(`${core}@`) && !sameRelease) {
    issue(
      errors,
      'install-version',
      where,
      version.status === 'current'
        ? `Install a ${version.major}.x release of ${core} for this documentation.`
        : `Install ${core}@${version.package.endpointVersion} for this documentation snapshot.`,
    );
  }
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

  if (
    !page.id.endsWith('migration') &&
    versionWord.test(`${title} ${description}`)
  ) {
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

    if (fence.language === 'sh' || fence.language === 'bash') {
      for (const line of fence.content.split('\n')) {
        if (!/^pnpm add\s/.test(line)) {
          continue;
        }

        const packages =
          line.match(/@jfdevelops\/[a-z0-9-]+(?:@[^\s]+)?/g) ?? [];

        for (const specifier of packages) {
          checkInstall(specifier, version, where, errors);
        }
      }
    }

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

  if (
    !existsSync(resolved) &&
    context.generatedReferences.some(
      (directory) => resolved === directory || isInside(directory, resolved),
    )
  ) {
    // The API reference is generated and gitignored; it may not exist yet.
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
    if (
      !/^framework\/[^/]+\/v\d+\/assets\//.test(relative) ||
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

function checkFile(display, full, context, errors) {
  const scan = scanMarkdown(readFileSync(full, 'utf8'));
  const page = {
    file: display,
    full,
  };

  for (const problem of scan.problems) {
    issue(errors, problem.code, `${display}:${problem.line}`, problem.message);
  }

  checkLinks(page, scan, context, errors, {
    allowExcluded: true,
  });

  return scan;
}

/**
 * docs/ holds README.md, framework/, maintainers/ and generated files.
 * framework/<name>/ holds only v<major> directories.
 */
function checkLayout(docsRoot, frameworks, context, errors, stats) {
  for (const entry of readdirSync(docsRoot, {
    withFileTypes: true,
  })) {
    const relative = `docs/${entry.name}`;

    if (entry.isDirectory()) {
      if (entry.name !== 'framework' && !EXCLUDED.includes(entry.name)) {
        issue(
          errors,
          'stray-file',
          relative,
          `Directory "${entry.name}" is not framework/ or an excluded directory.`,
        );
      }

      continue;
    }

    if (GENERATED_FILES.includes(entry.name)) {
      continue;
    }

    if (entry.name !== 'README.md') {
      issue(
        errors,
        'stray-file',
        relative,
        'Only README.md belongs at the docs root. Pages live under framework/.',
      );

      continue;
    }

    const scan = checkFile(
      relative,
      path.join(docsRoot, entry.name),
      context,
      errors,
    );

    stats.links += scan.links.length;
  }

  for (const framework of frameworks) {
    for (const entry of readdirSync(framework.full, {
      withFileTypes: true,
    })) {
      if (entry.isFile() && GENERATED_FILES.includes(entry.name)) {
        continue;
      }

      if (!entry.isDirectory() || !/^v\d+$/.test(entry.name)) {
        issue(
          errors,
          'stray-file',
          `docs/${framework.path}/${entry.name}`,
          'A framework directory holds only v<major> version directories.',
        );
      }
    }
  }
}

function checkOrders(collection, errors) {
  const seen = new Map();

  for (const page of collection.pages.values()) {
    if (!Number.isInteger(page.order)) {
      continue;
    }

    const key = `${path.posix.dirname(page.id)}:${page.order}`;

    if (seen.has(key)) {
      issue(
        errors,
        'nav-order',
        page.file,
        `order ${page.order} is also used by ${seen.get(key)}. Pages in one directory need distinct orders.`,
      );
    } else {
      seen.set(key, page.file);
    }
  }
}

/** Runs every check. `root` is the repository root. */
export function checkDocs({ root, examplesDir = 'tools/docs/examples' } = {}) {
  const errors = [];
  const docsRoot = path.join(root, 'docs');
  const stats = {
    versions: 0,
    pages: 0,
    links: 0,
    examples: 0,
  };

  if (!existsSync(path.join(docsRoot, 'framework'))) {
    issue(
      errors,
      'framework-missing',
      'docs/framework',
      'The docs/framework directory does not exist.',
    );

    return {
      errors,
      stats,
    };
  }

  const { core, frameworks } = listVersions(root);
  const { manifest } = buildDocsNavigation({
    root,
  });
  const context = {
    root,
    docsRoot,
    examplesDir,
    excluded: EXCLUDED,
    generatedReferences: frameworks
      .flatMap((framework) => framework.versions)
      .map((version) => version.generatedReference)
      .filter(Boolean),
    slugCache: new Map(),
  };

  checkLayout(docsRoot, frameworks, context, errors, stats);

  for (const framework of manifest.frameworks) {
    if (!framework.defaultVersion) {
      issue(
        errors,
        'default-version',
        `docs/${framework.path}`,
        `No version directory matches the current package major (v${core.major}).`,
      );
    }
  }

  for (const framework of frameworks) {
    for (const version of framework.versions) {
      const described = {
        ...version,
        package: {
          name: core.name,
          endpointVersion: version.endpointVersion,
        },
      };

      if (!version.endpointVersion) {
        issue(
          errors,
          'version-release',
          `docs/${version.path}`,
          `No ${version.id} release is listed in packages/core/CHANGELOG.md.`,
        );
      }

      stats.versions += 1;

      const collection = loadPages(described, errors);

      for (const page of collection.pages.values()) {
        const checked = validatePage(page, described, context, errors);

        if (!checked) {
          continue;
        }

        page.order = checked.order;
        stats.pages += 1;
        stats.links += checked.scan.links.length;
        stats.examples += checked.scan.fences.filter(
          (fence) => fence.example,
        ).length;
        checkLinks(page, checked.scan, context, errors);
      }

      checkOrders(collection, errors);
    }
  }

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
      `
Docs check failed with ${errors.length} problem${errors.length === 1 ? '' : 's'}.`,
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

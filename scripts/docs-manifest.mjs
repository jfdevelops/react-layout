import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

/**
 * Builds docs/docs.json and every meta.json from the docs tree. Both are
 * generated and gitignored; page frontmatter is the source of truth.
 */
export const MANIFEST_SCHEMA_VERSION = 2;
export const LIBRARY_NAME = 'React Layout';
export const FRAMEWORK_TITLES = {
  react: 'React',
};
export const VERSION_ID = /^v(\d+)$/;
export const GENERATED_REFERENCE = 'reference';

const CORE_PACKAGE = 'packages/core';

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

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function titleFromName(name) {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Highest released version of each major, read from the core changelog. */
export function readReleasedVersions(root) {
  const changelog = path.join(root, CORE_PACKAGE, 'CHANGELOG.md');
  const latest = new Map();

  if (!existsSync(changelog)) {
    return latest;
  }

  for (const match of readFileSync(changelog, 'utf8').matchAll(
    /^## (\d+)\.(\d+)\.(\d+)\s*$/gm,
  )) {
    const parts = match.slice(1, 4).map(Number);
    const major = parts[0];
    const known = latest.get(major);

    if (
      !known ||
      parts[1] > known.parts[1] ||
      (parts[1] === known.parts[1] && parts[2] > known.parts[2])
    ) {
      latest.set(major, {
        parts,
        version: parts.join('.'),
      });
    }
  }

  return new Map([...latest].map(([major, entry]) => [major, entry.version]));
}

export function versionStatus(major, currentMajor) {
  if (major === currentMajor) {
    return 'current';
  }

  if (major > currentMajor) {
    return 'next';
  }

  return major === 0 ? 'legacy' : 'previous';
}

function readPage(full) {
  const parsed = parseFrontmatter(readFileSync(full, 'utf8'));
  const order = Number(parsed.data?.order);

  return {
    title: parsed.data?.title ?? null,
    order: Number.isInteger(order) ? order : Number.POSITIVE_INFINITY,
  };
}

/**
 * Walks one directory of a version. Pages come first by frontmatter `order`
 * (then name); subdirectories follow by name.
 */
function buildDirectory(directory, base, context) {
  const relative = toPosix(path.relative(base, directory));
  const entries = readdirSync(directory, {
    withFileTypes: true,
  });
  const pages = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => {
      const name = entry.name.slice(0, -3);
      const page = readPage(path.join(directory, entry.name));

      return {
        name,
        page: relative === '' ? name : `${relative}/${name}`,
        title: page.title ?? titleFromName(name),
        order: page.order,
      };
    })
    .sort(
      (left, right) =>
        left.order - right.order || left.name.localeCompare(right.name, 'en'),
    );
  const directories = entries
    .filter((entry) => entry.isDirectory() && entry.name !== 'assets')
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'));
  const navigation = pages.map(({ page, title }) => ({
    page,
    title,
  }));

  for (const name of directories) {
    const full = path.join(directory, name);
    const isGenerated = context.generatedReference === full;
    const child = {
      title: titleFromName(name),
      path: relative === '' ? name : `${relative}/${name}`,
    };

    if (isGenerated) {
      child.generated = true;
    } else {
      child.pages = buildDirectory(full, base, context);
    }

    navigation.push(child);
  }

  if (!context.skipMeta.has(directory)) {
    context.metaFiles.set(toPosix(path.join(directory, 'meta.json')), {
      ...(relative === ''
        ? {
            title: context.title,
          }
        : {
            title: titleFromName(path.basename(directory)),
          }),
      pages: [...pages.map(({ name }) => name), ...directories],
    });
  }

  return navigation;
}

export function readCorePackage(root) {
  const manifest = JSON.parse(
    readFileSync(path.join(root, CORE_PACKAGE, 'package.json'), 'utf8'),
  );
  const repository =
    typeof manifest.repository === 'string'
      ? manifest.repository
      : manifest.repository?.url;

  return {
    name: manifest.name,
    version: manifest.version,
    major: Number(manifest.version.split('.')[0]),
    repository: repository?.replace(/^git\+/, '').replace(/\.git$/, ''),
  };
}

/** Lists every framework and version directory with its derived facts. */
export function listVersions(root) {
  const docsRoot = path.join(root, 'docs');
  const frameworkRoot = path.join(docsRoot, 'framework');
  const core = readCorePackage(root);
  const released = readReleasedVersions(root);
  const frameworks = [];

  if (!existsSync(frameworkRoot)) {
    return {
      core,
      frameworks,
    };
  }

  for (const entry of readdirSync(frameworkRoot, {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const directory = path.join(frameworkRoot, entry.name);
    const versions = readdirSync(directory, {
      withFileTypes: true,
    })
      .filter((child) => child.isDirectory() && VERSION_ID.test(child.name))
      .map((child) => {
        const major = Number(VERSION_ID.exec(child.name)[1]);
        const full = path.join(directory, child.name);

        return {
          id: child.name,
          major,
          status: versionStatus(major, core.major),
          path: toPosix(path.relative(docsRoot, full)),
          full,
          endpointVersion:
            major === core.major ? core.version : (released.get(major) ?? null),
          generatedReference:
            major === core.major ? path.join(full, GENERATED_REFERENCE) : null,
        };
      })
      .sort((left, right) => right.major - left.major);

    frameworks.push({
      id: entry.name,
      title: FRAMEWORK_TITLES[entry.name] ?? titleFromName(entry.name),
      path: toPosix(path.relative(docsRoot, directory)),
      full: directory,
      versions,
    });
  }

  frameworks.sort((left, right) => left.id.localeCompare(right.id, 'en'));

  return {
    core,
    frameworks,
  };
}

/** Builds docs.json and the meta.json files in memory. */
export function buildDocsNavigation({ root }) {
  const docsRoot = path.join(root, 'docs');
  const { core, frameworks } = listVersions(root);
  const metaFiles = new Map();

  metaFiles.set(toPosix(path.join(docsRoot, 'meta.json')), {
    pages: ['framework'],
  });
  metaFiles.set(toPosix(path.join(docsRoot, 'framework', 'meta.json')), {
    title: 'Frameworks',
    pages: frameworks.map((framework) => framework.id),
  });

  const manifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    generatedBy: 'pnpm generate-docs',
    library: {
      id: core.name.split('/').pop(),
      name: LIBRARY_NAME,
      npmPackage: core.name,
      repository: core.repository,
    },
    frameworks: frameworks.map((framework) => {
      metaFiles.set(toPosix(path.join(framework.full, 'meta.json')), {
        title: framework.title,
        pages: framework.versions.map((version) => version.id),
      });

      const current =
        framework.versions.find((version) => version.status === 'current') ??
        framework.versions.find((version) => version.status !== 'next');

      return {
        id: framework.id,
        title: framework.title,
        path: framework.path,
        defaultVersion: current?.id ?? null,
        versions: framework.versions.map((version) => ({
          id: version.id,
          label: version.id,
          major: version.major,
          status: version.status,
          path: version.path,
          package: {
            name: core.name,
            endpointVersion: version.endpointVersion,
          },
          navigation: buildDirectory(version.full, version.full, {
            title: version.id,
            metaFiles,
            generatedReference: version.generatedReference,
            skipMeta: new Set(
              version.generatedReference ? [version.generatedReference] : [],
            ),
          }),
        })),
      };
    }),
  };

  return {
    manifest,
    metaFiles,
  };
}

/** Writes docs.json and every meta.json. */
export function writeDocsNavigation({ root }) {
  const { manifest, metaFiles } = buildDocsNavigation({
    root,
  });

  writeFileSync(
    path.join(root, 'docs', 'docs.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  for (const [file, content] of metaFiles) {
    mkdirSync(path.dirname(file), {
      recursive: true,
    });
    writeFileSync(file, `${JSON.stringify(content, null, 2)}\n`);
  }

  return {
    manifest,
    metaFiles,
  };
}

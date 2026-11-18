import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  COMPANION_NAMES,
  EXAMPLE_VERIFICATIONS,
  SCHEMA_VERSION,
  VERSION_STATUSES,
  checkDocs,
  parseFrontmatter,
  scanMarkdown,
  slugifyHeading,
} from './check-docs.mjs';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const COMMIT = 'a'.repeat(40);

function page(title, order, body = '') {
  return `---\ntitle: ${title}\ndescription: A short description of ${title}.\norder: ${order}\n---\n\n${body}\n`;
}

function baseManifest() {
  return {
    schemaVersion: 1,
    library: {
      id: 'react-layout',
      name: 'React Layout',
      npmPackage: '@jfdevelops/react-layout',
      repository: 'https://github.com/jfdevelops/react-layout',
    },
    defaultVersion: 'v2',
    docsBaseCommit: COMMIT,
    auditedOn: '2026-11-17',
    excluded: ['maintainers'],
    legacyRedirects: [
      {
        from: 'docs/old-guide.md',
        to: 'v2/guides/topic',
      },
    ],
    versions: [
      version('v2', 2, 'current', [
        {
          title: 'Start',
          pages: ['index', 'guides/topic'],
        },
      ]),
      version('v1', 1, 'previous', [
        {
          title: 'Start',
          pages: ['index'],
        },
      ]),
    ],
  };
}

function version(id, major, status, navigation) {
  return {
    id,
    label: id,
    major,
    status,
    path: id,
    package: {
      name: '@jfdevelops/react-layout',
      publishedVersions: 3,
      firstVersion: `${major}.0.0`,
      endpointVersion: `${major}.1.0`,
    },
    source: {
      kind: 'release-tag',
      repository: 'https://github.com/jfdevelops/react-layout',
      tag: `@jfdevelops/react-layout@${major}.1.0`,
      commit: COMMIT,
      publishedAt: '2026-11-17T21:46:19Z',
      provenance: 'npm SLSA provenance commit equals the tag commit',
      firstRelease: {
        version: `${major}.0.0`,
        tag: `@jfdevelops/react-layout@${major}.0.0`,
        commit: COMMIT,
      },
    },
    examples: {
      verification: 'adapted-from-source',
      fixtures: null,
      command: null,
    },
    navigation,
  };
}

/**
 * Builds a small valid docs tree in a temporary directory and lets a test
 * change it before the checker runs.
 */
function withDocs(change, run) {
  const root = mkdtempSync(path.join(tmpdir(), 'check-docs-'));
  const docs = path.join(root, 'docs');
  const manifest = baseManifest();
  const files = {
    'docs/v2/index.md': page(
      'Overview',
      10,
      '## Start\n\nSee [the topic](./guides/topic.md#details).',
    ),
    'docs/v2/guides/topic.md': page(
      'Topic',
      20,
      '## Details\n\nBack to the [overview](../index.md).',
    ),
    'docs/v1/index.md': page('Overview', 10, '## Start\n\nHello.'),
    'docs/old-guide.md':
      '# Old guide\n\nMoved to [the topic](./v2/guides/topic.md).\n',
    'docs/maintainers/notes.md': '# Notes\n',
  };
  const context = {
    root,
    manifest,
    files,
    write(relative, text) {
      files[relative] = text;
    },
    remove(relative) {
      delete files[relative];
    },
  };

  try {
    change?.(context);
    mkdirSync(docs, {
      recursive: true,
    });
    writeFileSync(
      path.join(docs, 'docs.json'),
      context.rawManifest ?? JSON.stringify(manifest, null, 2),
    );

    for (const [relative, text] of Object.entries(files)) {
      const full = path.join(root, relative);

      mkdirSync(path.dirname(full), {
        recursive: true,
      });
      writeFileSync(full, text);
    }

    return run(
      root,
      checkDocs({
        root,
      }),
    );
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
}

function codes(result) {
  return result.errors.map((error) => error.code);
}

function assertFails(change, code) {
  withDocs(change, (_root, result) => {
    assert.ok(
      codes(result).includes(code),
      `Expected ${code}, got ${JSON.stringify(result.errors, null, 2)}`,
    );
  });
}

test('accepts a minimal valid docs tree', () => {
  withDocs(undefined, (_root, result) => {
    assert.deepEqual(result.errors, []);
    assert.equal(result.stats.versions, 2);
    assert.equal(result.stats.pages, 3);
  });
});

test('the repository docs satisfy the contract', () => {
  const result = checkDocs({
    root: repositoryRoot,
  });

  assert.deepEqual(result.errors, []);
  assert.ok(result.stats.pages > 0);
  assert.ok(result.stats.examples > 0);
});

test('the manifest schema file agrees with the checker constants', () => {
  const schema = JSON.parse(
    readFileSync(
      path.join(repositoryRoot, 'docs/maintainers/docs.schema.json'),
      'utf8',
    ),
  );
  const version = schema.$defs.version.properties;

  assert.equal(schema.properties.schemaVersion.const, SCHEMA_VERSION);
  assert.deepEqual(version.status.enum, VERSION_STATUSES);
  assert.deepEqual(
    version.examples.properties.verification.enum,
    EXAMPLE_VERIFICATIONS,
  );
});

test('rejects a manifest that is not valid JSON', () => {
  assertFails((context) => {
    context.rawManifest = '{ "schemaVersion": 1,';
  }, 'manifest-invalid-json');
});

test('rejects a missing manifest', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'check-docs-'));

  try {
    mkdirSync(path.join(root, 'docs'));

    const result = checkDocs({
      root,
    });

    assert.deepEqual(codes(result), ['manifest-missing']);
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});

test('rejects an unknown schema version', () => {
  assertFails((context) => {
    context.manifest.schemaVersion = 2;
  }, 'schema-version');
});

test('rejects a manifest with an unknown or missing key', () => {
  assertFails((context) => {
    context.manifest.extra = true;
  }, 'manifest-shape');
  assertFails((context) => {
    delete context.manifest.versions[0].source;
  }, 'manifest-shape');
});

test('requires one library named react-layout', () => {
  assertFails((context) => {
    context.manifest.library.id = 'adapter-zod';
  }, 'library-identity');
  assertFails((context) => {
    context.manifest.library = [
      context.manifest.library,
      context.manifest.library,
    ];
  }, 'library-identity');
  assertFails((context) => {
    context.manifest.versions[0].package.name =
      '@jfdevelops/react-layout-adapter-zod';
  }, 'library-identity');
});

test('rejects companion package collections in the manifest', () => {
  assertFails((context) => {
    context.manifest.packages = [];
  }, 'companion-collection');
});

test('rejects companion package sections and pages in navigation', () => {
  assertFails((context) => {
    context.manifest.versions[0].navigation.push({
      title: 'Devtools',
      pages: ['guides/devtools-react'],
    });
    context.write('docs/v2/guides/devtools-react.md', page('Inspector', 30));
  }, 'companion-collection');
  assertFails((context) => {
    context.manifest.versions[0].navigation[0].pages.push('adapter-zod');
    context.write('docs/v2/adapter-zod.md', page('Adapter', 30));
  }, 'companion-collection');
});

test('requires a current default version', () => {
  assertFails((context) => {
    context.manifest.defaultVersion = 'v9';
  }, 'default-version');
  assertFails((context) => {
    context.manifest.defaultVersion = 'v1';
  }, 'default-version');
  assertFails((context) => {
    context.manifest.versions[1].status = 'current';
  }, 'default-version');
});

test('rejects unknown version statuses, ids and ordering', () => {
  assertFails((context) => {
    context.manifest.versions[1].status = 'maintained';
  }, 'version-status');
  assertFails((context) => {
    context.manifest.versions[1].id = 'two';
  }, 'version-id');
  assertFails((context) => {
    context.manifest.versions.push(context.manifest.versions[0]);
  }, 'version-id');
  assertFails((context) => {
    context.manifest.versions.reverse();
    context.manifest.defaultVersion = 'v2';
  }, 'version-order');
});

test('rejects a version path that is not its id', () => {
  assertFails((context) => {
    context.manifest.versions[0].path = '../secrets';
  }, 'path-containment');
});

test('validates source provenance', () => {
  assertFails((context) => {
    context.manifest.versions[0].source.commit = 'abc123';
  }, 'source-provenance');
  assertFails((context) => {
    context.manifest.versions[0].source.tag = '@jfdevelops/react-layout@9.9.9';
  }, 'source-provenance');
  assertFails((context) => {
    context.manifest.versions[0].source.publishedAt = 'yesterday';
  }, 'source-provenance');
});

test('does not let adapted examples claim a type check', () => {
  assertFails((context) => {
    context.manifest.versions[0].examples.fixtures = 'tools/docs/examples/v2';
  }, 'manifest-shape');
});

test('rejects a navigation entry whose page file is missing', () => {
  assertFails((context) => {
    context.remove('docs/v2/guides/topic.md');
  }, 'page-missing');
});

test('rejects pages that are not in navigation', () => {
  assertFails((context) => {
    context.write('docs/v2/guides/extra.md', page('Extra', 30));
  }, 'nav-orphan');
});

test('rejects a page listed twice', () => {
  assertFails((context) => {
    context.manifest.versions[0].navigation[0].pages.push('index');
  }, 'nav-duplicate');
});

test('requires frontmatter order to follow navigation order', () => {
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      page('Topic', 5, '## Details\n\nText.'),
    );
  }, 'nav-order');
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      page('Topic', 10, '## Details\n\nText.'),
    );
  }, 'nav-order');
});

test('requires complete frontmatter and rejects unknown keys', () => {
  assertFails((context) => {
    context.write('docs/v2/guides/topic.md', '## Details\n\nNo frontmatter.\n');
  }, 'page-frontmatter');
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      '---\ntitle: Topic\norder: 20\n---\n\n## Details\n',
    );
  }, 'page-frontmatter');
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      '---\ntitle: Topic\ndescription: Fine.\norder: 20\nauthor: me\n---\n\n## Details\n',
    );
  }, 'page-frontmatter');
});

test("rejects titles that name the page's own version", () => {
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      page('Troubleshooting for React Layout 2', 20, '## Details\n\nText.'),
    );
  }, 'title-version');
});

test('rejects invalid page slugs', () => {
  assertFails((context) => {
    context.manifest.versions[0].navigation[0].pages.push('guides/Bad_Name');
    context.write('docs/v2/guides/Bad_Name.md', page('Bad', 30));
  }, 'page-slug');
});

test('rejects files that are not pages or assets', () => {
  assertFails((context) => {
    context.write('docs/v2/notes.txt', 'text');
  }, 'unsupported-file');
});

test('rejects a broken relative link', () => {
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      page('Topic', 20, '## Details\n\n[gone](./missing.md)'),
    );
  }, 'link-missing-file');
});

test('rejects a link anchor that does not exist', () => {
  assertFails((context) => {
    context.write(
      'docs/v2/index.md',
      page('Overview', 10, '## Start\n\n[x](./guides/topic.md#nope)'),
    );
  }, 'link-anchor');
  assertFails((context) => {
    context.write(
      'docs/v2/index.md',
      page('Overview', 10, '## Start\n\n[x](#nope)'),
    );
  }, 'link-anchor');
});

test('accepts anchors, including repeated headings', () => {
  withDocs(
    (context) => {
      context.write(
        'docs/v2/index.md',
        page(
          'Overview',
          10,
          '## Start\n\n## Start\n\n[a](#start) [b](#start-1)',
        ),
      );
    },
    (_root, result) => {
      assert.deepEqual(result.errors, []);
    },
  );
});

test('rejects path traversal out of the docs directory', () => {
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      page('Topic', 20, '## Details\n\n[secret](../../../outside.md)'),
    );
  }, 'path-containment');
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      page('Topic', 20, '## Details\n\n[manifest](../../../package.json)'),
    );
  }, 'path-containment');
});

test('rejects a link that leaves docs through a symbolic link', () => {
  const outside = mkdtempSync(path.join(tmpdir(), 'check-docs-outside-'));

  try {
    writeFileSync(path.join(outside, 'target.md'), '# Outside\n');
    withDocs(
      (context) => {
        context.write(
          'docs/v2/guides/topic.md',
          page('Topic', 20, '## Details\n\n[x](../linked/target.md)'),
        );
      },
      (root) => {
        symlinkSync(
          outside,
          path.join(root, 'docs', 'v2', 'linked'),
          'junction',
        );

        const result = checkDocs({
          root,
        });

        assert.ok(codes(result).includes('path-containment'));
      },
    );
  } finally {
    rmSync(outside, {
      recursive: true,
      force: true,
    });
  }
});

test('rejects absolute and unsafe link schemes', () => {
  for (const [target, code] of [
    ['/docs/react-layout/v2', 'link-absolute'],
    ['http://example.com', 'link-scheme'],
    ['mailto:a@example.com', 'link-scheme'],
    ['javascript:alert(1)', 'link-scheme'],
  ]) {
    assertFails((context) => {
      context.write(
        'docs/v2/guides/topic.md',
        page('Topic', 20, `## Details\n\n[x](${target})`),
      );
    }, code);
  }
});

test('rejects links from public pages into excluded directories', () => {
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      page('Topic', 20, '## Details\n\n[x](../../maintainers/notes.md)'),
    );
  }, 'link-excluded');
});

test('rejects links to non-page files and missing images', () => {
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      page('Topic', 20, '## Details\n\n![chart](../assets/chart.svg)'),
    );
  }, 'image-missing');
  assertFails((context) => {
    context.write('docs/v2/assets/data.json', '{}');
    context.write(
      'docs/v2/guides/topic.md',
      page('Topic', 20, '## Details\n\n[x](../assets/data.json)'),
    );
  }, 'unsupported-file');
});

test('accepts an image stored under the version assets directory', () => {
  withDocs(
    (context) => {
      context.write(
        'docs/v2/assets/chart.svg',
        '<svg xmlns="http://www.w3.org/2000/svg"/>',
      );
      context.write(
        'docs/v2/guides/topic.md',
        page('Topic', 20, '## Details\n\n![chart](../assets/chart.svg)'),
      );
    },
    (_root, result) => {
      assert.deepEqual(result.errors, []);
    },
  );
});

test('rejects unsupported Markdown', () => {
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      page('Topic', 20, '## Details\n\n<div>html</div>'),
    );
  }, 'page-html');
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      page('Topic', 20, '## Details\n\n<!-- hidden -->'),
    );
  }, 'page-html');
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      page('Topic', 20, '# Details\n\nText.'),
    );
  }, 'page-h1');
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      page('Topic', 20, '## Details\n\n#### Deep\n\nText.'),
    );
  }, 'heading-level');
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      page('Topic', 20, '## Details\n\n[ref]: https://example.com'),
    );
  }, 'link-reference-style');
});

test('ignores HTML-like text inside code', () => {
  withDocs(
    (context) => {
      context.write(
        'docs/v2/guides/topic.md',
        page(
          'Topic',
          20,
          '## Details\n\nUse `Array<string>`.\n\n```tsx\nconst a = <div />;\n```',
        ),
      );
    },
    (_root, result) => {
      assert.deepEqual(result.errors, []);
    },
  );
});

test('requires a language on code fences and closed fences', () => {
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      page('Topic', 20, '## Details\n\n```\ncode\n```'),
    );
  }, 'code-fence-language');
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      page('Topic', 20, '## Details\n\n```ts\ncode'),
    );
  }, 'code-fence-unclosed');
});

test('keeps embedded examples in sync with their fixtures', () => {
  const block = (code) =>
    `## Details\n\n\`\`\`ts example=v2/sample.ts\n${code}\n\`\`\``;

  withDocs(
    (context) => {
      context.write(
        'tools/docs/examples/v2/sample.ts',
        'export const a = 1;\n',
      );
      context.write(
        'docs/v2/guides/topic.md',
        page('Topic', 20, block('export const a = 1;')),
      );
    },
    (_root, result) => {
      assert.deepEqual(result.errors, []);
      assert.equal(result.stats.examples, 1);
    },
  );
  assertFails((context) => {
    context.write('tools/docs/examples/v2/sample.ts', 'export const a = 1;\n');
    context.write(
      'docs/v2/guides/topic.md',
      page('Topic', 20, block('export const a = 2;')),
    );
  }, 'example-mismatch');
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      page('Topic', 20, block('export const a = 1;')),
    );
  }, 'example-missing');
  assertFails((context) => {
    context.write(
      'docs/v2/guides/topic.md',
      page(
        'Topic',
        20,
        '## Details\n\n```ts example=../../package.json\n{}\n```',
      ),
    );
  }, 'example-path');
});

test('requires every legacy link to keep a stub that points at its target', () => {
  assertFails((context) => {
    context.remove('docs/old-guide.md');
  }, 'legacy-stub-missing');
  assertFails((context) => {
    context.write('docs/old-guide.md', '# Old guide\n\nNo link here.\n');
  }, 'legacy-stub-link');
  assertFails((context) => {
    context.manifest.legacyRedirects[0].to = 'v2/guides/gone';
  }, 'legacy-target-missing');
  assertFails((context) => {
    context.manifest.legacyRedirects.push({
      from: 'docs/old-guide.md',
      to: 'v2/index',
    });
  }, 'legacy-redirect');
});

test('allows a legacy stub to point at a maintainer page', () => {
  withDocs(
    (context) => {
      context.manifest.legacyRedirects.push({
        from: 'docs/design.md',
        toMaintainerPage: 'maintainers/notes.md',
      });
      context.write(
        'docs/design.md',
        '# Design\n\nSee [notes](./maintainers/notes.md).\n',
      );
    },
    (_root, result) => {
      assert.deepEqual(result.errors, []);
    },
  );
});

test('rejects stray files and undeclared version directories', () => {
  assertFails((context) => {
    context.write('docs/stray.md', '# Stray\n');
  }, 'stray-file');
  assertFails((context) => {
    context.write('docs/v9/index.md', page('Overview', 10));
  }, 'version-directory');
});

test('slugifyHeading follows GitHub heading rules', () => {
  assert.equal(slugifyHeading('Props and validation'), 'props-and-validation');
  assert.equal(
    slugifyHeading("'component' does not exist"),
    'component-does-not-exist',
  );
  assert.equal(slugifyHeading('Tabs & Panels (new)'), 'tabs--panels-new');
});

test('scanMarkdown reports headings, links and fences outside code only', () => {
  const scan = scanMarkdown(
    [
      '## One',
      '',
      '[a](./a.md#x) and `[b](./b.md)`',
      '',
      '```ts',
      '[c](./c.md)',
      '## Not a heading',
      '```',
    ].join('\n'),
  );

  assert.deepEqual(
    scan.headings.map((heading) => heading.slug),
    ['one'],
  );
  assert.deepEqual(
    scan.links.map((link) => link.target),
    ['./a.md#x'],
  );
  assert.equal(scan.fences.length, 1);
});

test('parseFrontmatter reads scalar values and reports malformed blocks', () => {
  assert.deepEqual(
    parseFrontmatter('---\ntitle: "Hello: world"\norder: 3\n---\nBody').data,
    {
      title: 'Hello: world',
      order: '3',
    },
  );
  assert.ok(parseFrontmatter('no block').error);
  assert.ok(parseFrontmatter('---\ntitle: x\n').error);
});

test('companion package names are reserved', () => {
  assert.ok(COMPANION_NAMES.includes('devtools-react'));
  assert.ok(COMPANION_NAMES.includes('adapter-zod'));
  assert.ok(COMPANION_NAMES.includes('composable-navigation'));
});

test('rejects installs that follow latest or target another snapshot', () => {
  for (const specifier of [
    '@jfdevelops/react-layout',
    '@jfdevelops/react-layout@1.1.0',
    '@jfdevelops/react-layout-adapter-zod',
  ]) {
    assertFails((context) => {
      context.write(
        'docs/v2/guides/topic.md',
        page(
          'Topic',
          20,
          `## Details\n\n\`\`\`sh\npnpm add ${specifier}\n\`\`\``,
        ),
      );
    }, 'install-version');
  }
});

test('accepts explicitly pinned core and companion installs', () => {
  withDocs(
    (context) => {
      context.write(
        'docs/v2/guides/topic.md',
        page(
          'Topic',
          20,
          '## Details\n\n```sh\npnpm add @jfdevelops/react-layout@2.1.0 @jfdevelops/react-layout-adapter-zod@0.1.0 zod\n```',
        ),
      );
    },
    (_root, result) => {
      assert.deepEqual(result.errors, []);
    },
  );
});

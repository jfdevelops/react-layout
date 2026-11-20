import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  checkDocs,
  parseFrontmatter,
  scanMarkdown,
  slugifyHeading,
} from './check-docs.mjs';
import {
  buildDocsNavigation,
  readReleasedVersions,
  versionStatus,
} from './docs-manifest.mjs';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const V2 = 'docs/framework/react/v2';
const V1 = 'docs/framework/react/v1';

function page(title, order, body = '') {
  return `---\ntitle: ${title}\ndescription: A short description of ${title}.\norder: ${order}\n---\n\n${body}\n`;
}

/**
 * Builds a small valid docs tree in a temporary directory and lets a test
 * change it before the checker runs. The core package is 2.1.0, so v2 is
 * current and v1 is previous.
 */
function withDocs(change, run) {
  const root = mkdtempSync(path.join(tmpdir(), 'check-docs-'));
  const files = {
    'packages/core/package.json': JSON.stringify({
      name: '@jfdevelops/react-layout',
      version: '2.1.0',
      repository: {
        type: 'git',
        url: 'https://github.com/jfdevelops/react-layout.git',
      },
    }),
    'packages/core/CHANGELOG.md':
      '# @jfdevelops/react-layout\n\n## 2.1.0\n\n## 2.0.0\n\n## 1.1.0\n\n## 1.0.3\n\n## 1.0.0\n',
    [`${V2}/overview.md`]: page(
      'Overview',
      10,
      '## Start\n\nSee [the topic](./guides/topic.md#details).',
    ),
    [`${V2}/guides/topic.md`]: page(
      'Topic',
      20,
      '## Details\n\nBack to the [overview](../overview.md).',
    ),
    [`${V1}/index.md`]: page('Overview', 10, '## Start\n\nHello.'),
    'docs/old-guide.md':
      '# Old guide\n\nMoved to [the topic](./framework/react/v2/guides/topic.md).\n',
    'docs/maintainers/notes.md': '# Notes\n',
  };
  const context = {
    root,
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
});

test('requires complete frontmatter and rejects unknown keys', () => {
  assertFails((context) => {
    context.write(`${V2}/guides/topic.md`, '## Details\n\nNo frontmatter.\n');
  }, 'page-frontmatter');
  assertFails((context) => {
    context.write(
      `${V2}/guides/topic.md`,
      '---\ntitle: Topic\norder: 20\n---\n\n## Details\n',
    );
  }, 'page-frontmatter');
  assertFails((context) => {
    context.write(
      `${V2}/guides/topic.md`,
      '---\ntitle: Topic\ndescription: Fine.\norder: 20\nauthor: me\n---\n\n## Details\n',
    );
  }, 'page-frontmatter');
});

test("rejects titles that name the page's own version", () => {
  assertFails((context) => {
    context.write(
      `${V2}/guides/topic.md`,
      page('Troubleshooting for React Layout 2', 20, '## Details\n\nText.'),
    );
  }, 'title-version');
});

test('rejects invalid page slugs', () => {
  assertFails((context) => {
    context.write(`${V2}/guides/Bad_Name.md`, page('Bad', 30));
  }, 'page-slug');
});

test('rejects files that are not pages or assets', () => {
  assertFails((context) => {
    context.write(`${V2}/notes.txt`, 'text');
  }, 'unsupported-file');
});

test('rejects a broken relative link', () => {
  assertFails((context) => {
    context.write(
      `${V2}/guides/topic.md`,
      page('Topic', 20, '## Details\n\n[gone](./missing.md)'),
    );
  }, 'link-missing-file');
});

test('rejects a link anchor that does not exist', () => {
  assertFails((context) => {
    context.write(
      `${V2}/overview.md`,
      page('Overview', 10, '## Start\n\n[x](./guides/topic.md#nope)'),
    );
  }, 'link-anchor');
  assertFails((context) => {
    context.write(
      `${V2}/overview.md`,
      page('Overview', 10, '## Start\n\n[x](#nope)'),
    );
  }, 'link-anchor');
});

test('accepts anchors, including repeated headings', () => {
  withDocs(
    (context) => {
      context.write(
        `${V2}/overview.md`,
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
      `${V2}/guides/topic.md`,
      page('Topic', 20, '## Details\n\n[secret](../../../../../outside.md)'),
    );
  }, 'path-containment');
  assertFails((context) => {
    context.write(
      `${V2}/guides/topic.md`,
      page(
        'Topic',
        20,
        '## Details\n\n[manifest](../../../../../package.json)',
      ),
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
          `${V2}/guides/topic.md`,
          page('Topic', 20, '## Details\n\n[x](../linked/target.md)'),
        );
      },
      (root) => {
        symlinkSync(outside, path.join(root, V2, 'linked'), 'junction');

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
        `${V2}/guides/topic.md`,
        page('Topic', 20, `## Details\n\n[x](${target})`),
      );
    }, code);
  }
});

test('rejects links from public pages into excluded directories', () => {
  assertFails((context) => {
    context.write(
      `${V2}/guides/topic.md`,
      page('Topic', 20, '## Details\n\n[x](../../../../maintainers/notes.md)'),
    );
  }, 'link-excluded');
});

test('rejects links to non-page files and missing images', () => {
  assertFails((context) => {
    context.write(
      `${V2}/guides/topic.md`,
      page('Topic', 20, '## Details\n\n![chart](../assets/chart.svg)'),
    );
  }, 'image-missing');
  assertFails((context) => {
    context.write(`${V2}/assets/data.json`, '{}');
    context.write(
      `${V2}/guides/topic.md`,
      page('Topic', 20, '## Details\n\n[x](../assets/data.json)'),
    );
  }, 'unsupported-file');
});

test('accepts an image stored under the version assets directory', () => {
  withDocs(
    (context) => {
      context.write(
        `${V2}/assets/chart.svg`,
        '<svg xmlns="http://www.w3.org/2000/svg"/>',
      );
      context.write(
        `${V2}/guides/topic.md`,
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
      `${V2}/guides/topic.md`,
      page('Topic', 20, '## Details\n\n<div>html</div>'),
    );
  }, 'page-html');
  assertFails((context) => {
    context.write(
      `${V2}/guides/topic.md`,
      page('Topic', 20, '## Details\n\n<!-- hidden -->'),
    );
  }, 'page-html');
  assertFails((context) => {
    context.write(
      `${V2}/guides/topic.md`,
      page('Topic', 20, '# Details\n\nText.'),
    );
  }, 'page-h1');
  assertFails((context) => {
    context.write(
      `${V2}/guides/topic.md`,
      page('Topic', 20, '## Details\n\n#### Deep\n\nText.'),
    );
  }, 'heading-level');
  assertFails((context) => {
    context.write(
      `${V2}/guides/topic.md`,
      page('Topic', 20, '## Details\n\n[ref]: https://example.com'),
    );
  }, 'link-reference-style');
});

test('ignores HTML-like text inside code', () => {
  withDocs(
    (context) => {
      context.write(
        `${V2}/guides/topic.md`,
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
      `${V2}/guides/topic.md`,
      page('Topic', 20, '## Details\n\n```\ncode\n```'),
    );
  }, 'code-fence-language');
  assertFails((context) => {
    context.write(
      `${V2}/guides/topic.md`,
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
        `${V2}/guides/topic.md`,
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
      `${V2}/guides/topic.md`,
      page('Topic', 20, block('export const a = 2;')),
    );
  }, 'example-mismatch');
  assertFails((context) => {
    context.write(
      `${V2}/guides/topic.md`,
      page('Topic', 20, block('export const a = 1;')),
    );
  }, 'example-missing');
  assertFails((context) => {
    context.write(
      `${V2}/guides/topic.md`,
      page(
        'Topic',
        20,
        '## Details\n\n```ts example=../../package.json\n{}\n```',
      ),
    );
  }, 'example-path');
});

test('rejects stray files and directories outside the layout', () => {
  assertFails((context) => {
    context.write('docs/stray.txt', 'Stray');
  }, 'stray-file');
  assertFails((context) => {
    context.write('docs/v9/index.md', page('Overview', 10));
  }, 'stray-file');
  assertFails((context) => {
    context.write('docs/framework/react/notes.md', page('Notes', 10));
  }, 'stray-file');
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

test('rejects installs that follow latest or target another snapshot', () => {
  for (const specifier of [
    '@jfdevelops/react-layout',
    '@jfdevelops/react-layout@2.1.0',
    '@jfdevelops/react-layout-adapter-zod',
  ]) {
    assertFails((context) => {
      context.write(
        `${V1}/index.md`,
        page(
          'Overview',
          10,
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
        `${V1}/index.md`,
        page(
          'Overview',
          10,
          '## Details\n\n```sh\npnpm add @jfdevelops/react-layout@1.1.0 @jfdevelops/react-layout-adapter-zod@0.1.0 zod\n```',
        ),
      );
    },
    (_root, result) => {
      assert.deepEqual(result.errors, []);
    },
  );
});

test('lets the current major install unpinned or same-major packages', () => {
  for (const specifier of [
    '@jfdevelops/react-layout',
    '@jfdevelops/react-layout@2.0.0',
  ]) {
    withDocs(
      (context) => {
        context.write(
          `${V2}/guides/topic.md`,
          page(
            'Topic',
            20,
            `## Details\n\n\`\`\`sh\npnpm add ${specifier} zod\n\`\`\``,
          ),
        );
      },
      (_root, result) => {
        assert.deepEqual(result.errors, []);
      },
    );
  }
  assertFails((context) => {
    context.write(
      `${V2}/guides/topic.md`,
      page(
        'Topic',
        20,
        '## Details\n\n```sh\npnpm add @jfdevelops/react-layout@1.1.0\n```',
      ),
    );
  }, 'install-version');
});

test('rejects two pages with the same order in one directory', () => {
  assertFails((context) => {
    context.write(`${V2}/guides/other.md`, page('Other', 20, '## Other'));
  }, 'nav-order');
  withDocs(
    (context) => {
      context.write(`${V2}/install.md`, page('Install', 20, '## Install'));
    },
    (_root, result) => {
      assert.deepEqual(result.errors, []);
    },
  );
});

test('allows links into the generated reference before it exists', () => {
  withDocs(
    (context) => {
      context.write(
        `${V2}/guides/topic.md`,
        page('Topic', 20, '## Details\n\n[API](../reference/index.md)'),
      );
    },
    (_root, result) => {
      assert.deepEqual(result.errors, []);
    },
  );
  assertFails((context) => {
    context.write(
      `${V1}/index.md`,
      page('Overview', 10, '## Start\n\n[API](./reference/index.md)'),
    );
  }, 'link-missing-file');
});

test('checks links in moved-page stubs', () => {
  assertFails((context) => {
    context.write(
      'docs/old-guide.md',
      '# Old guide\n\nMoved to [the topic](./framework/react/v2/guides/gone.md).\n',
    );
  }, 'link-missing-file');
});

test('requires a released version for each earlier major', () => {
  assertFails((context) => {
    context.write(`docs/framework/react/v0/index.md`, page('Overview', 10));
  }, 'version-release');
});

test('builds docs.json and meta.json from the tree', () => {
  withDocs(
    (context) => {
      context.write(`${V2}/install.md`, page('Install', 15, '## Install'));
    },
    (root) => {
      const { manifest, metaFiles } = buildDocsNavigation({
        root,
      });
      const [framework] = manifest.frameworks;
      const meta = (relative) =>
        metaFiles.get(path.join(root, relative).split(path.sep).join('/'));

      assert.equal(manifest.library.id, 'react-layout');
      assert.equal(framework.id, 'react');
      assert.equal(framework.defaultVersion, 'v2');
      assert.deepEqual(
        framework.versions.map((version) => [
          version.id,
          version.status,
          version.package.endpointVersion,
        ]),
        [
          ['v2', 'current', '2.1.0'],
          ['v1', 'previous', '1.1.0'],
        ],
      );
      assert.deepEqual(framework.versions[0].navigation, [
        {
          page: 'overview',
          title: 'Overview',
        },
        {
          page: 'install',
          title: 'Install',
        },
        {
          title: 'Guides',
          path: 'guides',
          pages: [
            {
              page: 'guides/topic',
              title: 'Topic',
            },
          ],
        },
      ]);
      assert.deepEqual(meta('docs/framework/react/meta.json'), {
        title: 'React',
        pages: ['v2', 'v1'],
      });
      assert.deepEqual(meta(`${V2}/meta.json`), {
        title: 'v2',
        pages: ['overview', 'install', 'guides'],
      });
      assert.deepEqual(meta(`${V2}/guides/meta.json`), {
        title: 'Guides',
        pages: ['topic'],
      });
    },
  );
});

test('marks the generated reference without walking it', () => {
  withDocs(
    (context) => {
      context.write(`${V2}/reference/index.md`, '# generated\n');
    },
    (root, result) => {
      const { manifest, metaFiles } = buildDocsNavigation({
        root,
      });

      assert.deepEqual(result.errors, []);
      assert.deepEqual(manifest.frameworks[0].versions[0].navigation.at(-1), {
        title: 'Reference',
        path: 'reference',
        generated: true,
      });
      assert.ok(
        ![...metaFiles.keys()].some((file) => file.includes('/reference/')),
      );
    },
  );
});

test('derives version status and releases', () => {
  assert.equal(versionStatus(4, 4), 'current');
  assert.equal(versionStatus(3, 4), 'previous');
  assert.equal(versionStatus(0, 4), 'legacy');
  assert.equal(versionStatus(5, 4), 'next');
  assert.equal(readReleasedVersions(repositoryRoot).get(3), '3.3.0');
});

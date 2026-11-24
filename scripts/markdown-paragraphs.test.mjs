import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { unwrapMarkdownParagraphs } from './markdown-paragraphs.mjs';

test('unwraps prose, list continuations and block quotes', () => {
  const source =
    'First line\nsecond line.\n\n- Item\n  continued.\n\n> Quote\n> continued.\n';

  assert.equal(
    unwrapMarkdownParagraphs(source),
    'First line second line.\n\n- Item continued.\n\n> Quote continued.\n',
  );
});

test('preserves frontmatter, code, tables, structure and intentional breaks', () => {
  const source =
    '---\ntitle: Example\norder: 10\n---\n\n## Heading\n\n```ts\nconst value =\n  1;\n```\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\nFirst  \nsecond\\\nthird\n\n- Parent\n  - Child\n';

  assert.equal(unwrapMarkdownParagraphs(source), source);
});

test('preserves CRLF and is idempotent', () => {
  const source = 'First\r\nsecond.\r\n';
  const result = unwrapMarkdownParagraphs(source);

  assert.equal(result, 'First second.\r\n');
  assert.equal(unwrapMarkdownParagraphs(result), result);
});

test('preserves rendered blockquotes inside deeply indented list items', () => {
  const MarkdownIt = createRequire(
    new URL('../tools/docs/package.json', import.meta.url),
  )('markdown-it');
  const markdown = new MarkdownIt();
  markdown.renderer.rules.softbreak = () => ' ';
  const cases = [
    ['10. > First\n    > second.\n', '10. > First second.\n'],
    [
      '- Parent\n  - Child\n\n    > First\n    > second.\n',
      '- Parent\n  - Child\n\n    > First second.\n',
    ],
    ['10. > > First\n    > > second.\n', '10. > > First second.\n'],
    ['10. > First\n    > \\> literal.\n', '10. > First \\> literal.\n'],
  ];

  for (const [source, expected] of cases) {
    const result = unwrapMarkdownParagraphs(source);

    assert.equal(result, expected);
    assert.equal(markdown.render(result), markdown.render(source));
    assert.equal(unwrapMarkdownParagraphs(result), result);
  }
});

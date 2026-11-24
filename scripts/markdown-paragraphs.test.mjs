import assert from 'node:assert/strict';
import { test } from 'node:test';
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

import { createRequire } from 'node:module';

const docsRequire = createRequire(
  new URL('../tools/docs/package.json', import.meta.url),
);
const MarkdownIt = docsRequire('markdown-it');
const markdown = new MarkdownIt({
  html: true,
});

/** Removes soft source wrapping while preserving Markdown block structure. */
export function unwrapMarkdownParagraphs(source) {
  const lines = source.split(/\r?\n/);
  const offset = lines[0] === '---' ? lines.indexOf('---', 1) + 1 : 0;
  const tokens = markdown.parse(lines.slice(offset).join('\n'), {});
  const replacements = [];

  for (let index = 0; index < tokens.length; index++) {
    const inline = tokens[index + 1];

    if (
      tokens[index].type !== 'paragraph_open' ||
      inline?.type !== 'inline' ||
      !inline.map
    ) {
      continue;
    }

    const [start, end] = inline.map.map((line) => line + offset);
    const result = [lines[start]];

    for (let line = start + 1; line < end; line++) {
      if (/(?: {2,}|\\)$/.test(lines[line - 1])) {
        result.push(lines[line]);
      } else {
        result[result.length - 1] +=
          ` ${lines[line].replace(/^(?: {0,3}> ?)*\s*/, '')}`;
      }
    }

    replacements.push({
      start,
      end,
      result,
    });
  }

  for (const { start, end, result } of replacements.reverse()) {
    lines.splice(start, end - start, ...result);
  }

  return lines.join(source.includes('\r\n') ? '\r\n' : '\n');
}

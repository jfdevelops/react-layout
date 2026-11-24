# Docs content contract

This is the contract between the docs in this repository and any site that renders them. Pages are the only authored source. `docs/docs.json` and every `meta.json` are generated from them by `pnpm generate-docs` and are not committed. The generated manifest carries `schemaVersion: 2`, and a site must refuse a manifest whose schema version it does not know. The checker, `scripts/check-docs.mjs`, enforces the page rules below; the generator, `scripts/docs-manifest.mjs`, defines the manifest.

A site integration reads this contract, not the page text. See [site-integration.md](./site-integration.md) for the handoff.

## Layout

```text
docs/
  README.md                    repository-facing index, not published
  framework/
    react/
      v4/ v3/ v2/ v1/ v0/      one directory per documented major
        <page>.md
        standard-schema.md     schema integration for this major
        errors/*.md            one page per error available in this major
        guides/*.md
        plugins/*.md           companion packages, current major only
        reference/             authored in earlier majors; generated in the current one
        assets/*               images, optional
  maintainers/                 excluded from the public collection
  docs.json                    generated
  **/meta.json                 generated
```

Only `.md` files in a version directory are public pages. The only other files allowed there are images under that version's `assets/`. A framework directory holds only `v<major>` directories.

## Versions

Version facts are derived, not written by hand:

| Fact | Source |
| --- | --- |
| `status` | The major of `packages/core/package.json`: that major is `current`, earlier majors are `previous`, `v0` is `legacy`, later majors are `next`. |
| `defaultVersion` | The `current` version, or the newest earlier one when the current major has no directory yet. |
| `package.endpointVersion` | The core package version for the current major; for earlier majors, the last release of that major in `packages/core/CHANGELOG.md`. |

Release evidence (tags, commits, publish times, provenance) lives in [release-audit.md](./release-audit.md), not in the manifest.

Installation commands in earlier majors pin library and companion packages to exact versions, and the core version must equal `package.endpointVersion`, so that copying an older guide never installs the latest major by accident. The current major may install unpinned packages, or pin a release of the same major.

## The manifest

```json
{
  "schemaVersion": 2,
  "generatedBy": "pnpm generate-docs",
  "library": { "id": "react-layout", "name": "React Layout", "npmPackage": "...", "repository": "..." },
  "frameworks": [
    {
      "id": "react",
      "title": "React",
      "path": "framework/react",
      "defaultVersion": "v4",
      "versions": [
        {
          "id": "v4",
          "label": "v4",
          "major": 4,
          "status": "current",
          "path": "framework/react/v4",
          "package": { "name": "@jfdevelops/react-layout", "endpointVersion": "4.1.0" },
          "navigation": [
            { "page": "overview", "title": "Overview" },
            { "title": "Guides", "path": "guides", "pages": [{ "page": "guides/resource-layouts", "title": "Resources and layouts" }] },
            { "title": "Reference", "path": "reference", "generated": true }
          ]
        }
      ]
    }
  ]
}
```

Navigation mirrors the directory tree. In each directory, pages come first, sorted by frontmatter `order` and then file name; subdirectories follow by name. A `generated` entry is the TypeDoc reference, which carries its own `meta.json`.

Each directory's `meta.json` is `{ "title", "pages" }`, where `pages` lists page file names without `.md` and subdirectory names in navigation order.

No page or generated file may carry a made-up date.

## Pages

Every page starts with frontmatter. Only these keys are allowed:

```yaml
---
title: Quick start
description: One sentence saying what the page covers.
order: 30
---
```

- `title` is plain text, 1 to 80 characters, and does not name the page's own version. The URL and selector already say it. Migration pages are exempt.
- `description` is one sentence, 1 to 220 characters.
- `order` is an integer, unique within its directory.

The page id is the path relative to the version directory without `.md`, for example `guides/lazy-loading`. Each segment is lowercase kebab-case, and there are at most three segments.

Public URLs: `/docs/react-layout/<framework>/<version>/<page id>`, with `/docs/react-layout` redirecting to the default framework's `defaultVersion`.

## Markdown

Keep each prose paragraph on one source line. Let editors and renderers wrap text instead of inserting manual line breaks for a column width. Preserve line breaks required for Markdown structure, code blocks, or intentional hard breaks.

The body is CommonMark plus GitHub tables. Supported:

- Headings `##` to `######`. The body has no `#` heading, because the title comes from frontmatter. Levels do not skip, for example `##` to `####`.
- Paragraphs, emphasis, strong, inline code, ordered and unordered lists, nested lists.
- Block quotes. A quote that starts with `**Note:**`, `**Tip:**` or `**Warning:**` is a callout, and renders as plain quote where callouts are not supported.
- Tables with a header row.
- Fenced code blocks with a language from: `ts`, `tsx`, `js`, `jsx`, `json`, `sh`, `bash`, `text`, `css`, `diff`, `yaml`, `npm`, `pnpm`, `yarn`, `bun`.
- Install commands get one fence per package manager, in this order, each labeled with its name: `npm` (`npm i`), `pnpm` (`pnpm add`), `yarn` (`yarn add`) and `bun` (`bun add`). A site may render the four as tabs. An install command in an `sh` or `bash` fence is an error.
- Inline links and images.

Not supported, and rejected: raw HTML and HTML comments, autolinks in angle brackets, reference-style links, footnotes, MDX and JSX. The generated reference is not held to these rules.

### Embedded examples

A fence may carry `example=<path>` in its info string, for example `` ```tsx example=v4/quick-start.tsx ``. The path is relative to `tools/docs/examples` and may not contain `..`. The block must match that fixture file exactly (line endings and trailing whitespace aside). Fixtures are type-checked by `pnpm check:docs-examples`, and the docs checker fails when the page and the fixture differ. Fences without `example=` are not verified.

## Links, anchors and assets

- Page links are relative paths to `.md` files, with an optional `#anchor`. They can point to another page in the same version, or to a page of another version.
- Links into the generated reference are allowed before it is generated.
- Links never leave the public collection. A link that resolves outside `docs/` (path traversal, including through a symlink), into `maintainers/`, or to an absolute path starting with `/` is an error. Source files in the repository are referenced by inline code, or by an absolute `https://` link pinned to a tag.
- Anchors use GitHub heading slugs: lowercase, punctuation removed, spaces to hyphens, repeats suffixed `-1`, `-2`. A bare `#anchor` points into the same page.
- External links are `https://`. `http:`, `mailto:`, `javascript:` and `data:` are rejected.
- Images are `![alt](./assets/name.svg)` and the file must exist under the version's `assets/`. Allowed types: `png`, `jpg`, `jpeg`, `gif`, `svg`, `webp`, `avif`.

## Maintainer pages

`docs/maintainers/` is never part of the public collection, never appears in navigation, and may not be linked to from a public page. It holds the release audit, this contract, the site integration handoff and design notes.

## Docs root

The docs root holds only `README.md`, `framework/`, `maintainers/` and generated files. Pages never live at the root.

## Authoring style

- Plain and direct. Say what to do, then why.
- A page opens with one or two sentences, then the content, then "Next steps".
- One idea per section. Prefer a table to a long paragraph of options.
- Do not name the page's own version in titles, descriptions or intros. Name another version only for a real cross-version fact: a migration step, an "added in" note, or a compatibility table.
- Describe only what the source at that version supports.

## Changing the contract

Adding an optional field is compatible. Anything else, including a new required field, a new allowed Markdown feature that older sites cannot render, or a change to slug or anchor rules, needs a new `schemaVersion` and a note in site-integration.md.

# Docs content contract

This is the contract between the docs in this repository and any site that renders
them. It is versioned: the manifest carries `schemaVersion: 1`, and a site must
refuse a manifest whose schema version it does not know. The checker,
`scripts/check-docs.mjs`, enforces everything below, and
`docs/maintainers/docs.schema.json` describes the manifest shape.

A site integration reads this contract, not the page text. See
[site-integration.md](./site-integration.md) for the handoff.

## What the library owns

Installation commands pin library and companion packages to exact versions from
the documented release snapshot. The core version must match the manifest's
`package.endpointVersion`; copying an older guide must never install the latest
major by accident. The checker enforces explicit versions in `pnpm add` blocks.

One library, `react-layout`, owns all public docs in `docs/`. Companion
packages (schema adapters, preset composables, devtools) are **not** separate
products. They have no pages, no navigation sections, no manifest entries and no
version selectors of their own. Their installation and APIs are documented inside
React Layout guides, use cases and reference, and their versions appear in the
compatibility table of each version's Getting started page.

## Layout

```text
docs/
  docs.json              the manifest
  README.md              repository-facing index, not published
  v4/ v3/ v2/ v1/ v0/    one directory per documented major, one version each
    index.md
    guides/*.md
    reference/*.md
    assets/*             images, optional
  maintainers/           excluded from the public collection
  <old-name>.md          retained stubs for old unversioned links
```

Only `.md` files in a version directory are public pages. The only other files
allowed there are images under that version's `assets/`.

## The manifest

`docs/docs.json` fields, with the rules the checker enforces:

| Field | Rule |
| --- | --- |
| `schemaVersion` | The number `1`. |
| `library` | One object (never a list) with `id`, `name`, `npmPackage` and `repository`. `id` is `react-layout`. |
| `defaultVersion` | The id of a version whose status is `current`. It is the latest verified released major. |
| `docsBaseCommit` | The 40-character commit the docs were written against. |
| `auditedOn` | `YYYY-MM-DD` of the release audit. It is the only date in the manifest that is not a registry timestamp. |
| `excluded` | Directories under `docs/` that are never published. Must include `maintainers`. |
| `legacyRedirects` | Old unversioned doc paths and where they now point. See below. |
| `versions` | Newest first. Unique `id`, matching `^v\d+$`, with `path` equal to `id`. |

Each version has:

| Field | Meaning |
| --- | --- |
| `id`, `label`, `major`, `path` | Identity. `label` is what a selector shows. |
| `status` | `current` (the latest verified release, exactly one), `previous` (superseded major), `legacy` (unstable or discontinued line) or `next` (unreleased, not yet verified). |
| `package` | The npm package, how many versions were published, the first version and the documented endpoint version. The package name must equal `library.npmPackage`. |
| `source` | Provenance: repository, the release tag, its commit, the registry publish time, how provenance was confirmed and the first release of the major. |
| `examples` | `typechecked` with a fixtures directory and command, or `adapted-from-source` with neither. |
| `navigation` | Ordered groups of page ids. |
| `note` | Optional caveat, for example for the unstable legacy line. |

Rules that span fields:

- Version ids are unique. The list is ordered by `major`, newest first.
- The tag equals `<npmPackage>@<endpointVersion>`.
- Every page file appears in navigation exactly once. Every navigation entry has a
  file. Navigation order must agree with frontmatter `order`.
- Nothing in the manifest, navigation titles or page ids may name a companion
  package as its own collection.

No page, manifest field or banner may carry a made-up date. Dates come from the
registry or the release, and carry their source.

## Pages

Every page starts with frontmatter. Only these keys are allowed:

```yaml
---
title: Getting started
description: One sentence saying what the page covers.
order: 20
---
```

- `title` is plain text, 1 to 80 characters, and does not name the page's own
  version. The URL and selector already say it.
- `description` is one sentence, 1 to 220 characters.
- `order` is an integer, unique within the version.

The page id is the path relative to the version directory without `.md`, for
example `guides/lazy-loading`. Each segment is lowercase kebab-case, and there are
at most three segments. `index` is the version's overview page.

Public URLs: `/docs/react-layout/<version>/<page id>`, with `index` served at the
version root, and `/docs/react-layout` redirecting to `defaultVersion`.

## Markdown

The body is CommonMark plus GitHub tables. Supported:

- Headings `##` to `######`. The body has no `#` heading, because the title comes
  from frontmatter. Levels do not skip, for example `##` to `####`.
- Paragraphs, emphasis, strong, inline code, ordered and unordered lists, nested lists.
- Block quotes. A quote that starts with `**Note:**`, `**Tip:**` or `**Warning:**` is
  a callout, and renders as plain quote where callouts are not supported.
- Tables with a header row.
- Fenced code blocks with a language from: `ts`, `tsx`, `js`, `jsx`, `json`, `sh`,
  `bash`, `text`, `css`, `diff`, `yaml`.
- Inline links and images.

Not supported, and rejected: raw HTML and HTML comments, autolinks in angle
brackets, reference-style links, footnotes, MDX and JSX.

### Embedded examples

A fence may carry `example=<path>` in its info string, for example
`` ```tsx example=v4/quick-start.tsx ``. The path is relative to
`tools/docs/examples` and may not contain `..`. The block must match that fixture
file exactly (line endings and trailing whitespace aside). Fixtures are type-checked
by `pnpm check:docs-examples`, and the docs checker fails when the page and the
fixture differ. Fences without `example=` are not verified, and a version whose
`examples.verification` is `adapted-from-source` states so on its pages.

## Links, anchors and assets

- Page links are relative paths to `.md` files, with an optional `#anchor`. They
  can point to another page in the same version, or to a page of another version.
- Links never leave the public collection. A link that resolves outside `docs/`
  (path traversal, including through a symlink), into an excluded directory, or to an
  absolute path starting with `/` is an error. Source files in the repository are
  referenced by inline code, or by an absolute `https://` link pinned to a tag.
- Anchors use GitHub heading slugs: lowercase, punctuation removed, spaces to
  hyphens, repeats suffixed `-1`, `-2`. A bare `#anchor` points into the same page.
- External links are `https://`. `http:`, `mailto:`, `javascript:` and `data:` are
  rejected.
- Images are `![alt](./assets/name.svg)` and the file must exist under the version's
  `assets/`. Allowed types: `png`, `jpg`, `jpeg`, `gif`, `svg`, `webp`, `avif`.

## Maintainer pages and exclusions

Anything under a directory listed in `excluded` is never part of the public
collection, never appears in navigation, and may not be linked to from a public
page. `docs/maintainers/` holds the release audit, this contract, the site
integration handoff and design notes.

## Legacy links

The docs used to be six unversioned files. Each old path stays as a short stub so
existing links resolve. The manifest's `legacyRedirects` lists them. A stub must
exist, must link to its target (a public page id, or a maintainer page for design
notes), and the target must exist. A site may serve them as redirects.

## Authoring style

- Plain and direct. Say what to do, then why.
- A page opens with one or two sentences, then an "In this guide you will" list for
  guides, then the content, then "Next steps".
- One idea per section. Prefer a table to a long paragraph of options.
- Do not name the page's own version in titles, descriptions or intros. Name another
  version only for a real cross-version fact: a migration step, an "added in" note,
  or a compatibility table.
- Describe only what the source at that version supports. Say when something was
  adapted from source rather than compiled.

## Changing the contract

Adding an optional field is compatible. Anything else, including a new required
field, a new allowed Markdown feature that older sites cannot render, or a change
to slug or anchor rules, needs a new `schemaVersion` and a note in
site-integration.md.

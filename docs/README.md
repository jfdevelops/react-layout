# React Layout documentation

Docs are grouped by framework, then by major version. The current version is [framework/react/v4](./framework/react/v4/overview.md).

```text
docs/
  framework/
    react/
      v4/                    current major
        overview.md
        installation.md
        quick-start.md
        typescript.md
        devtools.md
        standard-schema.md   schema integration summary
        errors/              one page per runtime error
        guides/              usage guides, examples, troubleshooting, migration
        plugins/             adapters and composables
        reference/           generated API reference (gitignored)
      v3/ ... v0/            earlier majors
  maintainers/               contributor and publishing information
```

## What is generated

Pages are authored Markdown with `title`, `description` and `order` frontmatter. Everything else is generated and gitignored:

| Output | Source |
| --- | --- |
| `docs.json` | The framework and version directories, `packages/core/package.json` and `packages/core/CHANGELOG.md`. |
| `meta.json` in each directory | Page frontmatter: `order` sets the position, `title` the label. Subdirectories follow pages. |
| `framework/react/v<current>/reference/` | `packages/core/src/index.ts` and its public re-exports, through TypeDoc and its Markdown plugin. |

A version's status comes from the core package version: its major is `current`, earlier majors are `previous`, `v0` is `legacy`, and later majors are `next`. The install version for each earlier major is its last release in the changelog.

```bash
pnpm install --frozen-lockfile
pnpm generate-docs
```

TypeDoc converts in a temporary directory, so a failed run leaves an existing reference intact. `tools/docs/package.json` keeps TypeDoc on the TypeScript 6 compiler it supports, apart from the workspace's TypeScript 7 toolchain.

The `Docs reference` workflow runs the generator on pull requests that change `docs/`, the generator scripts, or `tools/docs/`.

## Checks

`pnpm check:docs` validates every page: frontmatter, distinct orders within a directory, the Markdown subset, code fence languages, pinned installs for earlier majors, relative links and anchors. It builds the navigation in memory, so it does not need generated files. `pnpm check:docs-examples` type-checks the example fixtures in `tools/docs/examples`.

[release-audit.md](./maintainers/release-audit.md) records the release and source evidence for every major. [content-contract.md](./maintainers/content-contract.md) and [site-integration.md](./maintainers/site-integration.md) describe the page contract and how a website consumes these docs.

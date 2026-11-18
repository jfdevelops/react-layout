# React Layout docs

The docs for `@jfdevelops/react-layout` are versioned by major. Pick the major you use.

| Version | Status | Start here |
| --- | --- | --- |
| v4 | Current | [Overview](./v4/index.md), [Getting started](./v4/getting-started.md) |
| v3 | Previous | [Overview](./v3/index.md) |
| v2 | Previous | [Overview](./v2/index.md) |
| v1 | Previous | [Overview](./v1/index.md) |
| v0 | Legacy, unstable | [Overview](./v0/index.md) |

Each version has an overview, a getting started page, guides, an API reference,
troubleshooting and a migration guide from the previous major.

## For maintainers

- `docs.json` is the manifest. The contract for pages and the manifest is in
  [content-contract.md](./maintainers/content-contract.md).
- [release-audit.md](./maintainers/release-audit.md) records the release and source evidence
  for every version.
- [site-integration.md](./maintainers/site-integration.md) is the handoff for publishing these
  docs on a website. That connection is not built yet.
- Check the docs with `pnpm check:docs`, and the embedded v4 examples with
  `pnpm check:docs-examples`.

Old unversioned links such as `docs/standard-schema.md` remain as short pages that point to
their new location.

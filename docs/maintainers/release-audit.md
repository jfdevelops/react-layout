# Release and source audit

This page records the evidence behind the versioned React Layout docs: which releases exist, which commit each documented major was built from, and what is and is not verified. It is a maintainer page and is not part of the public docs collection.

- Audit date: 2026-11-17 (UTC).
- Docs baseline commit: `50ff82dbc2d40d56cb83fb4c95905c09ccaf4fde` (`fix(release): retry unpublished packages and verify archives`).
- Scope: the `@jfdevelops/react-layout` library and the companion packages that are documented inside its guides. Companion packages are not documented as separate products.

## Release state

| Question                                                  | Evidence                                                                                                                                                                                 | Result                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Is `@jfdevelops/react-layout@4.0.0` published on npm?     | `npm view @jfdevelops/react-layout versions --json` lists `4.0.0`; time `2026-11-17T21:46:19Z`.                                                                                          | Yes                                       |
| Is it the `latest` dist-tag?                              | `npm view @jfdevelops/react-layout dist-tags` returns `{ "latest": "4.0.0" }`.                                                                                                           | Yes                                       |
| Is it a stable release?                                   | GitHub release `@jfdevelops/react-layout@4.0.0` has `isPrerelease: false`, `isDraft: false`, published `2026-11-17T21:43:47Z` (`gh release view`).                                       | Yes                                       |
| Is there a git tag?                                       | Tag `@jfdevelops/react-layout@4.0.0` resolves to commit `b68f12045758ea26e7df75d3c79c8c2b886b4ace`. The repository's local tags stopped at `3.3.0` until `git fetch origin --tags` ran.   | Yes (the stale local checkout was behind) |
| Does the npm package come from that commit?              | The npm SLSA provenance statement for `4.0.0` names source commit `b68f12045758ea26e7df75d3c79c8c2b886b4ace` on `refs/heads/main`.                                                       | Yes                                       |
| Is the docs baseline part of the release?                 | `git merge-base --is-ancestor 50ff82d b68f120` succeeds; the two commits between them are the merge of #202 and the version-packages commit #203.                                         | Yes                                       |
| Do the published packages differ between baseline and tag? | `git diff 50ff82d b68f120 -- packages/<every published package>` is empty. Only the private `internals` package metadata and a consumed changeset differ.                                | No difference                             |

**Conclusion.** Version 4 is released and stable, not "next". The docs default to v4 because it is the latest verified released major. The manifest keeps a `next` status available for a future unreleased major, but none is documented now.

Local discrepancies worth knowing:

- The working checkout's `packages/core/package.json` already says `4.0.0` because the version-packages commit (`e0cd112`) landed before the baseline. That commit was not by itself evidence of publication; the npm, GitHub release and provenance checks above are.
- npm has `0.1.1` with no matching git tag. The core changelog lists `0.22.1`, but `0.22.1` was never published to npm. Neither affects a documented endpoint.
- A GitHub release and tag exist for the private `@jfdevelops/react-layout-internals@0.0.1` (commit `b68f120`), but npm returns E404 for it, so it is not installable. The baseline's `packages/internals/package.json` says `0.0.0` and the tag commit says `0.0.1`. Docs treat internals as an unpublished implementation detail.

## Documented majors and exact sources

Every documented major is documented at its **last released version** (its endpoint). Each endpoint's git tag commit equals the commit named in the npm SLSA provenance for that version, so the tag, the registry and the source agree.

| Major  | Versions on npm                         | Endpoint       | npm publish time (UTC)   | Tag and provenance commit                  |
| ------ | --------------------------------------- | -------------- | ------------------------ | ------------------------------------------ |
| v0     | `0.1.1` to `0.25.0` (42 published)      | `0.25.0`       | `2026-10-21T15:24:17Z`   | `185598a15d362035ac59a5429404642d9c52abb4` |
| v1     | `1.0.0` to `1.6.1` (11)                  | `1.6.1`        | `2026-10-27T18:23:55Z`   | `f183a3d4deec330876380e3ce2d2735dde398974` |
| v2     | `2.0.0` to `2.7.0` (9)                  | `2.7.0`        | `2026-11-10T21:50:55Z`   | `c55251276d2399f27e50bb238fb22ea18741efe6` |
| v3     | `3.0.0` to `3.3.0` (4)                  | `3.3.0`        | `2026-11-17T17:01:18Z`   | `1b5a1677c85883a09000053287350e7f66d87293` |
| v4     | `4.0.0` (1)                             | `4.0.0`        | `2026-11-17T21:46:19Z`   | `b68f12045758ea26e7df75d3c79c8c2b886b4ace` |

The first release of each major, used for migration notes:

| Major | First version | Tag commit                                 |
| ----- | ------------- | ------------------------------------------ |
| v1    | `1.0.0`       | `f21a23fbf7428d8bc475eae705c97284d2cb1e5f` |
| v2    | `2.0.0`       | `310165180d45d620e91a65137153d1520eac3360` |
| v3    | `3.0.0`       | `afc2c7782adc8c8664bfb00fca5d277496e471c9` |
| v4    | `4.0.0`       | `b68f12045758ea26e7df75d3c79c8c2b886b4ace` |

Two things are true at once about these majors, and the docs say both:

- All four majors shipped between 2026-10-21 and 2026-11-17, so every major is young. "Previous" means superseded, not long-lived. The repository promises no maintenance window for older majors, so the docs make none.
- Companion packages version independently from core. The compatibility tables in each version's getting-started page list the companion versions that the endpoint tag's own `packages/*/package.json` files carried and, where core depends on a package, the exact version npm resolved for core's published `dependencies`.

## Why v0 has so many breaking minors

The package was `0.x` from 2026-06-02 to 2026-10-21, with 42 published versions over about 20 weeks. Under semver, anything may change in a `0.x` minor, and the maintainers used that freedom: the core changelog records breaking changes in minor releases, for example:

- `0.13.0` moved per-resource scoped entries under a `resources` key and dropped an explicit type argument on scoped components.
- `0.18.0` removed the `subResources` wrapper in resource configs, changed nested `subResource` params to `{ value, subResource }`, and added the typed error hierarchy.
- `0.20.0` changed `resources.pick` and `resources.omit` to require at least one key and return a selection thunk.
- `0.22.0` changed how grouped resource-link ids are derived (a behavior change, not labeled breaking).
- `0.4.0` split validators, composables and the breadcrumb preset into separate packages.
- `0.25.0` added render states and lazy loading; `1.0.0` then replaced the chained `createDefinedResourceLayout` builder entirely.

Because of that, the docs publish exactly one v0 snapshot, for `0.25.0`, plus a caveat page about its instability and a pointer to the changelog. They do not promise a page for every minor. The authoritative record for a specific `0.x` version is its tag's source and `packages/core/CHANGELOG.md`.

## How the content was verified

Method, in the order it was run:

1. `git fetch origin --tags`, then `git rev-list -n1 <tag>` for each endpoint and first release.
2. `npm view` (read-only) for versions, publish times, dist-tags and each endpoint's published `dependencies` and `peerDependencies`.
3. `gh release view` and `gh api repos/.../git/matching-refs/tags/` (read-only).
4. Decoding the npm SLSA provenance attestation for each endpoint and comparing its commit to the tag.
5. `git archive <tag> packages docs README.md` into a scratch directory so each page is written against that tag's own README, `docs/`, changelogs, `package.json` exports, `src/index.ts` exports and tests, never against the current API.

What each version's docs claim to be verified against:

- **Export lists** in each version's API reference come from parsing the endpoint's `packages/core/src/index.ts` and companion `src/index.ts` files. They list runtime value exports. Type exports are summarised by count and group, not enumerated.
- **Behavior statements** come from the endpoint's own README, `docs/` pages, changelogs and tests. A statement that depends on a specific minor names it ("added in 2.3.0").
- **v4 examples that are embedded from fixtures** are type-checked. See `tools/docs/examples/v4` and `pnpm check:docs-examples`. The docs checker also fails when a page's embedded example differs from its fixture.
- **API-name presence check (one-off, not committed).** For each version, every API-like identifier in its docs (names starting with `create`, `define`, `use`, `as`, `for`, `is`, `get`, `make`, `resolve` and similar, plus error and type names) was searched for in that endpoint tag's `packages/**` source and tests. Names checked and names not found:

  | Version | Checked | Not found, and why |
  | --- | --- | --- |
  | v0 | 55 | 1: `ResourceBreadcrumb`, a component the example defines. |
  | v1 | 87 | 9: example names (`ResourceBreadcrumb`, `createBadgeComposable`), prose words (`Omitting`, `ResourceLayout`, `Navigation`), and names the page mentions only to say they arrived later (`getSchema`, `ConflictingPresetPropError`, `createRenderer`) or existed only in v0 (`defineOptions`). |
  | v2 | 107 | 9: the same kinds, plus `preloadAppointments`, an example function. |
  | v3 | 139 | 11: example names, prose, and removed names the migration page lists (`createProp`, `createErrorComponent`, `createPrimitivePropBuilder`, `isPropDefinitionShape`). |
  | v4 | 135 | 7: example names and prose only. |

  This proves a name exists at that tag. It does not check signatures or behavior, so it is weaker than a type check. Behavior statements still rest on the tag's README, docs, changelog and tests.
- **v1, v2, v3 and v0 snippets are not type-checked.** They are adapted from the endpoint tag's own README and docs and compared by hand to the tag's tests and exports. The pages say so. Nothing in the historical docs claims a compiler verified them.

## Known limits

- Dates here are registry and release timestamps. Pages themselves carry no dates.
- Only the latest minor of each major is documented. Behavior that changed between minors is annotated by minor where the changelog records it.
- No release-process or runtime change was made to produce this audit. If the registry state changes (for example a 5.0.0 release), re-run the method above and add a version in `docs.json`.

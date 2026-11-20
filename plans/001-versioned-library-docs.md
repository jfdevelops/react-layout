# Plan 001: Version React Layout documentation
Planned at: 50ff82dbc2d40d56cb83fb4c95905c09ccaf4fde (2026-11-17)
Priority P1; effort L; risk medium; dependencies none; category docs.

## Intent and context
User approved a documentation revamp. Each library owns docs in its root docs directory and jfdevelops.com consumes them. React Layout is the first library. IMPORTANT: companion packages NEVER get their own documentation pages, navigation sections, or version selectors; integrate their installation and APIs in core guides/use cases. One collection per core major.

Current tree has docs/vision.md, standard-schema.md, resource-renderers.md, lazy-loading.md, hosted-surfaces.md, devtools-and-shared-defaults.md, and a large README.md. Core package.json and CHANGELOG say 4.0.0; local release tags stop at 3.3.0. Other majors include 1.6.1 and 2.7.0; v0 has many breaking minors. Package READMEs, src exports, tests, changelogs and git tags provide evidence.

Website repo https://github.com/jfdevelops/jfdevelops.com currently has src/docs/registry.ts using eager import.meta.glob('../../packages/*/docs/**/*.md', query '?raw'), simple title/description/order frontmatter, package.json metadata and no major version model. src/docs/render-markdown.ts uses a small renderer without relative-link resolution, tables or heading anchors. Routes /docs/$package and catchall exist. Do not pretend this website already ingests external docs.

## Scope
Only docs/**, README.md, scripts/check-docs.mjs, scripts/check-docs.test.mjs, package.json (add check:docs/test:docs scripts), .github/workflows/** (docs validation only if suitable), and typecheck fixtures under docs or tools/docs if needed. Do not edit library runtime, dependency versions, lockfile, release process, or the website repository. Existing unversioned doc links must continue working through retained pages or link stubs. No separate companion pages. Reviewer owns plans/**.

## Workflow
Read AGENTS.md, relevant nested instructions, jf coding/naming/git skills, formatter and scripts before editing. Work in provided isolated worktree. Use docs/versioned-library-docs branch if choosing a branch. No push, PR, publish or deployment. Commit coherent result in worktree using subject-only docs(docs): ... or feat(docs): ... after validation. Do not modify parent checkout.

## Steps
1. Audit versions from git source at each final major tag, verify npm/GitHub release status read-only if available. Record exact refs/commits, compatibility, public API coverage and pre-1.0 policy under docs/maintainers/release-audit.md. Never assume unreleased v4 stable from package.json. Historical docs must follow historical code, not current types.
2. Create docs/docs.json and a documented reusable, schema-versioned contract under docs/maintainers/content-contract.md. Define id react-layout, display name, repository, defaultVersion, versions with status/release evidence and navigation. Use docs/v1, v2, v3, v4, plus clearly labeled legacy v0. Each version must have source provenance. Only verified released version defaults stable; unreleased v4 next. Define scoped slug, Markdown subset, relative links/assets/anchors, metadata and navigation. Add JSON schema if valuable. No fake published dates.
3. Create substantive task-oriented docs for all four majors: overview, getting-started, guides grouped by core concepts (resources/layouts, props/validation, states/composables, rendering/lazy, debugging as actually available), public API reference and troubleshooting, migration between adjacent majors. Verify each example against corresponding historical source. Cover all relevant exports or explicitly classify type/internal/advanced references. Explain companion APIs INSIDE use cases and API reference with compatible versions. For v0 use last release plus explicit breaking-minor caveat rather than promising compatibility across 0.x. Current v4 docs must cover latest runtime behavior, renderer options object, hosted surfaces and important helpers. Separate design/vision artifacts from product docs (maintainer area) without losing content. README becomes focused with versioned docs links; preserve valuable examples in guides.
4. Implement dependency-light meaningful validation using Node builtins in scripts/check-docs.mjs, with tests in scripts/check-docs.test.mjs modeled after scripts/publish.test.mjs. Validate manifest schema/version and identity, default/status, duplicate versions/slugs/navigation, required metadata/pages, path containment, local page/link/anchor/asset resolution including old pages, and no companion collections. Add scripts check:docs and test:docs. Include negative tests for malformed manifest, missing page, broken local link/anchor and path traversal. Do not overclaim typechecked historical snippets if unavailable. Prefer executable curated examples with clear verification status; report limits.
5. Add docs/maintainers/site-integration.md giving exact consumer contract and implementation handoff for website: pinned GitHub commit retrieval at build time, validate before registry generation, routes /docs/react-layout/vN/..., default redirect, version switching preserving page or explicit fallback, status banners, supported Markdown renderer, build trigger and failure behavior. Include sample manifest/registry mapping and acceptance gates. State explicitly website integration remains separate until implemented there.
6. Run node --test scripts/check-docs.test.mjs, node scripts/check-docs.mjs, pnpm format:check (fix only scoped files with installed formatter), pnpm lint as appropriate for new scripts. Run any example checks actually supplied. Run git diff --check. Do not broaden unrelated fixes for pre-existing failures.

## Done criteria
Versioned guides and references for majors 1-4 and legacy v0 exist and are navigable. Companion packages have no standalone docs pages. Manifest passes checker. Negative validation tests pass. Historical sources and release status are explicit. Existing root docs links preserved. All new links resolve. Website handoff explains gap honestly. Only scoped files changed. Verification results recorded accurately.

## Stop conditions
If release/source evidence cannot be obtained, mark precise uncertainty and avoid invented claims; continue unaffected portions. If a code example cannot be verified, label it accurately and explain in report. If modifying runtime or website is required, stop that portion and report the boundary. Do not discard user edits. If verification fails twice after reasonable fix attempt, report failure and avoid broad changes.

## Report
STATUS: COMPLETE | STOPPED
STEPS: each done/skipped plus command result
STOPPED BECAUSE: if applicable
FILES CHANGED:
NOTES: uncertainties, deviations, verification limits
Include worktree absolute path, branch and commit SHA. No claims without actual evidence.


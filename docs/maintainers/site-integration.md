# Site integration handoff

This page tells the owner of jfdevelops.com exactly what to build so the website
renders the versioned React Layout docs in this repository. It is a specification.

> **Status: the website connection is pending a separate implementation.** Nothing in
> this change touches the website. Until that work ships, these docs are readable in
> the repository only, and the website still serves whatever it served before.

The data contract is [content-contract.md](./content-contract.md). The facts behind
each version are in [release-audit.md](./release-audit.md).

## What the website does today

Read from the website repository on 2026-11-17, without changing it.

| Item | State |
| --- | --- |
| Reference commit | `origin/main` at `ba59dd4ac7d65ec7f03c11968399c115e699b215` (merge of PR #9). |
| Registry | `src/docs/registry.ts` eager-globs `../../packages/*/docs/**/*.md` as `?raw` strings and `../../packages/*/package.json`. |
| Page data | Frontmatter `title`, `description` and `order` are parsed by hand. A missing title falls back to the first `#` heading, and a missing order to `100`. |
| Slugs | The part of the file path after `docs/`, without `.md`. Pages sort by `order`, then slug. |
| Versions | None. A package has one `version` read from its local `package.json`. There is no version model. |
| Routes | `/docs`, `/docs/$package` and the catch-all `/docs/$package/$`. The catch-all reads the page slug from `_splat`. |
| Renderer | `src/docs/render-markdown.ts` (162 lines) renders `#`, `##` and `###`, paragraphs, flat lists, single-line quotes, rules, fenced code and inline code, bold, emphasis and links. |

What the renderer lacks, and the docs need:

- no tables, nested lists, `####` to `######` headings or multi-line quotes;
- no heading anchors, so `#fragment` links cannot land;
- relative links: its link sanitizer only keeps `/`, `#`, `http(s)` and `mailto:`
  hrefs and turns anything else, including `./guide.md`, into `#`;
- no image support, and code fences ignore their language;
- frontmatter parsing requires LF line endings (`\n---\n`).

The website's working tree on this machine was on branch `docs/client-portal-plans`
with uncommitted edits. That tree is a different in-progress design: a generated
`docs.config.json` with `subPackages` that list `react-layout-composables` and
`react-layout-validator` under React Layout, rendered through Fumadocs.
That is not the reference state above, and the plan below does not depend on it.
Whoever implements this must reconcile with that work.

> **Warning:** Do not carry the `subPackages` model over. Companion packages have no
> version selectors of their own. They appear as pages of a React Layout version, under
> `plugins/` and `devtools`.

## Plan

### 1. Fetch docs at a pinned commit at build time

- Keep one small file in the website repo, for example `docs.sources.json`:

  ```json
  {
    "react-layout": {
      "repository": "https://github.com/jfdevelops/react-layout",
      "commit": "<40-character commit>"
    }
  }
  ```

- A build step fetches that exact commit, never a branch, tag or `main`, and runs
  `pnpm install --frozen-lockfile`. The manifest, `meta.json` files and API reference
  are generated, not committed, so the build needs the workspace to generate them.
- Updating the pin is a reviewed commit in the website repo. Pick a commit on the
  library's default branch that contains the docs you want published.
- A missing commit, a failed fetch or a changed layout stops the build.

### 2. Validate before generating anything

1. In the fetched checkout run `pnpm generate-docs`, then `pnpm check:docs`. Both must
   exit 0.
2. Read `docs/docs.json`. Refuse any `schemaVersion` the site does not know (today: 2).
3. Only then generate the registry. A failure in either step fails the build. Never
   publish partial docs, and never skip a failing page.

The library's own CI runs the same checker (`pnpm check:docs`), so a bad pin is
unlikely, but the website must still run it on what it fetched.

### 3. Generate the registry

Replace the `packages/*/docs` eager glob for this library with a generated module
built from the manifest. Concrete mapping onto the existing `DocPage` and
`PackageDocs` shapes:

| Registry field | Source |
| --- | --- |
| package `id` and route `$package` | `library.id` (`react-layout`) |
| package `name` | `library.name` |
| package `description` | the site's own copy. The manifest has none. |
| new `frameworks[]` | `frameworks[]`: `id`, `title`, `defaultVersion` |
| package `version` | `package.endpointVersion` of the default framework's `defaultVersion` |
| new `versions[]` | each framework's `versions[]`: `id`, `label`, `status`, `package.endpointVersion` |
| page `slug` (the `_splat`) | `<framework.id>/<version.id>/<pageId>` |
| page `title`, `description`, `order` | the page's frontmatter |
| page `content` | the body after the frontmatter |
| new page `group` | the title of the navigation directory that holds the page |
| new page `previous` and `next` | neighbors in the flattened navigation of that version |
| sidebar | `navigation` of the version in the URL; a `generated` entry reads `<path>/meta.json` |

Page ids are identical across versions wherever a page exists in both, which is what
makes switching work.

### 4. URLs and routes

| URL | Behavior |
| --- | --- |
| `/docs/react-layout` | Redirect to `/docs/react-layout/react/<defaultVersion>`. Today that is `v4`. |
| `/docs/react-layout/<framework>` | Redirect to that framework's `defaultVersion`. |
| `/docs/react-layout/<framework>/<version>` | The first page of the version's navigation. |
| `/docs/react-layout/<framework>/<version>/<pageId>` | A page. `<pageId>` may have up to two slashes (`guides/lazy-loading`). |
| unknown framework, version or page | 404. |

The existing `$package` and `$` routes already carry a multi-segment `_splat`, so this
needs a loader change and a version-aware registry lookup, not a new route tree.

### 5. Version switching

- The selector lists `versions[]` with their `label` and a status badge, current first.
- On switch, keep the page: go to the same `pageId` under the chosen version when it
  exists. Build a `pageExists[version][pageId]` set at generation time.
- When the page does not exist there (for example `guides/hosted-surfaces` in `v1`, or
  most guides in `v0`), go to that version's first page and show a short notice:
  "This page does not exist in this version."
- Keep the `#fragment` only when the same page exists and the heading id exists there.

### 6. Banners

| Condition | Banner |
| --- | --- |
| `status: previous` | "You are reading docs for an older major." Link to the same page in `defaultVersion`, falling back to its `index`. |
| `status: legacy` | "This is an unstable 0.x line. Only the final release is documented." |
| `status: next` | "This version is not released." |
| `status: current` | None. |

Banners come only from `status`. Do not hard-code version numbers.

### 7. Renderer requirements

The renderer must support the contract's Markdown subset:

| Need | Requirement |
| --- | --- |
| Page title | Render frontmatter `title` as the page `h1`. Page bodies have no `#`. |
| Headings | `##` to `######`, each with an `id` from the GitHub slug algorithm. Reuse `slugifyHeading` and the duplicate suffix rule from `scripts/check-docs.mjs`, and add a test that the site and checker agree on every heading. |
| Tables | GitHub pipe tables with a header row. |
| Lists | Ordered, unordered and nested. |
| Quotes | Multi-line block quotes. Render `**Note:**`, `**Tip:**` and `**Warning:**` openers as callouts. |
| Code | Fenced blocks with the language available for highlighting: `ts`, `tsx`, `js`, `jsx`, `json`, `sh`, `bash`, `text`, `css`, `diff`, `yaml`. Ignore the `example=` info token. |
| Relative links | Resolve a `.md` link against the current page and rewrite it to `/docs/react-layout/<framework>/<version>/<pageId>#anchor`. Cross-version links (`../../v3/migration.md`) rewrite the same way. |
| External links | `https://` only, with `rel="noopener noreferrer"`. |
| Images | Copy `docs/framework/<framework>/<version>/assets/**` to a static path and rewrite `./assets/x.svg`. |
| Safety | No raw HTML. Keep escaping. Rendering never executes content. |
| Input | Normalize CRLF to LF before parsing frontmatter. |

Use an existing, tested Markdown pipeline if that is cheaper than extending the 162-line
renderer. The requirement is the behavior above, not a particular library.

### 8. Build trigger and failure behavior

- **Trigger.** Today: a change to the pin in the website repo. Later: a `repository_dispatch`
  or `workflow_dispatch` from a library release workflow, sent only after npm publish
  succeeded, which opens a pin-update PR rather than deploying directly.
- **No silent updates.** The site never follows a branch. The published docs are always
  exactly the pinned commit.
- **Failure.** If fetching, `check-docs`, manifest parsing or registry generation fails,
  the build fails and the previous deployment keeps serving. Report the checker's error
  lines in the CI log.
- **New major.** When the library releases a new major, a docs PR adds a
  `framework/react/v<major>` directory and moves the reference path in `.gitignore`. The
  generated manifest picks it up, the checker passes, and the website pin moves. The site
  code needs no change.

### 9. Redirects for old links

The library keeps stubs for the six old root docs (`docs/standard-schema.md` and so on),
each linking to the page that replaced it. The website at the reference commit never
served those repository paths, so serving them as redirects is optional.

## Acceptance gates

The website integration is done when every item is true and demonstrated:

1. The build fetches the pinned commit, runs `pnpm generate-docs`, and fails if the
   commit is missing or generation fails.
2. The build runs `pnpm check:docs` on the fetched files and fails on any error.
3. A manifest with `schemaVersion` other than 2 fails the build with a clear message.
4. `/docs/react-layout` redirects to `/docs/react-layout/react/v4` and the target renders.
5. Every page id in every version's navigation renders at its URL with its frontmatter
   title as the `h1` and no `#` in the body.
6. A heading `#fragment` link, for example `installation#companion-packages`,
   scrolls to the heading, and the site's slugs equal the checker's for all headings.
7. Tables, nested lists, multi-line quotes, `####` headings and highlighted `tsx` blocks
   render correctly on a sample page from each version.
8. A relative `.md` link, including a cross-version one, navigates to the right URL.
9. Switching versions keeps the page where it exists and falls back to the index with a
   notice where it does not (test `v4` to `v1` on `guides/hosted-surfaces`).
10. Banners appear for `previous` and `legacy` versions and are absent for `v4`.
11. Companion packages appear only as pages of a React Layout version, never as their own
    library or version selector.
12. A deliberate failure (bad pin, broken link in a fixture docs tree) fails the build and
    leaves the previous deployment serving.
13. Rendering performs no network calls at request time for docs content.

## Open questions for the implementer

- Where the pin lives and who bumps it after a library release.
- Whether to extend the current renderer or adopt a Markdown pipeline (the working tree
  on this machine experiments with Fumadocs).
- Whether to serve the stubs for old repository links.
- The website repo's `example-package`, `layout-composables` and `layout-validator`
  directories hold placeholder docs, and `docs.config.json` currently maps `example-package`
  to the React Layout slug. Replacing them is part of the website change, not this one.

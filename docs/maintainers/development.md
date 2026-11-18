# Workspace development notes

Notes for people working in this repository. They moved here from the root README so it can
stay a short entry point.

## Requirements and commands

**Requirements:** Node `^20.19.0 || >=22.12.0`, pnpm `10.28.1`, React `>=18`.

```bash
pnpm install
pnpm dev               # library dev server
pnpm dev:basic-example # run the example app
pnpm build             # build the library
pnpm test              # run tests
pnpm check:docs        # validate the versioned docs
pnpm check:docs-examples # type-check the embedded v4 examples
```

## Workspace tooling

Run `pnpm lint` for Oxlint checks, `pnpm lint:fix` for fixes, `pnpm format` for
Oxfmt followed by lint fixes and a final formatting pass, and `pnpm format:check`
for a formatting check. CI runs lint and formatting checks before compilation.

The workspace root pins TypeScript 7.0.2 (the latest stable npm release when
configured). Package scripts use the root compiler. The Vite devtools runtime
retains TypeScript 6.0.3 because its instrumentation uses the legacy compiler
API. Autocomplete compatibility tests explicitly use the `typescript-5-9` and
`typescript-6` aliases; workspace compilation checks the current compiler.

Oxlint enables its built-in TypeScript, React, React Hooks, JSX accessibility,
import, Vitest, and Oxc plugins. These require no separate plugin packages.
`@stylistic/eslint-plugin` enforces expanded nonempty object literals and blank
lines before returns. `tools/oxlint-plugin.mjs` wraps its property newline rule
to check runtime object literals only, leaving type literal formatting to Oxfmt.
Empty objects stay compact. Generated files and build outputs are excluded.

The file-scoped overrides in `.oxlintrc.json` baseline existing semantic lint
findings, including React effect patterns and compile-only test assertions.
They do not exempt object formatting. Remove each exception when its underlying
code is addressed; new files receive the enabled correctness checks by default.

## Docs examples

Embedded v4 examples live in `tools/docs/examples/v4` and are type-checked against the
workspace sources by `tools/docs/tsconfig.json`. The docs checker fails when a page's
`example=` block differs from its fixture. Older majors' snippets are not compiled.

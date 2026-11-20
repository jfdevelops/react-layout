---
title: Installation
description: Install React Layout and the companion packages you need.
order: 20
---

React Layout requires React 18 or newer. Tooling requires Node
`^20.19.0 || >=22.12.0`.

```bash
pnpm add @jfdevelops/react-layout zod
```

The examples use Zod. Any synchronous Standard Schema library can describe your
options. TypeScript infers resource keys and component props from your definition.

## Companion packages

For React node and element schemas, add the adapter for your schema library:
`@jfdevelops/react-layout-adapter-zod`, `-arktype`, `-valibot`, or `-effect`.
Check the chosen package's peer dependencies against your schema library version.
Presets and devtools are optional; their guides show the required installs.

| Package | Use it for |
| --- | --- |
| [Adapters](./plugins/adapters.md) | React node and element schemas for your schema library. |
| [Composables](./plugins/composables.md) | Named slots and preset contracts. |
| [Devtools](./devtools.md) | The React inspector and Vite integration. |

Next, follow the [quick start](./quick-start.md).

# view-map

pnpm monorepo containing the `view-map` React library.

## Workspace

- `packages/core`: library package built with Vite 8, Vitest, and Rolldown

## Requirements

- Node `^20.19.0 || >=22.12.0`
- pnpm `10.28.1`
- React `>=18`

## Root scripts

- `pnpm dev` starts the `view-map` demo app
- `pnpm build` builds the `view-map` library
- `pnpm test` runs the `view-map` Vitest suite
- `pnpm typecheck` runs the `view-map` TypeScript check

## Package usage

```tsx
import { ViewMap } from 'view-map'

export function Example() {
  return <ViewMap title="Office map" src="https://example.com/embed" />
}
```

# view-map

React library scaffold built with Vite 8, Vitest, and Rolldown.

## Requirements

- Node `^20.19.0 || >=22.12.0`
- React `>=18`

## Scripts

- `npm run dev` starts the local demo app
- `npm run build` emits types with TypeScript and bundles the library with Vite
- `npm run test` runs Vitest
- `npm run typecheck` runs TypeScript without emitting files

## Usage

```tsx
import { ViewMap } from 'view-map'

export function Example() {
  return <ViewMap title="Office map" src="https://example.com/embed" />
}
```

# @jfdevelops/react-layout-adapters

Create native React schemas for any Standard Schema library. This package
provides a named `createAdapter` export and depends on no schema library.

```sh
pnpm add @jfdevelops/react-layout-adapters
```

```ts
import { createAdapter } from '@jfdevelops/react-layout-adapters';
import { z } from 'zod';
import type { ReactElement, ReactNode } from 'react';

export const { reactNode, reactElement } = createAdapter({
  node: (check) => z.custom<Exclude<ReactNode, undefined>>(check),
  element: (check) => z.custom<ReactElement>(check),
});
```

The callbacks receive type guards for `ReactNode` and `ReactElement`. Return
your library's corresponding Standard Schema from each callback. Both helpers
preserve the exact returned schema type and create a fresh schema on every
call; callbacks run when a helper is called, not when the adapter is created.
Use the native library to configure messages, optionality, and other behavior.

React node checks include empty nodes and reusable collections. One-shot
iterators must be materialized into arrays before validation. Element checks
use `React.isValidElement`; they accept `<Icon />`, not `Icon`.

Ready-made adapters are available separately as
`@jfdevelops/react-layout-adapter-zod`,
`@jfdevelops/react-layout-adapter-valibot`,
`@jfdevelops/react-layout-adapter-arktype`, and
`@jfdevelops/react-layout-adapter-effect`.

# @jfdevelops/react-layout-adapter-zod

Opt-in native zod schemas for `React.ReactNode` and `React.ReactElement`.
Install this adapter alongside `zod` and React:

```sh
pnpm add @jfdevelops/react-layout-adapter-zod zod
```

```ts
import { reactNode, reactElement } from '@jfdevelops/react-layout-adapter-zod';

const content = reactNode();
const icon = reactElement();
```

Both helpers return native zod schemas, so use the library's normal
object, array, union, and optional APIs. `reactElement()` accepts element values
such as `<Icon />`; component functions require their own schema.

See the [Standard Schema guide](../../docs/standard-schema.md) for usage with React Layout.

Node and element fields are required by default. Use your schema library's optional wrapper to allow omitted values. `null` remains a valid node.

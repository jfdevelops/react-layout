# @jfdevelops/react-layout-adapter-arktype

Opt-in native arktype schemas for `React.ReactNode` and `React.ReactElement`.
Install this adapter alongside `arktype` and React:

```sh
pnpm add @jfdevelops/react-layout-adapter-arktype arktype
```

```ts
import { reactNode, reactElement } from '@jfdevelops/react-layout-adapter-arktype';

const content = reactNode();
const icon = reactElement();
```

Both helpers return native arktype schemas, so use the library's normal
object, array, union, and optional APIs. `reactElement()` accepts element values
such as `<Icon />`; component functions require their own schema.

See the [Standard Schema guide](../../docs/standard-schema.md) for usage with React Layout.

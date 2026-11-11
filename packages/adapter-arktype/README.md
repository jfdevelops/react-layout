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

Both helpers build native ArkType schemas at runtime, but expose only the thin
`ReactNodeSchema` and `ReactElementSchema` Standard Schema interfaces. This keeps
ArkType's internal types out of React Layout's deep mapped generics and avoids
excessive type instantiation. Native ArkType methods are intentionally absent
from the exported TypeScript API. `reactElement()` accepts element values
such as `<Icon />`; component functions require their own schema.

See the [Standard Schema guide](../../docs/standard-schema.md) for usage with React Layout.

Node and element fields are required by default. Use a Standard Schema library's optional wrapper to allow omitted values. `null` remains a valid node.

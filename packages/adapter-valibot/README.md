# @jfdevelops/react-layout-adapter-valibot

Opt-in native valibot schemas for `React.ReactNode` and `React.ReactElement`.
Install this adapter alongside `valibot` and React:

```npm
npm i @jfdevelops/react-layout-adapter-valibot valibot
```

```pnpm
pnpm add @jfdevelops/react-layout-adapter-valibot valibot
```

```yarn
yarn add @jfdevelops/react-layout-adapter-valibot valibot
```

```bun
bun add @jfdevelops/react-layout-adapter-valibot valibot
```

```ts
import { reactNode, reactElement } from '@jfdevelops/react-layout-adapter-valibot';

const content = reactNode();
const icon = reactElement();
```

Both helpers return native valibot schemas, so use the library's normal
object, array, union, and optional APIs. `reactElement()` accepts element values
such as `<Icon />`; component functions require their own schema.

See the [props and validation guide](../../docs/framework/react/v4/guides/props-and-validation.md) for usage with React Layout.

Node and element fields are required by default. Use your schema library's optional wrapper to allow omitted values. `null` remains a valid node.

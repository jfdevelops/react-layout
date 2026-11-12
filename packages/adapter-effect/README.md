# @jfdevelops/react-layout-adapter-effect

Opt-in native Effect schemas for `React.ReactNode` and `React.ReactElement`.
Install this adapter alongside `effect` and React:

```sh
pnpm add @jfdevelops/react-layout-adapter-effect effect
```

```ts
import { reactNode, reactElement } from '@jfdevelops/react-layout-adapter-effect';

const content = reactNode();
const icon = reactElement();
```

Both helpers return native Effect schemas that are also Standard Schemas, so
they work directly as React Layout props and compose with `Schema.Struct`,
`Schema.Array`, `Schema.optional`, and the rest of the Effect Schema API.
`reactElement()` accepts element values such as `<Icon />`; component
functions require their own schema.

Effect schemas you compose yourself are not Standard Schemas until you convert
them. Wrap an object schema with `Schema.toStandardSchemaV1` before passing it
to React Layout:

```ts
import { Schema } from 'effect';

const options = Schema.toStandardSchemaV1(
  Schema.Struct({
    title: Schema.String,
    description: reactNode(),
    icon: Schema.optional(reactElement()),
  }),
);
```

See the [Standard Schema guide](../../docs/standard-schema.md) for usage with React Layout.

Node and element fields are required by default. Use `Schema.optional` to allow omitted values. `null` remains a valid node.

Requires Effect 4.

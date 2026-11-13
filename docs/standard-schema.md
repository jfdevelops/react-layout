# Standard Schema and React values

React Layout accepts a synchronous Standard Schema v1 object schema directly
as `options`. It also accepts individual schemas in `props.custom`, composable
props, render states, scoped components, reusable functions, and options maps.

Schemas can be declared inline or reused through constants. The entire options
object is validated together, preserving object-level refinements, defaults,
and transforms without inspecting schema-library internals.

```tsx
import { z } from 'zod';
import { defineResourceLayout } from '@jfdevelops/react-layout';
import { reactNode, reactElement } from '@jfdevelops/react-layout-adapter-zod';

const optionsSchema = z.object({
  title: z.string().min(1),
  description: reactNode(),
  icon: reactElement().optional(),
});

const { createResourceLayout } = defineResourceLayout({
  resources: ['users'],
  options: optionsSchema,
  layout: {
    props: {
      include: { title: true, description: true, icon: 'optional' },
      custom: { footer: reactNode() },
    },
    render: ({ title, description, icon, footer }) => (
      <main>
        <h1>{icon}{title}</h1>
        {description}
        <footer>{footer}</footer>
      </main>
    ),
  },
});

const Users = createResourceLayout({
  resource: 'users',
  name: 'Users',
  title: 'Users',
  description: <p>Manage users</p>,
});
```

The schema's input and output must be objects. Creation-time inputs are bound
to the layout; included inputs supplied via the component are merged before
validation. All required schema inputs must be supplied, including fields that
the render callback does not select. `props.include` selects output fields for
rendering; it does not weaken the object schema's validation contract. Schemas
can transform the object to a different output shape, and render props infer
the selected output types.

Options can also be declared as a map of schemas keyed by option name, where
each option is validated on its own:

```ts
const titleSchema = z.string();
const options = { title: titleSchema, icon: reactElement().optional() };
```

## Native React schemas

React Layout provides separate opt-in packages for Zod 4, Valibot 1,
ArkType 2, and Effect 4. Each returns the library's own schema type so ordinary schema
composition works. Install only the adapter and schema library you use:

```sh
pnpm add @jfdevelops/react-layout-adapter-zod zod
# Or:
pnpm add @jfdevelops/react-layout-adapter-valibot valibot
pnpm add @jfdevelops/react-layout-adapter-arktype arktype
pnpm add @jfdevelops/react-layout-adapter-effect effect
```

Each adapter has React and its own schema library as peer dependencies. The
adapters depend only on the shared `@jfdevelops/react-layout-adapters` factory.

## Creating an adapter

The schema-library independent `@jfdevelops/react-layout-adapters` package
exports the named `createAdapter` factory. Supply callbacks that wrap the
provided React predicates in your library's native schemas:

```ts
import { createAdapter } from '@jfdevelops/react-layout-adapters';
import { z } from 'zod';
import type { ReactNode, ReactElement } from 'react';

export const { reactNode, reactElement } = createAdapter({
  node: (check) => z.custom<ReactNode>(check).optional(),
  element: (check) => z.custom<ReactElement>(check),
});
```

The callbacks receive typed React predicates and return Standard Schema
definitions. The factory preserves each callback's exact native schema type;
each returned helper constructs a new schema when called. Library-specific
messages, optionality, and other behavior belong in the callbacks. The four
ready-made adapter packages use this same factory.

## Native schema composition

```ts
// Zod
import { z } from 'zod';
import { reactNode, reactElement } from '@jfdevelops/react-layout-adapter-zod';

const content = z.object({
  body: reactNode(),
  icons: z.array(reactElement()),
  footer: reactNode().optional(),
});
```

```ts
// Valibot
import * as v from 'valibot';
import { reactNode, reactElement } from '@jfdevelops/react-layout-adapter-valibot';

const content = v.object({
  body: reactNode(),
  icons: v.array(reactElement()),
  footer: v.optional(reactNode()),
});
```

```ts
// ArkType
import { type } from 'arktype';
import { reactNode, reactElement } from '@jfdevelops/react-layout-adapter-arktype';

const content = type({
  body: reactNode(),
  icons: reactElement().array(),
  'footer?': reactNode(),
});
```

```ts
// Effect
import { Schema } from 'effect';
import { reactNode, reactElement } from '@jfdevelops/react-layout-adapter-effect';

const content = Schema.toStandardSchemaV1(
  Schema.Struct({
    body: reactNode(),
    icons: Schema.Array(reactElement()),
    footer: Schema.optional(reactNode()),
  }),
);
```

The Effect helpers are already Standard Schemas. An Effect schema you compose
yourself is not, so convert it with `Schema.toStandardSchemaV1` before passing
it to React Layout.

`reactElement()` infers `React.ReactElement` and uses `React.isValidElement`.
It accepts elements such as `<Icon />`, including fragments, and rejects
strings, portals, arbitrary objects, and component functions such as `Icon`.
Props keep the names they are declared with.

`reactNode()` infers `React.ReactNode`. It accepts strings, numbers, booleans,
null, undefined, elements, portals, and collections of nodes. React 19 also
accepts bigint and promise-like nodes. Validation never invokes components or
awaits promises. One-shot iterators such as generators must be materialized
into an array first, so validation cannot consume the children before React.
A node schema permits empty content: use a narrower schema
if a slot must contain a visible value. The `children: 'required'` shorthand
requires that the content slot is supplied.

## Inputs, defaults, and transforms

Callers supply schema input values. Render callbacks and reusable functions
receive validated schema output values. Missing values are validated as
`undefined`, allowing optional schemas and defaults to work.

```tsx
props: {
  custom: {
    label: z.string().default('Items'),
    count: z.string().transform(Number),
  },
},
render: ({ label, count }) => <p>{label}: {count + 1}</p>,
// Call with <Page count="2" />; render receives label="Items", count=2.
```

Validation is synchronous. Async schemas throw a clear error rather than
passing a promise into render props. Validate async data before rendering.

Errors remain contextual `PropError` instances. `path`, `layoutName`, and
`resource` identify the failing prop. `issues` retains every schema issue
with its path prefixed by the prop name; the primary message uses the first
issue's message.

Reusable selections accept whole fields (`meta: true`), selectors
(`meta: (value) => value.owner`), and nested selections
(`meta: { owner: true }`). No schema library registration is needed for validation.

Reusable functions with an object options schema validate the whole object
before selecting output values. Inputs selected by `props.include.options`
are passed as direct arguments; remaining schema inputs come from `options`:

```ts
const { createReusable } = createDefinedResourceLayout({
  resources: ['users'],
  options: z.object({ prefix: z.string(), count: z.string().transform(Number) }),
});
const read = createReusable({
  props: { include: { options: { count: true } } },
  fn: ({ count }) => count + 1,
});
read({ count: '2', options: { prefix: 'Items' } }); // 3
```

## Migrating from `createProp`

`createProp` and the builder API of `@jfdevelops/react-layout-validator`
have been removed. Describe props with a Standard Schema library and the
React Layout adapters instead.

| Removed definition | Zod replacement |
| --- | --- |
| `createProp.string()` | `z.string()` |
| `createProp.number().optional()` | `z.number().optional()` |
| `createProp.string().literal('a')` | `z.literal('a')` |
| `createProp.string().enum(['a', 'b'])` | `z.enum(['a', 'b'])` |
| `createProp.array(createProp.string())` | `z.array(z.string())` |
| `createProp.object({ name: createProp.string() })` | `z.object({ name: z.string() })` |
| `createProp.record({ value: createProp.string() })` | `z.record(z.string(), z.string())` |
| `createProp.component({ type: 'ReactNode' })` | `reactNode()` |
| `createProp.component({ type: 'JSX.Element' })` | `reactElement()` for element values |

Behavior that depended on the old definitions has changed:

- **Component slots.** Use `componentSlot({ props: { label: z.string() } })`.
  A slot named `actions` is still supplied and rendered as `Actions`.
- **Values carried by a definition.** A literal definition used to supply its
  own value. Give the schema a default instead, for example
  `z.literal('docs').default('docs')`.
- **`options` as a function.** `options: ({ resource, name }) => ...` remains supported; return schemas.
- **Nested reusable selections.** `options: { meta: { owner: true } }` remains supported.
- **`createProp.fromComponent`.** Use `createPropsFromComponent(Component).pick(...)`
  or `.omit(...)` to reuse retained prop schemas.
- **Error messages.** A failed prop reports the schema's own message as
  `Invalid prop "<path>": <message>`, including for a missing required prop.
- **Unknown keys.** Whether an object keeps undeclared keys is now decided by
  your schema library.
- **Devtools.** Props show their type and schema vendor where metadata is available.
  Unknown schemas show `unknown`; inspection never validates a value.

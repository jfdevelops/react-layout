---
title: Composables and presets
description: Share named slots across pages, use ready-made preset composables, and define your own with validated props.
order: 60
---

A composable is a named slot component such as `Layout`, `Title` or `Breadcrumb`.
Pages render the same slots, so your markup stays consistent. A **preset**
composable also ships its props, so a page supplies the values and your render
callback supplies the markup.

In this guide you will:

- declare composables with `create`
- add preset composables from companion packages
- rename, extend and type preset props
- define your own composable with validated props

## Declare slots

`layout.composables` receives a resource-aware `create` function. Each call
returns a slot with a stable component name.

```tsx
composables: (create) => ({
  Layout: create({ name: 'PageLayout' }),
  Title: create({ name: 'PageTitle' }),
}),
```

`name` is a string or a callback receiving `{ resource, capitalize }`, so each
resource can get its own display name. The render callback gets the slots as
`composables`.

## Add presets

Install the preset package you need, then spread its factory into
`composables`. Each factory takes a render callback that receives the preset's
props.

| Package                                                  | Factories                                          | Props                                                   |
| -------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| `@jfdevelops/react-layout-composable-navigation` 0.1.1   | `createBreadcrumbComposable`, `createTabsComposable` | `segments`, `tabs` (records of items keyed by stable id) |
| `@jfdevelops/react-layout-composable-copy` 0.1.1         | `createHeaderComposable`, `createMetaComposable`   | `title`, `description?`, `eyebrow?`, `canonical?`, …    |
| `@jfdevelops/react-layout-composable-actions` 0.2.0      | `createActionsComposable`                          | `actions` (links with an optional `intent`)             |
| `@jfdevelops/react-layout-composable-access` 0.1.1       | `createAccessComposable`                           | `roles?`, `permissions?`, `flag?`                       |

```sh
pnpm add @jfdevelops/react-layout-composable-navigation@0.1.1 @jfdevelops/react-layout-composable-copy@0.1.1
```

```tsx
import { defineResourceLayout } from '@jfdevelops/react-layout';
import {
  createHeaderComposable,
  createMetaComposable,
} from '@jfdevelops/react-layout-composable-copy';
import { createBreadcrumbComposable } from '@jfdevelops/react-layout-composable-navigation';

const { createResourceLayout } = defineResourceLayout({
  resources: ['users'],
  layout: {
    composables: () => ({
      ...createHeaderComposable(({ title, description }) => (
        <header>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
      )),
      ...createMetaComposable(({ title, description }) => (
        <p>{`${title} | ${description}`}</p>
      )),
      ...createBreadcrumbComposable(({ segments }) => (
        <nav>{Object.keys(segments).join(' / ')}</nav>
      )),
    }),
    props: {
      include: {
        title: true,
        description: true,
        segments: true,
      },
    },
    render: (props, { composables }) => (
      <main>
        <composables.Meta title={props.title} description={props.description} />
        <composables.Breadcrumb segments={props.segments} />
        <composables.Header
          title={props.title}
          description={props.description}
        />
      </main>
    ),
  },
});

export const Users = createResourceLayout({
  resource: 'users',
  name: 'Users',
  title: 'Users',
  description: 'Manage users',
  segments: {
    users: 'Users',
  },
});
```

The preset's props show up in `props.include`, so the page that creates `Users`
supplies `title`, `description` and `segments` once.

Each preset package also exports its contract from a `/contract` entry point,
for use with `extend` (below). `@jfdevelops/react-layout-composable-breadcrumb`
is an older package that re-exports `createBreadcrumbComposable`. New code should
import it from the navigation package.

### Presets that share a prop

Presets in one layout that declare the same prop receive the same page value, so
they must share one definition. Header and Meta both use `title` and
`description`, which is why the example above supplies them once. Two different
definitions for one prop throw `ConflictingPresetPropError` when the layout is
created.

## Rename and extend

Added in 3.2.0.

Every factory made by `defineComposableComponent` accepts `rename` and has
`extend`.

- `rename` gives a default prop a new name (`{ items: 'steps' }`), or a new name
  and definition (`{ title: { name: 'heading', schema } }`).
- `extend` derives a new factory with its own `name`, props or wrapper.

An invalid rename throws `InvalidPropRenameError`.

```tsx
import { reactNode } from '@jfdevelops/react-layout-adapter-zod';
import { createHeaderComposable } from '@jfdevelops/react-layout-composable-copy';
import { createNavigationComposable } from '@jfdevelops/react-layout-composable-navigation/contract';

export const createStepsComposable = createNavigationComposable.extend({
  name: 'Steps',
  rename: {
    items: 'steps',
  },
});

export const header = createHeaderComposable({
  rename: {
    title: {
      name: 'heading',
      schema: reactNode(),
    },
  },
  render: ({ heading }) => <h1>{heading}</h1>,
});

const itemsSchema = createNavigationComposable.getSchema('items');
const hrefSchema = createNavigationComposable.getSchema('items.[string].href');

export type NavigationItems = typeof itemsSchema.infer;
export type Href = typeof hrefSchema.infer;
```

## Take a type from a definition

Added in 3.3.0.

`getSchema(path)` returns the definition at a path that starts with a prop name.
`infer` on the result is the value type. Inside definitions built from the
built-in validators the path goes deeper: an object key is a segment, `[string]`
is any key of a record, and `[number]` is any item of an array. The editor
suggests the next segment after each dot.

- `infer` exists only in types and is `undefined` at runtime.
- A factory also holds its definitions under its name, for example
  `createNavigationComposable.Navigation.props`. For names that collide with
  factory methods or function properties, use `factory.props` or
  `factory.getSchema` instead.
- Paths stop at external schemas and custom validator functions, because
  Standard Schema exposes validation but not child definitions. Those leaves can
  still be fetched and validated whole.

## Define your own composable

Validator functions as props and `defineContext` arrived in 3.2.0.

`defineComposableComponent` takes a `name` and `props`. A prop is a Standard
Schema or a validator function, so a composable needs no schema library. A
validator receives `{ value, error }`, returns the validated value (its return
type is the prop type), and rejects with `throw error('Expected text')`, which
creates a `PropValidatorError`. `createPropValidator` makes one reusable.

```tsx
import {
  createPropValidator,
  defineComposableComponent,
} from '@jfdevelops/react-layout';

const text = createPropValidator(({ value, error }) => {
  if (typeof value !== 'string') {
    throw error('Expected text');
  }

  return value;
});

export const createNoticeComposable = defineComposableComponent({
  name: 'Notice',
  props: {
    title: text,
    description: text.optional(),
    isDismissible: ({ value }) => value === true,
  },
});
```

The thrown error becomes the `cause` of the `PropError` that reports the value.
`props` accepts the same shape as `props.custom`, including
`children: 'required'`; a string on any other prop throws
`InvalidComposablePropsError`.

When a definition depends on values a caller may change, use
`defineComposableComponent.defineContext({ ... }).handler(...)`. Each context
entry has a default `value` and an optional `handler` deciding how a supplied
value is applied. A caller passes a value, or a function of the default, beside
the other options: `createNotice({ tones: (defaults) => [...defaults, 'loud'], render })`.

## Composables on bound pages

A page bound with `asHOF()` exposes `makeComposable` when the layout defines
composables. See [Route components and renderers](./route-components.md).

## Next steps

- [Props and validation](./props-and-validation.md)
- [Develop and debug](./develop-and-debug.md) shows composables in the inspector
- [API reference](../reference/api.md#composable-exports)

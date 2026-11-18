---
title: Reusable helpers
description: Write typed helper functions that share your layout's option schemas, resources and validation.
order: 80
---

`createReusable` turns the options and resources of a defined layout into an
ordinary typed function. The function validates its inputs before your code runs,
so a helper such as "build a repository URL" uses the same schemas as the pages.

In this guide you will:

- create a helper from option schemas
- select, transform and require inputs
- resolve collisions between selections

## Create a helper

`createReusable` is returned by `createDefinedResourceLayout`. Choose inputs with
`props.include` and add your own with `props.custom`.

```ts example=v4/reusable-helper.ts
import { z } from 'zod';
import { createDefinedResourceLayout } from '@jfdevelops/react-layout';

const { createReusable } = createDefinedResourceLayout({
  resources: ['panedeck', 'material-ui-helper', 'jfdevelops'],
  options: {
    meta: z.object({
      owner: z.string(),
      repo: z.string(),
    }),
  },
});

export const createUrl = createReusable({
  props: {
    include: {
      options: {
        meta: true,
      },
    },
    custom: {
      protocol: z.enum(['https', 'http']),
    },
  },
  fn: ({ meta, protocol }) =>
    `${protocol}://github.com/${meta.owner}/${meta.repo}`,
});

export const url = createUrl({
  meta: {
    owner: 'jfdevelops',
    repo: 'react-layout',
  },
  protocol: 'https',
});
```

The return type is inferred, including promises. A helper with no required input
can be called with no arguments.

## Choose inputs

`include` suggests `resources` and, when defined, `options`.

| Selection                          | Effect                                                              |
| ---------------------------------- | ------------------------------------------------------------------- |
| `options: { meta: true }`          | `meta` becomes a direct argument.                                   |
| `options: true`                    | All option definitions become arguments.                            |
| `options: { meta: { owner: true } }` | Accept `{ meta: { owner: string } }`. Drill into object definitions. |
| `resources: true`                  | Accept a `resources` array of configured resource keys.             |
| a function                         | A selector that supplies its result automatically.                  |

Union definitions are selected whole so their discriminants survive. Optional
definitions stay optional. Custom definitions must use different names from
selected props. Render-state `props` contracts do not add inputs: each helper
declares its own.

## Transform with selectors

Top-level `select` supplies more data to the same `fn` argument. Both `select` and
`props.include` accept selector functions. Option selectors receive resolved
values. Resource selectors receive the complete accessor with `raw`, `pick`,
`omit` and `isResource`.

```ts
const describeResource = createReusable({
  props: {
    include: { options: { meta: { owner: (owner) => owner.toUpperCase() } } },
    custom: { title: z.string() },
  },
  select: {
    resources: (resources) => resources.raw(),
    options: { meta: { repo: true } },
  },
  fn: ({ title, resources, meta }) => ({
    title,
    available: resources,
    repository: `${meta.owner}/${meta.repo}`,
  }),
});
```

Selector values that are not passed directly come from the reserved `options`
field of the single call argument. Only explicitly selected source fields are
required, optional ones stay optional, and the `options` container itself does
not reach `fn`. Source values validate before any selector runs.

> **Note:** Selecting all options with `true`, or a callback over the whole
> options object, requires every required configured option. Property reads
> inside a callback are not inferred as dependencies.

## Require one resource

`resources.single()` inside a resource selector makes the caller pass exactly one
configured resource key, validated against your resource paths. Nested paths such
as `'posts.comments.replies'` are valid, and so are parent paths.

```ts
const describeOneResource = createReusable({
  props: { include: { resources: (resources) => resources.single() } },
  fn: ({ resources }) => resources,
});

describeOneResource({ resources: 'panedeck' });
```

You can also return the same descriptor from `select.resources`.

## Resolve collisions

- Identical source selections, including the same callback reference, resolve once.
- Different fields of one selected object merge recursively.
- Identical `true` option selections shared by `include` and `select` use the
  `options` field once.
- An ambiguous collision raises a configuration error, even if the types match.
  Rename a property, or set `overlap: 'preferProps'` or `overlap: 'preferSelect'`.
  Both input contracts stay validated, and the losing option transformation does
  not run.

Selectors run on every call, and return values (including promises) pass through
unchanged. `PropsContract`, `ReusableDefinition`, `ReusableArguments` and
`ReusableFunction` are exported types for building on helpers.

## Next steps

- [Props and validation](./props-and-validation.md)
- [Resources and layouts](./resource-layouts.md#the-resource-accessor)

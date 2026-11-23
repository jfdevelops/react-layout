---
title: Standard Schema
description: How schema libraries integrate with React Layout props and runtime validation.
order: 60
---

React Layout accepts synchronous Standard Schema v1 schemas to infer prop types and validate values at runtime. Use a compatible schema library such as Zod, Valibot, ArkType, or Effect.

## Supply schemas

Pass a whole object schema as `options`, or a map of individual schemas. Individual schemas also work in `props.custom`.

```ts
import { z } from 'zod';

const options = z.object({
  title: z.string().min(1),
  count: z.string().transform(Number),
});

const custom = {
  label: z.string().default('Items'),
};
```

Use `options` in the layout definition and `custom` under `props.custom`. A whole object schema preserves object-level refinements, defaults and transforms; its input and output must be objects. A schema map validates each field independently.

Callers supply schema input values. Render callbacks receive validated output values, so the example's `count` becomes a number. Missing values are validated as `undefined`, allowing optional schemas and defaults. `props.include` selects render props; it does not remove required inputs from an object schema.

## Describe React values

Ordinary compatible schemas work directly. The `@jfdevelops/react-layout-adapter-zod`, `-valibot`, `-arktype` and `-effect` packages add `reactNode()` and `reactElement()` for React values. Use the adapter that matches your schema library; these adapters provide React predicates, not the basic Standard Schema integration.

For Effect schemas you compose yourself, convert the result with `Schema.toStandardSchemaV1(...)`. The adapter helpers already support Standard Schema.

## Handle validation failures

Validation runs synchronously. Failed validation produces a [PropError](./errors/prop.md) with issue paths and layout/resource context. Async schemas are rejected with a [TypeError](./errors/type.md); validate async data before rendering.

The legacy `createProp` builder is unavailable; use schemas or custom prop validators.

## Next steps

- [Props and validation](./guides/props-and-validation.md)
- [Validation errors](./errors/prop.md)
- [Adapters](./plugins/adapters.md)

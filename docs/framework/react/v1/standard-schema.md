---
title: Standard Schema
description: How schema libraries integrate with React Layout props and runtime validation.
order: 60
---

Direct Standard Schema integration is unavailable in this release line. Describe props with the library's `createProp` builder.

## Describe props

```ts
import { createProp } from '@jfdevelops/react-layout';

const options = {
  title: createProp.string(),
  description: createProp.string().optional(),
};
```

Use these definitions in `options` and `props.custom`. React Layout checks supplied values at runtime and infers their TypeScript types from the definitions. Failed validation produces a [PropError](./errors/prop.md).

## Use an external schema library

Validate external data with your schema library before passing it to a layout. A Zod, Valibot, ArkType, or Effect schema cannot be passed directly as a prop definition here. The `react-layout-adapter-*` packages are not part of this release's integration.

Direct Standard Schema support was added in 2.6.0. See [Standard Schema in v2](../v2/standard-schema.md) when upgrading.

## Next steps

- [Props and validation](./guides/props-and-validation.md)
- [Validation errors](./errors/prop.md)

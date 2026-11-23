---
title: InvalidSchemaPathError
description: When InvalidSchemaPathError occurs and how to resolve it.
order: 170
---

getSchemaAtPath cannot resolve a path segment to a schema. The segment is unknown, or the current schema is opaque to the built-in schema traversal.

## Identify the error

The error code is `invalidSchemaPath`. This error belongs to the validator package and is not part of the `ReactLayoutError` hierarchy.

## Resolve the error

Inspect context.path, context.segment and context.reason. Use a supported built-in schema structure and a path it declares.

## Release scope

This page describes `@jfdevelops/react-layout@4.1.0`. The behavior is based on the error definitions and their call sites in [the tagged source](https://github.com/jfdevelops/react-layout/blob/%40jfdevelops%2Freact-layout%404.1.0/packages/validators/src/schema-path.ts).

## Next steps

- [Troubleshooting](../guides/troubleshooting.md)
- [Standard Schema](../standard-schema.md)
- [API reference](../reference/index.md)

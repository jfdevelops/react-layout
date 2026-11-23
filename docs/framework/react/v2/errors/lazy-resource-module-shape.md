---
title: LazyResourceModuleShapeError
description: When LazyResourceModuleShapeError occurs and how to resolve it.
order: 160
---

A loaded lazy module exports zero or multiple matching library-defined layouts, render states, or scoped components.

## Identify the error

The error code is `lazyResourceModuleShape`. This class belongs to the `ReactLayoutError` hierarchy.

## Resolve the error

Export exactly one matching definition. Inspect resource and received for the module label and number of matching exports.

## Release scope

This page describes `@jfdevelops/react-layout@2.7.0`. The behavior is based on the error definitions and their call sites in [the tagged source](https://github.com/jfdevelops/react-layout/blob/%40jfdevelops%2Freact-layout%402.7.0/packages/core/src/errors/lazy-resource-error.ts).

## Next steps

- [Troubleshooting](../troubleshooting.md)
- [Standard Schema](../standard-schema.md)
- [API reference](../reference/api.md)

---
title: LazyResourceStateNotFoundError
description: When LazyResourceStateNotFoundError occurs and how to resolve it.
order: 150
---

A compound state requested on a lazy proxy before loading is absent from the resolved resource component.

## Identify the error

The error code is `lazyResourceStateNotFound`. This class belongs to the `ReactLayoutError` hierarchy.

## Resolve the error

Export or define the requested state, or correct the requested member name. Inspect resource and state.

## Release scope

This page describes `@jfdevelops/react-layout@4.1.0`. The behavior is based on the error definitions and their call sites in [the tagged source](https://github.com/jfdevelops/react-layout/blob/%40jfdevelops%2Freact-layout%404.1.0/packages/core/src/errors/lazy-resource-error.ts).

## Next steps

- [Troubleshooting](../guides/troubleshooting.md)
- [Standard Schema](../standard-schema.md)
- [API reference](../reference/index.md)

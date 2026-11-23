---
title: Error
description: When Error occurs and how to resolve it.
order: 160
---

A lazy render-state module exports zero or multiple library-defined render states.

## Identify the error

This is a native JavaScript error.

## Resolve the error

Export exactly one defined render state. The message reports the number found. The loader can wrap this failure in ResourceModuleLoadError.

## Release scope

This page describes `@jfdevelops/react-layout@1.6.1`. The behavior is based on the error definitions and their call sites in [the tagged source](https://github.com/jfdevelops/react-layout/blob/%40jfdevelops%2Freact-layout%401.6.1/packages/core/src/create-config/render-state.ts).

## Next steps

- [Troubleshooting](../troubleshooting.md)
- [Standard Schema](../standard-schema.md)
- [API reference](../reference/api.md)

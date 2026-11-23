---
title: ResourceRenderError
description: When ResourceRenderError occurs and how to resolve it.
order: 100
---

A resource render-state boundary catches an exception while rendering a named state. It wraps the original exception unless it is already a ResourceModuleLoadError or ResourceRenderError.

## Identify the error

The error code is `resourceRender`. This class extends native `Error`, independently of `ReactLayoutError`.

## Resolve the error

Inspect resource, state and cause, then correct the failing render logic. A configured resource Error state can receive this wrapper.

## Release scope

This page describes `@jfdevelops/react-layout@0.25.0`. Earlier 0.x releases can differ. The behavior is based on the error definitions and their call sites in [the tagged source](https://github.com/jfdevelops/react-layout/blob/%40jfdevelops%2Freact-layout%400.25.0/packages/core/src/errors/resource-state-error.ts).

## Next steps

- [Final snapshot](../final-snapshot.md)
- [Standard Schema](../standard-schema.md)
- [API reference](../reference/api.md)

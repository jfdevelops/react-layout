---
title: ResourceRenderError
description: When ResourceRenderError occurs and how to resolve it.
order: 120
---

A resource render-state boundary catches an exception while rendering a named state. It wraps the original exception unless it is already a ResourceModuleLoadError or ResourceRenderError.

## Identify the error

The error code is `resourceRender`. This class extends native `Error`, independently of `ReactLayoutError`.

## Separate resource and lazy fallbacks

A resource render-state boundary can wrap render exceptions. A lazy `Error` fallback handles loading, module shape, and missing lazy state failures only; it does not catch arbitrary render exceptions. Use an outer React error boundary for those exceptions.

## Resolve the error

Inspect resource, state and cause, then correct the failing render logic. A configured resource Error state can receive this wrapper.

## Release scope

This page describes `@jfdevelops/react-layout@3.3.0`. The behavior is based on the error definitions and their call sites in [the tagged source](https://github.com/jfdevelops/react-layout/blob/%40jfdevelops%2Freact-layout%403.3.0/packages/core/src/errors/resource-state-error.ts).

## Next steps

- [Troubleshooting](../troubleshooting.md)
- [Standard Schema](../standard-schema.md)
- [API reference](../reference/api.md)

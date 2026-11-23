---
title: ResourceModuleLoadError
description: When ResourceModuleLoadError occurs and how to resolve it.
order: 110
---

A lazy resource layout, render state, or scoped component loader rejects. The original failure is retained as cause.

## Identify the error

The error code is `resourceModuleLoad`. This class extends native `Error`, independently of `ReactLayoutError`.

## Resolve the error

Inspect cause for the import, network, or module evaluation failure. Correct the module or retry through the configured lazy error fallback.

## Release scope

This page describes `@jfdevelops/react-layout@3.3.0`. The behavior is based on the error definitions and their call sites in [the tagged source](https://github.com/jfdevelops/react-layout/blob/%40jfdevelops%2Freact-layout%403.3.0/packages/core/src/errors/resource-state-error.ts).

## Next steps

- [Troubleshooting](../troubleshooting.md)
- [Standard Schema](../standard-schema.md)
- [API reference](../reference/api.md)

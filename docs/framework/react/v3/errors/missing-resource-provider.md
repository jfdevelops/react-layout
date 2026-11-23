---
title: MissingResourceProviderError
description: When MissingResourceProviderError occurs and how to resolve it.
order: 70
---

useResource runs outside the ResourceProvider associated with its layout definition.

## Identify the error

The error code is `missingResourceProvider`. This class belongs to the `ReactLayoutError` hierarchy.

## Resolve the error

Render the consumer under a created layout or that definition’s ResourceProvider.

## Release scope

This page describes `@jfdevelops/react-layout@3.3.0`. The behavior is based on the error definitions and their call sites in [the tagged source](https://github.com/jfdevelops/react-layout/blob/%40jfdevelops%2Freact-layout%403.3.0/packages/core/src/errors/missing-resource-provider.ts).

## Next steps

- [Troubleshooting](../troubleshooting.md)
- [Standard Schema](../standard-schema.md)
- [API reference](../reference/api.md)

---
title: InvalidWrapperError
description: When InvalidWrapperError occurs and how to resolve it.
order: 150
---

The legacy primitive prop wrapper builder receives a wrapper kind other than literal or enum.

## Identify the error

The error code is `invalidWrapper`. This error belongs to the validator package and is not part of the `ReactLayoutError` hierarchy.

## Resolve the error

Use the public createProp literal or enum methods. This guard generally indicates an invalid JavaScript call that bypassed the typed API.

## Release scope

This page describes `@jfdevelops/react-layout@1.6.1`. The behavior is based on the error definitions and their call sites in [the tagged source](https://github.com/jfdevelops/react-layout/blob/%40jfdevelops%2Freact-layout%401.6.1/packages/validators/src/errors.ts).

## Next steps

- [Troubleshooting](../troubleshooting.md)
- [Standard Schema](../standard-schema.md)
- [API reference](../reference/api.md)

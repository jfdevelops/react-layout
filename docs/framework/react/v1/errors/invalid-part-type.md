---
title: InvalidPartTypeError
description: When InvalidPartTypeError occurs and how to resolve it.
order: 90
---

A naming part receives a value of the wrong declared kind (string or number).

## Identify the error

The error code is `invalidPartType`. This class belongs to the `ReactLayoutError` hierarchy.

## Resolve the error

Supply the expected value type; inspect context.expectedType and context.receivedType.

## Release scope

This page describes `@jfdevelops/react-layout@1.6.1`. The behavior is based on the error definitions and their call sites in [the tagged source](https://github.com/jfdevelops/react-layout/blob/%40jfdevelops%2Freact-layout%401.6.1/packages/core/src/errors/invalid-part-type.ts).

## Next steps

- [Troubleshooting](../troubleshooting.md)
- [Standard Schema](../standard-schema.md)
- [API reference](../reference/api.md)

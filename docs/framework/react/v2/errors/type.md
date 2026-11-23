---
title: TypeError
description: When TypeError occurs and how to resolve it.
order: 180
---

A runtime argument or schema violates a contract that is checked with a native TypeError.

## Identify the error

This is a native JavaScript error.

## Checked contracts

- An options object schema must produce a non-null object, not an array.
- Standard Schema validation must complete synchronously; promise results are rejected.

## Resolve the error

Correct the input identified by the message. These errors are not ReactLayoutError instances.

## Release scope

This page describes `@jfdevelops/react-layout@2.7.0`. The behavior is based on the error definitions and their call sites in [the tagged source](https://github.com/jfdevelops/react-layout/tree/%40jfdevelops%2Freact-layout%402.7.0/packages/core/src).

## Next steps

- [Troubleshooting](../troubleshooting.md)
- [Standard Schema](../standard-schema.md)
- [API reference](../reference/api.md)

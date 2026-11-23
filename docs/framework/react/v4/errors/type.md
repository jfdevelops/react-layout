---
title: TypeError
description: When TypeError occurs and how to resolve it.
order: 160
---

A runtime argument or schema violates a contract that is checked with a native TypeError.

## Identify the error

This is a native JavaScript error.

## Checked contracts

- An options object schema must produce a non-null object, not an array.
- Standard Schema validation must complete synchronously; promise results are rejected.
- Custom path parameter names must not conflict with reserved or included names.
- Renderer factory options, props and params must be objects.
- The renderer factory `component` value must be a string component key or `"*"`, and requires included component keys.
- A renderer factory component key belongs in `component`, not `params.componentKey`.

A synchronous union also rejects an asynchronous member schema with a `TypeError`.

## Resolve the error

Correct the input identified by the message. These errors are not ReactLayoutError instances.

## Release scope

This page describes `@jfdevelops/react-layout@4.1.0`. The behavior is based on the error definitions and their call sites in [the tagged source](https://github.com/jfdevelops/react-layout/tree/%40jfdevelops%2Freact-layout%404.1.0/packages/core/src).

## Next steps

- [Troubleshooting](../guides/troubleshooting.md)
- [Standard Schema](../standard-schema.md)
- [API reference](../reference/index.md)

---
title: PropValidatorError
description: When PropValidatorError occurs and how to resolve it.
order: 180
---

A custom prop validator calls and throws its error helper to reject a value.

## Identify the error

The error code is `invalidPropValue`. This error belongs to the validator package and is not part of the `ReactLayoutError` hierarchy.

## Resolve the error

Use the validator message to correct the input. The validator catches this error and turns it into an issue; validation exposes it as the cause of a PropError.

## Release scope

This page describes `@jfdevelops/react-layout@3.3.0`. The behavior is based on the error definitions and their call sites in [the tagged source](https://github.com/jfdevelops/react-layout/blob/%40jfdevelops%2Freact-layout%403.3.0/packages/validators/src/prop-validator-error.ts).

## Next steps

- [Troubleshooting](../troubleshooting.md)
- [Standard Schema](../standard-schema.md)
- [API reference](../reference/api.md)

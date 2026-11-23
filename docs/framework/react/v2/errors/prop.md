---
title: PropError
description: When PropError occurs and how to resolve it.
order: 130
---

A required prop is missing or a supplied prop fails its definition during runtime validation.

## Identify the error

The error code is `invalidProp`. This error belongs to the validator package and is not part of the `ReactLayoutError` hierarchy.

## Read schema issues

For Standard Schema definitions, `issues` retains the validation issues and their paths. Callers supply schema input values; validation returns parsed output values to the render callback. Async validation is a `TypeError`, not a normal validation issue.

## Resolve the error

Inspect path, layoutName, resource, received and expected to locate the invalid value. Correct the input or its definition.

## Release scope

This page describes `@jfdevelops/react-layout@2.7.0`. The behavior is based on the error definitions and their call sites in [the tagged source](https://github.com/jfdevelops/react-layout/blob/%40jfdevelops%2Freact-layout%402.7.0/packages/validators/src/prop-error.ts).

## Next steps

- [Troubleshooting](../troubleshooting.md)
- [Standard Schema](../standard-schema.md)
- [API reference](../reference/api.md)

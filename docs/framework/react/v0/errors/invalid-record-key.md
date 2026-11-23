---
title: InvalidRecordKeyError
description: When InvalidRecordKeyError occurs and how to resolve it.
order: 120
---

A legacy record prop has a key definition and a supplied key fails that definition.

## Identify the error

The error code is `invalidRecordKey`. This error belongs to the validator package and is not part of the `ReactLayoutError` hierarchy.

## Resolve the error

Correct the record key or change the key definition. This validator error can be reported through an enclosing PropError.

## Release scope

This page describes `@jfdevelops/react-layout@0.25.0`. Earlier 0.x releases can differ. The behavior is based on the error definitions and their call sites in [the tagged source](https://github.com/jfdevelops/react-layout/blob/%40jfdevelops%2Freact-layout%400.25.0/packages/validators/src/errors.ts).

## Next steps

- [Final snapshot](../final-snapshot.md)
- [Standard Schema](../standard-schema.md)
- [API reference](../reference/api.md)

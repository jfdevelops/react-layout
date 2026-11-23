---
title: InvalidPathError
description: When InvalidPathError occurs and how to resolve it.
order: 20
---

A lookup or path builder receives an unavailable path, a malformed segment, or a path that does not resolve to a configured component.

## Identify the error

The error code is `invalidPath`. This class belongs to the `ReactLayoutError` hierarchy.

## Resolve the error

Use a declared path; check the error context for the available paths and reason.

## Release scope

This page describes `@jfdevelops/react-layout@4.1.0`. The behavior is based on the error definitions and their call sites in [the tagged source](https://github.com/jfdevelops/react-layout/blob/%40jfdevelops%2Freact-layout%404.1.0/packages/core/src/errors/invalid-path.ts).

## Next steps

- [Troubleshooting](../guides/troubleshooting.md)
- [Standard Schema](../standard-schema.md)
- [API reference](../reference/index.md)

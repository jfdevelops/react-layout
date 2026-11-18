# @jfdevelops/react-layout-internals

## 0.1.0

### Minor Changes

- 8fbd52f: Support typed display-name path mappings, segment helpers, and literal-preserving path.create(...parts). Add path.capitalize({ join }) with independent delimiter removal and segment capitalization flags or a typed custom join callback, while retaining both callback and mapping display names. Share string concatenation types and runtime implementation through internals.

## 0.0.1

### Patch Changes

- d542d5a: Restore the internals package's version metadata so pnpm can resolve `workspace:*` references while packing core and composables. Track future internal versions and tags through Changesets while keeping the package private and unpublished.

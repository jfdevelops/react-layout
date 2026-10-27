---
"@jfdevelops/react-layout": minor
---

Allow layout names to be omitted and derive an exact resource-based name when no naming default is configured. Preserve factory, definition, and component overrides across direct creation, scoped builders, and namespaces.

Use distinct placeholder types for naming parts and resource tokens, so literal text and supplied part values cannot be mistaken for substitution markers.

Add defineLayoutName.defineParts(...names).namingFn(pattern) and schema-based string/number parts. Restore IntelliSense for supplying default and custom parts, including callback returns, while retaining literal component names.

Reflect omitted numeric parts as empty text in the pattern input type, requiring narrowing before number-only operations while preserving exact names for interpolated values.

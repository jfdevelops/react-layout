---
'@jfdevelops/react-layout-validator': minor
---

Add `builtIn.union(...schemas)`, which accepts a value matching any of its schemas. When none matches, a schema that accepted the kind of value reports its nested issues; otherwise one issue lists what was expected, such as `Expected a string or an object`.

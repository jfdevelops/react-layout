---
'@jfdevelops/react-layout-validator': minor
---

Add `builtIn` validators that need no schema library: `string`, `number`, `boolean`, `unknown`, `callable`, `literal(...values)`, `array(item)`, `tuple(...items)`, `record(item)` and `object(shape)`. Each is a Standard Schema with `.optional()`. The validator package now validates its error contexts with them and no longer depends on arktype.

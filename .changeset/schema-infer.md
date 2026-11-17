---
'@jfdevelops/react-layout-validator': minor
---

A built-in validator, and any schema made with `createPropValidator`, reads its value type as `typeof schema.infer`. `infer` exists only in types and is `undefined` at runtime. `InferableSchema<Value>` is a Standard Schema with that property.

---
'@jfdevelops/react-layout-validator': minor
---

Add `getSchemaAtPath(schema, path)`, which returns the schema at a path inside a built-in validator: object keys, `[string]` for any record key, `[number]` for any array item and indexes for tuple items, through optional schemas and union members. `SchemaPath<Value>` lists the paths and `SchemaPathValue<Value, Path>` is the value type at one. A path that does not exist, or that enters a schema from another library, throws `InvalidSchemaPathError`.

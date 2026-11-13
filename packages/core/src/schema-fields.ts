import { isStandardSchema, type StandardSchemaV1 } from '@jfdevelops/react-layout-validator';
import { optionalDefinition } from './built-in-props';

type Fields = Record<string, StandardSchemaV1>;

function record(value: unknown): Record<string, unknown> | undefined {
  return (typeof value === 'object' || typeof value === 'function') && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function schemaFields(candidate: unknown): Fields | undefined {
  const entries = record(candidate);

  if (!entries) {
    return undefined;
  }
  const fields: Fields = {};

  for (const [key, value] of Object.entries(entries)) {
    if (!isStandardSchema(value)) {
      return undefined;
    }
    fields[key] = value;
  }

  return fields;
}

function arktypeProps(
  schema: Record<string, unknown>,
): ReadonlyArray<Record<string, unknown>> | undefined {
  if (schema['~standard'] === undefined || typeof schema.expression !== 'string') {
    return undefined;
  }

  try {
    return Array.isArray(schema.props) ? schema.props : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Reads the field schemas of an object schema. Standard Schema does not
 * describe an object's fields, so this looks at the shapes Zod, Valibot, and
 * ArkType expose, unwrapping an optional wrapper first. It returns `undefined`
 * for any other schema; callers then treat the fields as unvalidated parts of
 * a value the whole schema still validates.
 */
export function fieldDefinitions(definition: unknown): Fields | undefined {
  const schema = record(definition);

  if (!schema || !isStandardSchema(definition)) {
    return undefined;
  }

  // Zod: `z.object({...})`, optionally wrapped by `.optional()` and similar.
  const zod = record(record(schema._zod)?.def);

  if (zod) {
    if (zod.type === 'object') {
      return schemaFields(schema.shape);
    }

    return zod.innerType === undefined ? undefined : fieldDefinitions(zod.innerType);
  }

  // Valibot: `v.object({...})`, optionally wrapped by `v.optional(...)`.
  if (schema.kind === 'schema' && typeof schema.type === 'string') {
    if (schema.type === 'object' || schema.type === 'strict_object') {
      return schemaFields(schema.entries);
    }

    return schema.wrapped === undefined ? undefined : fieldDefinitions(schema.wrapped);
  }

  // ArkType: `type({...})` lists its keys as `props`. Reading `props` throws
  // for a type that is not a single object, such as a union.
  const arkProps = arktypeProps(schema);

  if (arkProps && arkProps.length > 0) {
    const fields: Fields = {};

    for (const prop of arkProps) {
      if (typeof prop.key !== 'string' || !isStandardSchema(prop.value)) {
        return undefined;
      }
      fields[prop.key] = prop.kind === 'optional' ? optionalDefinition(prop.value) : prop.value;
    }

    return fields;
  }

  return undefined;
}

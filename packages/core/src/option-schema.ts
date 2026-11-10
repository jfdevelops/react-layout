import {
  isStandardSchema,
  validateProps,
  type AnyBuiltPropDefinition,
  type StandardSchemaV1,
} from '@jfdevelops/react-layout-validator';

export type OptionSchema = StandardSchemaV1<object, object>;

type Property<Value, Key extends PropertyKey> = Key extends keyof Value ? Value[Key] : undefined;

export type SchemaOptionDefinitions<Schema extends OptionSchema> = {
  [Key in keyof StandardSchemaV1.InferInput<Schema> | keyof StandardSchemaV1.InferOutput<Schema>]-?:
    StandardSchemaV1<
      Property<StandardSchemaV1.InferInput<Schema>, Key>,
      Property<StandardSchemaV1.InferOutput<Schema>, Key>
    >;
};

/** Field definitions refer to output already validated by the whole option schema. */
export function schemaOptionDefinitions(schema: OptionSchema, keys: Iterable<string> = []) {
  const definitions = Object.create(null) as Record<string, AnyBuiltPropDefinition>;
  function field(key: string) {
    return definitions[key] ??= {
      '~standard': {
        version: 1,
        vendor: schema['~standard'].vendor,
        validate: (value) => ({ value }),
      },
    };
  }
  for (const key of keys) field(key);
  return new Proxy(definitions, {
    get(target, key) {
      return typeof key === 'string' && key !== '~standard' && key !== 'then' ? field(key) : Reflect.get(target, key);
    },
    has(target, key) {
      return (typeof key === 'string' && key !== '~standard' && key !== 'then') || Reflect.has(target, key);
    },
    getOwnPropertyDescriptor(target, key) {
      if (typeof key === 'string' && key !== '~standard' && key !== 'then') field(key);
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
}

export function optionDefinitions(value: unknown, keys: Iterable<string> = []) {
  return isStandardSchema(value)
    ? schemaOptionDefinitions(value as OptionSchema, keys)
    : value as Record<string, AnyBuiltPropDefinition>;
}

export function validateOptionSchema(
  schema: OptionSchema,
  input: Record<string, unknown>,
  context?: { layoutName?: string; resource?: string },
) {
  const result = validateProps({ options: schema }, { options: input }, context).options;
  if (result === null || typeof result !== 'object' || Array.isArray(result)) {
    throw new TypeError('React Layout options schemas must produce an object.');
  }
  return result as Record<string, unknown>;
}

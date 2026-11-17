import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * A schema whose output type reads as `typeof schema.infer`, for a type
 * taken from a definition instead of written twice.
 */
export type InferableSchema<Value> = StandardSchemaV1<unknown, Value> & {
  /**
   * Types only; `undefined` at runtime. The type of a value the schema
   * accepts.
   */
  readonly infer: Value;
};

/** The prop definition created from a custom validator. */
export interface PropValidatorSchema<Value> extends StandardSchemaV1<
  Value,
  Value
> {
  /**
   * Types only; `undefined` at runtime. The type of a value the schema
   * accepts: `type Text = typeof text.infer`.
   */
  readonly infer: Value;
  /**
   * The same validator for a prop that may be left out. Every call returns
   * the same definition.
   */
  optional(): PropValidatorSchema<Value | undefined>;
}

/** Type-only identity of the children recorded by a built-in schema. */
export declare const schemaStructure: unique symbol;

/** A built-in schema that preserves its child definitions for path checking. */
export interface StructuredSchema<
  Value,
  Structure,
> extends PropValidatorSchema<Value> {
  /** Types only; the runtime structure is stored separately. */
  readonly [schemaStructure]: Structure;
  /** The same child definitions, accepting an omitted value. */
  optional(): StructuredSchema<Value | undefined, Structure>;
}

/** The result of validating one value. */
export type SchemaResult<Value> = StandardSchemaV1.Result<Value>;

/** Accepts a value. */
export function pass<Value>(value: Value): SchemaResult<Value> {
  return {
    value,
  };
}

/** A Standard Schema issue that keeps the error it was created from. */
export type SchemaIssue = StandardSchemaV1.Issue & {
  /**
   * The error a validator threw to reject the value.
   */
  cause?: unknown;
};

/**
 * Rejects a value with one message. `cause` is the error behind it, which
 * becomes the `cause` of the `PropError` reporting the value.
 */
export function fail(message: string, cause?: unknown): SchemaResult<never> {
  const issue: SchemaIssue =
    cause === undefined
      ? {
          message,
        }
      : {
          message,
          cause,
        };

  return {
    issues: [issue],
  };
}

/** The native error options that carry an issue's cause, if it has one. */
export function getIssueErrorOptions(
  issue: SchemaIssue | undefined,
): ErrorOptions | undefined {
  return issue?.cause === undefined
    ? undefined
    : {
        cause: issue.cause,
      };
}

/** How a built-in schema is made of other schemas. */
export type SchemaStructure =
  | {
      kind: 'object';
      shape: Readonly<Record<string, StandardSchemaV1>>;
    }
  | {
      kind: 'record' | 'array';
      item: StandardSchemaV1;
    }
  | {
      kind: 'tuple' | 'union';
      items: ReadonlyArray<StandardSchemaV1>;
    }
  | {
      kind: 'optional';
      inner: StandardSchemaV1;
    };

// Kept apart from the schema objects so they stay plain Standard Schemas.
const schemaStructures = new WeakMap<object, SchemaStructure>();

/** The schemas a built-in schema is made of, if it is made of any. */
export function getSchemaStructure(schema: StandardSchemaV1) {
  return schemaStructures.get(schema);
}

/**
 * Creates a synchronous Standard Schema from a function that returns a
 * result. It depends on nothing else in the library, so the library's own
 * errors can validate their contexts with it. `structure` records the
 * schemas it is made of, so a path can be followed into it.
 */
export function createSchema<Value, const Structure extends SchemaStructure>(
  validate: (value: unknown) => SchemaResult<Value>,
  structure: Structure,
): StructuredSchema<Value, Structure>;

export function createSchema<Value>(
  validate: (value: unknown) => SchemaResult<Value>,
): PropValidatorSchema<Value>;

export function createSchema<Value>(
  validate: (value: unknown) => SchemaResult<Value>,
  structure?: SchemaStructure,
): PropValidatorSchema<Value> {
  let optionalSchema: PropValidatorSchema<Value | undefined> | undefined;

  // `infer` is left out: it only carries a type.
  const schema = {
    '~standard': {
      version: 1,
      vendor: 'react-layout',
      validate,
    },
    optional() {
      optionalSchema ??= createSchema(
        (value) => (value === undefined ? pass(undefined) : validate(value)),
        {
          kind: 'optional',
          inner: schema,
        },
      );

      return optionalSchema;
    },
  } as PropValidatorSchema<Value>;

  if (structure) {
    schemaStructures.set(schema, structure);
  }

  return schema;
}

/** Validates a nested value and places its issues under `key`. */
export function validateNested<Value>(
  schema: StandardSchemaV1<unknown, Value>,
  value: unknown,
  key: PropertyKey,
): SchemaResult<Value> {
  const result = schema['~standard'].validate(value);

  if (result instanceof Promise) {
    // Handle rejected async refinements without leaking an unhandled rejection.
    void result.catch(() => {});

    throw new TypeError('React Layout schemas must validate synchronously.');
  }

  if (!result.issues) {
    return result;
  }

  return {
    issues: result.issues.map((issue) => ({
      ...issue,
      path: [key, ...(issue.path ?? [])],
    })),
  };
}

/** Whether a value is a plain record rather than an array or `null`. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

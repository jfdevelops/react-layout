import type { StandardSchemaV1 } from '@standard-schema/spec';
import { createSchema, fail, isRecord, pass, validateNested } from '../schema';

type Shape = Record<string, StandardSchemaV1>;

// A key may be left out when its schema accepts `undefined`. `unknown`
// accepts everything, so it is not read as optional.
type OptionalKey<Schemas extends Shape, Key extends keyof Schemas> =
  unknown extends StandardSchemaV1.InferOutput<Schemas[Key]>
    ? never
    : undefined extends StandardSchemaV1.InferOutput<Schemas[Key]>
      ? Key
      : never;

type OptionalKeys<Schemas extends Shape> = {
  [Key in keyof Schemas]: OptionalKey<Schemas, Key>;
}[keyof Schemas];

/** The value an {@link object} schema accepts for a shape. */
export type ObjectValue<Schemas extends Shape> = {
  [
    Key in Exclude<keyof Schemas, OptionalKeys<Schemas>>
  ]: StandardSchemaV1.InferOutput<Schemas[Key]>;
} & {
  [Key in OptionalKeys<Schemas>]?: StandardSchemaV1.InferOutput<Schemas[Key]>;
} extends infer Value
  ? {
      [Key in keyof Value]: Value[Key];
    }
  : never;

/**
 * Accepts an object whose listed keys match their schemas. A key whose schema
 * accepts `undefined` may be left out, and keys that are not listed are kept.
 */
export function object<const Schemas extends Shape>(shape: Schemas) {
  return createSchema((value) => {
    if (!isRecord(value)) {
      return fail('Expected an object');
    }

    const entries: Record<string, unknown> = {
      ...value,
    };
    const issues: StandardSchemaV1.Issue[] = [];

    for (const key of Object.keys(shape)) {
      const result = validateNested(shape[key]!, value[key], key);

      if (result.issues) {
        issues.push(...result.issues);
      } else if (key in value || result.value !== undefined) {
        entries[key] = result.value;
      }
    }

    return issues.length > 0
      ? {
          issues,
        }
      : pass(entries as ObjectValue<Schemas>);
  });
}

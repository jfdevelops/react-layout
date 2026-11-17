import type { StandardSchemaV1 } from '@standard-schema/spec';

import { literal, object, string } from './built-in';
import { validatorErrorFactory } from './errors';
import { getSchemaStructure, type InferableSchema } from './schema';

/** The path segment for any key of a record. */
export type RecordSegment = '[string]';

/** The path segment for any item of an array. */
export type ArraySegment = '[number]';

// The value under each segment that leads out of `Value`.
type Segments<Value> =
  Value extends ReadonlyArray<unknown>
    ? number extends Value['length']
      ? {
          [Segment in ArraySegment]: Value[number];
        }
      : {
          [
            Key in keyof Value as Key extends `${number}` ? Key : never
          ]: Value[Key];
        }
    : Value extends (...input: never[]) => unknown
      ? {}
      : Value extends object
        ? string extends keyof Value
          ? {
              [Segment in RecordSegment]: Value[string];
            }
          : {
              [
                Key in keyof Value as Key extends string ? Key : never
              ]: Value[Key];
            }
        : {};

type SegmentOf<Value> = keyof Segments<Value> & string;

// Deep enough for nested props; it also stops recursive types.
type MaxDepth = 5;

/**
 * Every path into a value of type `Value`, as dot-separated segments. An
 * object key is its own segment, `[string]` is any key of a record,
 * `[number]` any item of an array, and a tuple item is its index.
 */
export type SchemaPath<
  Value,
  Depth extends unknown[] = [],
> = Depth['length'] extends MaxDepth
  ? never
  : // `null` and `undefined` lead nowhere, so a path goes through an optional value.
    NonNullable<Value> extends infer Present
    ? Present extends unknown
      ? {
          [Segment in SegmentOf<Present>]:
            | Segment
            | `${Segment}.${SchemaPath<Segments<Present>[Segment], [...Depth, unknown]>}`;
        }[SegmentOf<Present>]
      : never
    : never;

/** The type of the value at `Path` in a value of type `Value`. */
export type SchemaPathValue<Value, Path extends string> =
  NonNullable<Value> extends infer Present
    ? Present extends unknown
      ? Path extends `${infer Segment}.${infer Rest}`
        ? Segment extends SegmentOf<Present>
          ? SchemaPathValue<Segments<Present>[Segment], Rest>
          : never
        : Path extends SegmentOf<Present>
          ? Segments<Present>[Path]
          : never
      : never
    : never;

const invalidSchemaPathContext = object({
  path: string,
  segment: string,
  reason: literal('unknown', 'opaque'),
});

export type InvalidSchemaPathContext = StandardSchemaV1.InferOutput<
  typeof invalidSchemaPathContext
>;

const invalidSchemaPathReasons = {
  unknown: 'does not exist',
  opaque:
    'cannot be followed: only built-in validators expose the schemas they are made of',
} satisfies Record<InvalidSchemaPathContext['reason'], string>;

/** Thrown when a schema path does not lead to a schema. */
export class InvalidSchemaPathError extends validatorErrorFactory({
  code: 'invalidSchemaPath',
})
  .defineContext(invalidSchemaPathContext)
  .implement(
    ({ path, segment, reason }) =>
      `Schema path "${path}" is invalid: segment "${segment}" ${invalidSchemaPathReasons[reason]}.`,
  ) {}

function isIndex(segment: string) {
  return /^(0|[1-9]\d*)$/.test(segment);
}

// The schema one segment into `schema`, or `undefined` when there is none.
function getChildSchema(
  schema: StandardSchemaV1,
  segment: string,
): StandardSchemaV1 | undefined {
  const structure = getSchemaStructure(schema);

  switch (structure?.kind) {
    case 'object':
      return Object.hasOwn(structure.shape, segment)
        ? structure.shape[segment]
        : undefined;
    case 'record':
      return segment === '[string]' ? structure.item : undefined;
    case 'array':
      return segment === '[number]' ? structure.item : undefined;
    case 'tuple':
      return isIndex(segment) ? structure.items[Number(segment)] : undefined;
    case 'union':
      // The first member the segment leads into.
      for (const member of structure.items) {
        const child = getChildSchema(member, segment);

        if (child) {
          return child;
        }
      }

      return undefined;
    case 'optional':
      return getChildSchema(structure.inner, segment);
    default:
      return undefined;
  }
}

/**
 * Follows `path` into a built-in schema and returns the schema there. The
 * path's segments are the ones {@link SchemaPath} lists.
 */
export function getSchemaAtPath<Value, const Path extends SchemaPath<Value>>(
  schema: StandardSchemaV1<unknown, Value>,
  path: Path,
): InferableSchema<SchemaPathValue<Value, Path>>;

export function getSchemaAtPath(
  schema: StandardSchemaV1,
  path: string,
): StandardSchemaV1 {
  let current = schema;

  for (const segment of path.split('.')) {
    const child = getChildSchema(current, segment);

    if (!child) {
      throw new InvalidSchemaPathError({
        path,
        segment,
        reason: getSchemaStructure(current) ? 'unknown' : 'opaque',
      });
    }

    current = child;
  }

  return current;
}

import type { StandardSchemaV1 } from '@standard-schema/spec';

import { literal, object, string, union } from './built-in';
import { validatorErrorFactory } from './errors';
import {
  getSchemaStructure,
  type InferableSchema,
  type StructuredSchema,
} from './schema';

/** The path segment for any key of a record. */
export type RecordSegment = '[string]';

/** The path segment for any item of an array. */
export type ArraySegment = '[number]';

// Only recorded children are traversable; an output type alone cannot describe
// how a validator was constructed.
type Children<Schema> =
  Schema extends StructuredSchema<unknown, infer Structure>
    ? Structure extends { kind: 'object'; shape: infer Shape }
      ? Shape
      : Structure extends { kind: 'array'; item: infer Item }
        ? { '[number]': Item }
        : Structure extends { kind: 'record'; item: infer Item }
          ? { '[string]': Item }
          : Structure extends { kind: 'tuple'; items: infer Items }
            ? {
                [
                  Key in keyof Items as Key extends `${number}` ? Key : never
                ]: Items[Key];
              }
            : Structure extends {
                  kind: 'union';
                  items: ReadonlyArray<infer Member>;
                }
              ? Children<Member>
              : {}
    : {};

type Child<Schema, Key extends string> = Schema extends unknown
  ? Children<Schema> extends infer Shape
    ? Shape extends unknown
      ? Key extends keyof Shape
        ? Shape[Key]
        : never
      : never
    : never
  : never;

type ChildKey<Schema> =
  Children<Schema> extends infer Shape
    ? Shape extends unknown
      ? keyof Shape & string
      : never
    : never;

/**
 * Validates the supplied path and suggests only the next segment. Object keys,
 * `[string]` record keys, `[number]` array items and tuple indexes are supported.
 * Schemas without recorded children are leaves.
 */
export type SchemaPath<
  Schema,
  Path extends string = '',
> = Path extends `${infer Key}.${infer Rest}`
  ? Key extends ChildKey<Schema>
    ? `${Key}.${SchemaPath<Child<Schema, Key>, Rest>}`
    : ChildKey<Schema>
  : ChildKey<Schema>;

/** The output type of the schema at a supported path. */
export type SchemaPathValue<
  Schema,
  Path extends string,
> = Path extends `${infer Key}.${infer Rest}`
  ? SchemaPathValue<Child<Schema, Key>, Rest>
  : Child<Schema, Path> extends infer Result extends StandardSchemaV1
    ? StandardSchemaV1.InferOutput<Result>
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
    case 'union': {
      const children = structure.items.flatMap((member) => {
        const child = getChildSchema(member, segment);

        return child ? [child] : [];
      });

      return children.length > 1 ? union(...children) : children[0];
    }
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
export function getSchemaAtPath<
  Schema extends StandardSchemaV1,
  const Path extends string,
>(
  schema: Schema,
  path: Path extends SchemaPath<Schema, Path> ? Path : SchemaPath<Schema, Path>,
): InferableSchema<SchemaPathValue<Schema, Path>>;

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

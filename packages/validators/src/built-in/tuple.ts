import type { StandardSchemaV1 } from '@standard-schema/spec';
import { createSchema, fail, pass, validateNested } from '../schema';

type TupleValue<Items extends ReadonlyArray<StandardSchemaV1>> = {
  -readonly [Index in keyof Items]: StandardSchemaV1.InferOutput<Items[Index]>;
};

/** Accepts an array with exactly one item for each schema, in order. */
export function tuple<const Items extends ReadonlyArray<StandardSchemaV1>>(
  ...items: Items
) {
  return createSchema(
    (value) => {
      if (!Array.isArray(value) || value.length !== items.length) {
        return fail(`Expected an array of ${items.length} items`);
      }

      const entries: unknown[] = [];
      const issues: StandardSchemaV1.Issue[] = [];

      items.forEach((item, index) => {
        const result = validateNested(item, value[index], index);

        if (result.issues) {
          issues.push(...result.issues);
        } else {
          entries.push(result.value);
        }
      });

      return issues.length > 0
        ? {
            issues,
          }
        : pass(entries as TupleValue<Items>);
    },
    {
      kind: 'tuple',
      items,
    },
  );
}

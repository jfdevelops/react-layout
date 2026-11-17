import type { StandardSchemaV1 } from '@standard-schema/spec';
import { createSchema, fail, isRecord, pass, validateNested } from '../schema';

/** Accepts an object whose values all match `item`, under any keys. */
export function record<Item>(item: StandardSchemaV1<unknown, Item>) {
  return createSchema(
    (value) => {
      if (!isRecord(value)) {
        return fail('Expected an object');
      }

      const entries: Record<string, Item> = {};
      const issues: StandardSchemaV1.Issue[] = [];

      for (const key of Object.keys(value)) {
        const result = validateNested(item, value[key], key);

        if (result.issues) {
          issues.push(...result.issues);
        } else {
          entries[key] = result.value;
        }
      }

      return issues.length > 0
        ? {
            issues,
          }
        : pass(entries);
    },
    {
      kind: 'record',
      item,
    },
  );
}

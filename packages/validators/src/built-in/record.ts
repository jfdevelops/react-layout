import type { StandardSchemaV1 } from '@standard-schema/spec';
import { createSchema, fail, isRecord, pass, validateNested } from '../schema';

/** Accepts an object whose values all match `item`, under any keys. */
export function record<Schema extends StandardSchemaV1>(item: Schema) {
  type Item = StandardSchemaV1.InferOutput<Schema>;

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
          Object.defineProperty(entries, key, {
            value: result.value,
            enumerable: true,
            configurable: true,
            writable: true,
          });
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

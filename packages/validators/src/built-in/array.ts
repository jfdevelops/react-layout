import type { StandardSchemaV1 } from '@standard-schema/spec';
import { createSchema, fail, pass, validateNested } from '../schema';

/** Accepts an array whose items all match `item`. */
export function array<Item>(item: StandardSchemaV1<unknown, Item>) {
  return createSchema((value) => {
    if (!Array.isArray(value)) {
      return fail('Expected an array');
    }

    const items: Item[] = [];
    const issues: StandardSchemaV1.Issue[] = [];

    value.forEach((entry, index) => {
      const result = validateNested(item, entry, index);

      if (result.issues) {
        issues.push(...result.issues);
      } else {
        items.push(result.value);
      }
    });

    return issues.length > 0
      ? {
          issues,
        }
      : pass(items);
  });
}

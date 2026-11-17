import { expect, expectTypeOf, it } from 'vitest';
import { resolveStringSelection } from '../src';

it('preserves selected value types and lets callers choose the wildcard result', () => {
  const values = {
    count: 2,
    label: 'Users',
  } as const;
  const keys = ['count', 'label'] as const;
  const resolved: string[] = [];

  function resolve<Key extends keyof typeof values>(key: Key) {
    resolved.push(key);

    return values[key];
  }

  const single = resolveStringSelection<typeof values, 'count'>(
    keys,
    'count',
    resolve,
    () => values,
  );
  expectTypeOf(single).toEqualTypeOf<2>();
  expect(single).toBe(2);
  expect(resolved).toEqual(['count']);
  resolved.length = 0;
  const all = resolveStringSelection<typeof values, '*'>(
    keys,
    '*',
    resolve,
    (selectedKeys) => {
      expect(selectedKeys).toEqual(keys);

      return values;
    },
  );
  expectTypeOf(all).toEqualTypeOf<typeof values>();
  expect(all).toEqual(values);
  const wildcard = resolveStringSelection<
    typeof values,
    '*',
    (typeof values)[keyof typeof values]
  >(keys, '*', resolve, () => values.label);
  expectTypeOf(wildcard).toEqualTypeOf<2 | 'Users'>();
  expect(wildcard).toBe('Users');
  expect(resolved).toEqual([]);
});

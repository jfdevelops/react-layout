import { expect, expectTypeOf, it } from 'vitest';
import { capitalize } from '../src';

it('capitalizes the first character and preserves the literal type', () => {
  const value = capitalize('users');

  expect(value).toBe('Users');
  expectTypeOf(value).toEqualTypeOf<'Users'>();
});

it('leaves an empty string unchanged', () => {
  expect(capitalize('')).toBe('');
});

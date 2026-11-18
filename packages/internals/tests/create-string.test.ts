import { expect, expectTypeOf, it } from 'vitest';
import { createString } from '../src';

it('joins literal parts, preserves unions, and accepts dynamic strings', () => {
  const literal = createString('User', 'Profile', 'Page');
  const choice: 'Profile' | 'Settings' =
    Math.random() > 0.5 ? 'Profile' : 'Settings';
  const union = createString('User', choice, 'Page');
  const dynamic: string[] = ['User', 'Page'];
  const result = createString(...dynamic);
  expectTypeOf(literal).toEqualTypeOf<'UserProfilePage'>();
  expectTypeOf(union).toEqualTypeOf<'UserProfilePage' | 'UserSettingsPage'>();
  expectTypeOf(result).toEqualTypeOf<string>();
  expect(literal).toBe('UserProfilePage');
  expect(result).toBe('UserPage');
  expect(createString()).toBe('');
});

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

it('joins paths with independent delimiter and segment capitalization options', () => {
  const path = {
    value: 'users.profile.settings' as const,
    capitalize,
  };
  const unchanged = path.capitalize({
    join: {},
  });
  const removed = path.capitalize({
    join: {
      removeDelimiter: true,
    },
  });
  const capitalized = path.capitalize({
    join: {
      capitalizeSegments: true,
    },
  });
  const both = path.capitalize({
    join: {
      removeDelimiter: true,
      capitalizeSegments: true,
    },
  });
  const dynamic: boolean = Math.random() > 0.5;
  const optional = path.capitalize({
    join: {
      removeDelimiter: dynamic,
      capitalizeSegments: dynamic,
    },
  });
  expectTypeOf(unchanged).toEqualTypeOf<'Users.profile.settings'>();
  expectTypeOf(removed).toEqualTypeOf<'Usersprofilesettings'>();
  expectTypeOf(capitalized).toEqualTypeOf<'Users.Profile.Settings'>();
  expectTypeOf(both).toEqualTypeOf<'UsersProfileSettings'>();
  expectTypeOf(optional).toEqualTypeOf<
    | 'Users.profile.settings'
    | 'Usersprofilesettings'
    | 'Users.Profile.Settings'
    | 'UsersProfileSettings'
  >();
  expect([unchanged, removed, capitalized, both]).toEqual([
    'Users.profile.settings',
    'Usersprofilesettings',
    'Users.Profile.Settings',
    'UsersProfileSettings',
  ]);
});

it('returns a custom joined string unchanged', () => {
  const custom = capitalize({
    join: ({ create }) => create('custom', 'Name'),
  });
  expectTypeOf(custom).toEqualTypeOf<'customName'>();
  expect(custom).toBe('customName');
});

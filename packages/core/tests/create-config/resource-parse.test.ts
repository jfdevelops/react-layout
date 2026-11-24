import { expect, it } from 'vitest';
import { createDefinedResourceLayout, InvalidResourceError } from '../../src';

const { resources } = createDefinedResourceLayout({
  resources: [
    'users',
    {
      value: 'posts',
      subResources: ['comments'],
    },
  ],
});

it('returns valid top-level keys unchanged', () => {
  expect(resources.parse('users')).toBe('users');
  expect(resources.parse('posts')).toBe('posts');
});

it.each([
  undefined,
  null,
  1,
  {},
  ['users'],
  'comments',
  'posts.comments',
  ' users ',
  'USERS',
  'unknown',
])('rejects invalid input %j with resource context', (value) => {
  expect(() => resources.parse(value)).toThrow(InvalidResourceError);
  expect(() => resources.parse(value)).toThrow(
    expect.objectContaining({
      context: expect.objectContaining({
        resource: value,
        validResources: ['users', 'posts'],
      }),
    }),
  );
});

it('validates against only the selected resources', () => {
  for (const selection of [resources.pick('posts'), resources.omit('users')]) {
    expect(selection.parse('posts')).toBe('posts');
    expect(() => selection.parse('users')).toThrow(InvalidResourceError);
    expect(() => selection.parse('users')).toThrow(
      expect.objectContaining({
        context: expect.objectContaining({
          validResources: ['posts'],
        }),
      }),
    );
  }

  const empty = resources.omit('users', 'posts');

  expect(() => empty.parse('users')).toThrow(InvalidResourceError);
});

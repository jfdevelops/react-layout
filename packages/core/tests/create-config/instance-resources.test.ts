import { expect, it } from 'vitest';
import { createElement } from 'react';
import { defineResourceLayout } from '../../src';
import { createLayoutBuildingBlocks } from '../../src/create-config/render-state';

it('exposes selected definitions from every scoped selection notation', () => {
  const [users] = defineResourceLayout.defineResources({
    value: 'users',
    subResources: ['details'],
  });
  const { createResourceLayout } = defineResourceLayout({
    resources: [users, 'posts', 'admins'],
    layout: {
      render: () => createElement('div'),
    },
  });
  const selections = [
    createResourceLayout.forResources('users', 'posts'),
    createResourceLayout.forResources({
      resources: ['users', 'posts'],
    }),
    createResourceLayout.forResources({
      users: {},
      posts: {},
    }),
  ];

  for (const selection of selections) {
    expect(selection.resources.raw()).toEqual([users, 'posts']);
    expect(selection.resources.isResource('users')).toBe(true);
    expect(selection.resources.isResource('admins')).toBe(false);
    expect(selection.resources.pick('users')()).toEqual([users]);
  }
});

it('exposes resources from layout building blocks', () => {
  const blocks = createLayoutBuildingBlocks({
    resources: defineResourceLayout.defineResources('users'),
    options: {},
  });

  expect(blocks.resources.raw()).toEqual(['users']);
  expect(blocks.resources()).toEqual([
    {
      value: 'users',
    },
  ]);
});

import { expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { createResourceSchema } from '@jfdevelops/react-layout-adapter-zod';
import { createDefinedResourceLayout } from '../../src';

it('accepts real layout, factory, render, and scoped resource accessors', () => {
  const factory = createDefinedResourceLayout({
    resources: [
      'posts',
      {
        value: 'users',
        subResources: ['details'],
      },
    ],
  });
  const layout = factory.defineResourceLayout({
    render: (_props, context) => {
      const schema = createResourceSchema(context.resources);
      expectTypeOf<z.infer<typeof schema>>().toEqualTypeOf<'posts' | 'users'>();

      return null as never;
    },
  });
  const scoped = layout.createResourceLayout.forResources('users');
  const schema = createResourceSchema(scoped.resources, {
    format: 'paths',
  });
  const selected = createResourceSchema(factory.resources.pick('posts'));

  expectTypeOf<z.infer<typeof schema>>().toEqualTypeOf<
    'users' | 'users.details'
  >();
  expectTypeOf<z.infer<typeof selected>>().toEqualTypeOf<'posts'>();
  expect(schema.safeParse('users.details').success).toBe(true);
  expect(schema.safeParse('posts').success).toBe(false);
  expect(createResourceSchema(layout.resources).parse('posts')).toBe('posts');
});

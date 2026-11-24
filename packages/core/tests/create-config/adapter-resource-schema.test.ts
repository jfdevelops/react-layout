import { expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { createResourceSchema } from '@jfdevelops/react-layout-adapter-zod';
import { createDefinedResourceLayout, defineResourceLayout } from '../../src';

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
    nested: 'paths',
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

it('infers direct raw, pick, and omit method arguments and results', () => {
  const { resources } = createDefinedResourceLayout({
    resources: [
      'posts',
      {
        value: 'users',
        subResources: ['details'],
      },
      'admins',
    ],
  });
  const raw = createResourceSchema(resources.raw);
  const picked = createResourceSchema(resources.pick, {
    args: ['users'],
    format: 'array',
    nested: 'paths',
  });
  const rawSelected = createResourceSchema(resources.raw, {
    args: [
      (definitions) => defineResourceLayout.defineResources(definitions[0]),
    ],
  });
  const omitted = createResourceSchema(resources.omit, {
    args: ['posts', 'admins'],
  });

  expectTypeOf<z.infer<typeof rawSelected>>().toEqualTypeOf<'posts'>();
  expect(rawSelected.parse('posts')).toBe('posts');
  expectTypeOf<z.infer<typeof raw>>().toEqualTypeOf<
    'posts' | 'users' | 'admins'
  >();
  expectTypeOf<z.infer<typeof picked>>().toEqualTypeOf<
    ('users' | 'users.details')[]
  >();
  expectTypeOf<z.infer<typeof omitted>>().toEqualTypeOf<'users'>();
  expect(picked.parse(['users.details'])).toEqual(['users.details']);
  expect(picked.safeParse(['posts']).success).toBe(false);
  expect(omitted.safeParse('admins').success).toBe(false);

  function invalidCalls() {
    // @ts-expect-error pick requires args
    createResourceSchema(resources.pick);
    createResourceSchema(resources.pick, {
      // @ts-expect-error unknown resource keys are rejected
      args: ['missing'],
    });
    createResourceSchema(resources.omit, {
      // @ts-expect-error omit requires at least one resource
      args: [],
    });
  }

  expect(invalidCalls).toBeTypeOf('function');
});

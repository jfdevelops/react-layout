import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, expectTypeOf, it } from 'vitest';
import { createDefinedResourceLayout } from '../../src';

afterEach(cleanup);

it('exposes resource accessors in callback, object, deferred, and lazy builder states', async () => {
  const { createRenderState, defineResourceLayout } = createDefinedResourceLayout({
    resources: ['users', 'posts'],
  });
  const Default = createRenderState((_props, { resources }) => {
    expectTypeOf(resources.current).toEqualTypeOf<'users' | 'posts'>();
    expectTypeOf(resources.raw()).toEqualTypeOf<readonly ['users', 'posts']>();
    expect(resources.pick('posts')()).toEqual(['posts']);
    return <p>default {resources.current}</p>;
  });
  const Detail = createRenderState({
    state: 'Detail',
    render: (_props, { resources }) => <p>detail {resources.current}</p>,
  });
  const Pending = createRenderState.defer({
    state: 'Pending',
    render: (_props, { resources }) => <p>pending {resources.current}</p>,
  });
  const Imported = createRenderState({
    state: 'Imported',
    render: (_props, { resources }) => <p>imported {resources.current}</p>,
  });
  const definition = defineResourceLayout({ render: {
    ...Default, ...Detail, ...Pending,
    Imported: createRenderState.lazy(async () => ({ Imported })),
  } });
  const Users = definition.createResourceLayout({ resource: 'users', name: 'Users' });
  render(<><Users /><Users.Detail /><Users.Pending /><Users.Imported /></>);
  expect(screen.getByText('default users')).toBeInTheDocument();
  expect(screen.getByText('detail users')).toBeInTheDocument();
  expect(await screen.findByText('pending users')).toBeInTheDocument();
  expect(await screen.findByText('imported users')).toBeInTheDocument();
});

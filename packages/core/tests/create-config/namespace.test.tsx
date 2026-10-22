import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, expectTypeOf, it } from 'vitest';
import { createDefinedResourceLayout, createProp, defineResourceLayout } from '../../src';

afterEach(cleanup);

const layout = {
  render: {
    default: { props: { custom: { title: createProp.string() } }, render: ({ title }: { title: string }) => <p>{title}</p> },
    Other: { props: { custom: { count: createProp.number() } }, render: ({ count }: { count: number }) => <p>Other {count}</p> },
  },
};

it('defaults to callable components and supports an explicit namespace override', () => {
  const definition = defineResourceLayout({ resources: ['users'], layout });
  const Users = definition.createResourceLayout({ resource: 'users', name: 'Users' });
  const Explicit = definition.createResourceLayout({ resource: 'users', name: 'Explicit', namespace: false });
  const Namespaced = definition.createResourceLayout({ resource: 'users', name: 'Namespaced', namespace: true });
  expect(typeof Users).toBe('function');
  expect(typeof Explicit).toBe('function');
  expect(Object.keys(Namespaced)).toEqual(['Root', 'Other']);
  expectTypeOf<keyof typeof Namespaced>().toEqualTypeOf<'Root' | 'Other'>();
  expectTypeOf(Namespaced.Root).toBeCallableWith({ title: 'Root' });
  expectTypeOf(Namespaced.Other).toBeCallableWith({ count: 1 });
  () => {
    // @ts-expect-error namespaces have no function members
    Namespaced.apply;
    // @ts-expect-error namespaces cannot be rendered directly
    const invalid = <Namespaced title='Invalid' />;
    // @ts-expect-error Root retains required props
    const missing = <Namespaced.Root />;
    return [invalid, missing];
  };
  render(<><Namespaced.Root title='Root' /><Namespaced.Other count={2} /></>);
  expect(screen.getByText('Root')).toBeInTheDocument();
  expect(screen.getByText('Other 2')).toBeInTheDocument();
});

it('inherits the definition default through resource factories and allows false overrides', () => {
  const definition = defineResourceLayout({ resources: ['users'], namespace: true, layout });
  const Users = definition.createResourceLayout({ resource: 'users', name: 'Users' });
  const Callable = definition.createResourceLayout({ resource: 'users', name: 'Callable', namespace: false });
  const Scoped = definition.createResourceLayout.forResources('users')({ resource: 'users', name: 'Scoped' });
  const Bound = definition.createResourceLayout.forResource('users')({ name: 'Bound' });
  const Override = definition.createResourceLayout.forResource('users')({ name: 'Override', namespace: false });
  expectTypeOf(Users.Root).toBeCallableWith({ title: 'Root' });
  expectTypeOf(Scoped.Root).toBeCallableWith({ title: 'Scoped' });
  expectTypeOf(Bound.Root).toBeCallableWith({ title: 'Bound' });
  expectTypeOf(Override).toBeCallableWith({ title: 'Override' });
  expectTypeOf(Callable).toBeCallableWith({ title: 'Callable' });
  expect(typeof Scoped).toBe('object');
  expect(typeof Bound).toBe('object');
  expect(typeof Override).toBe('function');
  render(<><Users.Other count={3} /><Callable title='Callable' /><Scoped.Root title='Scoped' /><Bound.Root title='Bound' /></>);
  expect(screen.getByText('Other 3')).toBeInTheDocument();
  expect(screen.getByText('Callable')).toBeInTheDocument();
});

it('inherits and overrides the shared factory default at each definition', () => {
  const factory = createDefinedResourceLayout({ resources: ['users'], namespace: true });
  const definition = factory.defineResourceLayout(layout);
  const Users = definition.createResourceLayout({ resource: 'users', name: 'Users' });
  const overridden = factory.defineResourceLayout({ ...layout, namespace: false });
  const Callable = overridden.createResourceLayout({ resource: 'users', name: 'Callable' });
  const Restored = overridden.createResourceLayout({ resource: 'users', name: 'Restored', namespace: true });
  expectTypeOf(Users.Other).toBeCallableWith({ count: 1 });
  expectTypeOf(Callable).toBeCallableWith({ title: 'Callable' });
  expectTypeOf(Restored.Root).toBeCallableWith({ title: 'Restored' });
  expect(typeof Users).toBe('object');
  expect(typeof Callable).toBe('function');
  expect(typeof Restored).toBe('object');
});

it('supports function render definitions and resource-bound and shell definitions', () => {
  const factory = createDefinedResourceLayout({ resources: ['users'], namespace: true });
  const definition = factory.defineResourceLayout({ render: () => <p>Function</p> });
  const Users = definition.createResourceLayout({ resource: 'users', name: 'Users' });
  const scoped = defineResourceLayout.forResources('users')({ namespace: true, layout: { render: () => <p>Scoped</p> } });
  const Scoped = scoped.createResourceLayout({ resource: 'users', name: 'Scoped' });
  const shell = defineResourceLayout.withLayout({ resources: ['users'], namespace: true, shell: { render: (_props, { children }) => <>{children}</> }, layout });
  const Page = shell.createResourceLayout({ resource: 'users', name: 'Page' });
  expectTypeOf(Users.Root).toBeCallableWith({});
  expectTypeOf(Scoped.Root).toBeCallableWith({});
  expectTypeOf(Page.Other).toBeCallableWith({ count: 1 });
  render(<><Users.Root /><Scoped.Root /><Page.Other count={4} /></>);
  expect(screen.getByText('Function')).toBeInTheDocument();
  expect(screen.getByText('Scoped')).toBeInTheDocument();
  expect(screen.getByText('Other 4')).toBeInTheDocument();
});

it('rejects Root state collisions only when a namespace is requested', () => {
  const definition = defineResourceLayout({ resources: ['users'], layout: { render: { default: () => <></>, Root: () => <></> } } });
  expect(() => definition.createResourceLayout({ resource: 'users', name: 'Users', namespace: true })).toThrow('"Root" is reserved');
  expect(typeof definition.createResourceLayout({ resource: 'users', name: 'Users' }).Root).toBe('function');
});

it('keeps composition helpers callable when the definition defaults to namespaces', () => {
  const definition = defineResourceLayout({
    resources: ['users'], namespace: true,
    layout: {
      composables: (create) => ({ Layout: create({ name: 'Layout' }) }),
      render: (_props, { composables }) => <composables.Layout>Composition</composables.Layout>,
    },
  });
  const Users = definition.createResourceLayout({ resource: 'users', name: 'Users' });
  expect(Object.keys(Users)).toEqual(['Root']);
  expect(Users.Root.makeComposable().displayName).toBe('Users');
  expect(definition.createResourceLayout.makeComposable({ resource: 'users', name: 'Shared' }).displayName).toBe('Shared');
  const Directory = definition.createResourceLayout.forResources('users').createComponent({
    resources: { users: { render: () => <p>Entry</p> } },
    render: (_props, { Root }) => <Root />,
  });
  render(<Directory resource='users' />);
  expect(screen.getByText('Composition')).toBeInTheDocument();
});

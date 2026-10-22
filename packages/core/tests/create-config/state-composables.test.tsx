import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it } from 'vitest';
import { createDefinedResourceLayout, createProp, defineResourceLayout } from '../../src';

afterEach(cleanup);

it('renders an unregistered builder state as a composable with isolated hooks', () => {
  const { createRenderState, defineResourceLayout: defineLayout } =
    createDefinedResourceLayout({ resources: ['users'] });
  const Counter = createRenderState({
    state: 'Counter',
    props: { custom: { label: createProp.string() } },
    render: ({ label }) => {
      const [count, setCount] = useState(0);
      return <button onClick={() => setCount(count + 1)}>{label}: {count}</button>;
    },
  });
  expect(Object.keys(Counter)).toEqual(['Counter']);
  const Default = createRenderState({
    props: { custom: { label: createProp.string() } },
    composables: () => ({ Counter: Counter.asComposable({ props: { include: { label: true } } }) }),
    render: (_props, { composables }) => <composables.Counter />,
  });
  const definition = defineLayout({ render: { ...Default } });
  const Users = definition.createResourceLayout({ resource: 'users', name: 'Users' });
  const { rerender } = render(<Users label='Count' />);
  fireEvent.click(screen.getByRole('button', { name: 'Count: 0' }));
  expect(screen.getByRole('button', { name: 'Count: 1' })).toBeInTheDocument();
  rerender(<Users label='Updated' />);
  expect(screen.getByRole('button', { name: 'Updated: 1' })).toBeInTheDocument();
});

it('inherits only selected props and lets JSX override inherited values', () => {
  const { createRenderState, defineResourceLayout: defineLayout } =
    createDefinedResourceLayout({ resources: ['users'] });
  const Message = createRenderState({
    state: 'Message',
    props: { custom: { title: createProp.string(), suffix: createProp.string() } },
    render: ({ title, suffix }) => <p>{title} {suffix}</p>,
  });
  const Default = createRenderState({
    props: { custom: { title: createProp.string(), suffix: createProp.string() } },
    composables: () => ({
      Inherited: Message.asComposable({ props: { include: { title: true } } }),
      Explicit: Message.asComposable(),
    }),
    render: (_props, { composables }) => <>
      <composables.Inherited suffix='selected' />
      <composables.Inherited title='Override' suffix='explicit' />
      <composables.Explicit title='Independent' suffix='props' />
    </>,
  });
  const Users = defineLayout({ render: { ...Default } }).createResourceLayout({ resource: 'users', name: 'Users' });
  render(<Users title='Parent' suffix='must not leak' />);
  expect(screen.getByText('Parent selected')).toBeInTheDocument();
  expect(screen.getByText('Override explicit')).toBeInTheDocument();
  expect(screen.getByText('Independent props')).toBeInTheDocument();
  expect(screen.queryByText(/must not leak/)).not.toBeInTheDocument();
});

it('resolves inline forward references and aliases through the states argument', () => {
  const definition = defineResourceLayout({
    resources: ['users'],
    layout: {
      composables: (_create, states) => ({
        Pending: states.Loading.asComposable({ props: { include: { message: true } } }),
        Direct: states.Loading,
      }),
      render: {
        default: {
          props: { custom: { message: createProp.string() } },
          render: (_props, { composables }) => <>
            <composables.Pending />
            <composables.Direct message='Explicit message' />
          </>,
        },
        Loading: {
          props: { custom: { message: createProp.string() } },
          render: ({ message }) => <p>{message}</p>,
        },
      },
    },
  });
  const Users = definition.createResourceLayout({ resource: 'users', name: 'Users' });
  render(<Users message='Inherited message' />);
  expect(screen.getByText('Inherited message')).toBeInTheDocument();
  expect(screen.getByText('Explicit message')).toBeInTheDocument();
});

it('allows conditional circular references without recursively constructing layouts', () => {
  const definition = defineResourceLayout({
    resources: ['users'],
    layout: {
      composables: (_create, states) => ({ ToOther: states.Other, ToDefault: states.default }),
      render: {
        default: {
          props: { custom: { depth: createProp.number() } },
          render: ({ depth }, { composables }) => depth > 0
            ? <composables.ToOther depth={depth - 1} /> : <p>Default leaf</p>,
        },
        Other: {
          props: { custom: { depth: createProp.number() } },
          render: ({ depth }, { composables }) => depth > 0
            ? <composables.ToDefault depth={depth - 1} /> : <p>Other leaf</p>,
        },
      },
    },
  });
  const Users = definition.createResourceLayout({ resource: 'users', name: 'Users' });
  render(<Users depth={3} />);
  expect(screen.getByText('Other leaf')).toBeInTheDocument();
});

it('binds references to the current resource layout rather than a global component', () => {
  const definition = defineResourceLayout({
    resources: ['users', 'posts'],
    layout: {
      composables: (_create, states) => ({ Detail: states.Detail }),
      render: {
        default: {
          render: (_props, { composables }) => <composables.Detail />,
        },
        Detail: { render: (_props, { resources, name }) => <p>{resources.current}: {name}</p> },
      },
    },
  });
  const Users = definition.createResourceLayout({ resource: 'users', name: 'Users' });
  const Posts = definition.createResourceLayout({ resource: 'posts', name: 'Posts' });
  render(<><Users /><Posts /></>);
  expect(screen.getByText('users: Users')).toBeInTheDocument();
  expect(screen.getByText('posts: Posts')).toBeInTheDocument();
});

it('preserves deferred and lazy behavior when a builder state is referenced', async () => {
  const { createRenderState, defineResourceLayout: defineLayout } =
    createDefinedResourceLayout({ resources: ['users'] });
  const Deferred = createRenderState.defer({ state: 'Deferred', render: () => <p>Deferred child</p> });
  const Imported = createRenderState({ state: 'Imported', render: () => <p>Imported child</p> });
  const Lazy = createRenderState.lazy(async () => ({ Imported }));
  const Default = createRenderState({
    composables: () => ({ Deferred: Deferred.asComposable(), Lazy: Lazy.asComposable() }),
    render: (_props, { composables }) => <><composables.Deferred /><composables.Lazy /></>,
  });
  const Users = defineLayout({ render: { ...Default } }).createResourceLayout({ resource: 'users', name: 'Users' });
  render(<Users />);
  expect(await screen.findByText('Deferred child')).toBeInTheDocument();
  expect(await screen.findByText('Imported child')).toBeInTheDocument();
});

it('merges bound shared composables with inline state references', () => {
  const { defineResourceLayout: defineLayout } = createDefinedResourceLayout({
    resources: ['users'],
    composables: (create) => ({ Frame: create({ name: 'SharedFrame' }) }),
  });
  const definition = defineLayout({
    composables: (_create, states) => ({ Message: states.Message }),
    render: {
      default: {
        render: (_props, { composables }) => <composables.Frame><composables.Message message='Bound reference' /></composables.Frame>,
      },
      Message: {
        props: { custom: { message: createProp.string() } },
        render: ({ message }) => <p>{message}</p>,
      },
    },
  });
  const Users = definition.createResourceLayout({ resource: 'users', name: 'Users' });
  render(<Users />);
  expect(screen.getByText('Bound reference')).toBeInTheDocument();
});

it('supports builder references in a bound layout with a function render', () => {
  const { createRenderState, defineResourceLayout: defineLayout } = createDefinedResourceLayout({ resources: ['users'] });
  const Message = createRenderState({
    state: 'Message',
    props: { custom: { message: createProp.string() } },
    render: ({ message }) => <p>{message}</p>,
  });
  const definition = defineLayout({
    props: { custom: { message: createProp.string() } },
    composables: (create) => ({ Frame: create({ name: 'Frame' }), Message: Message.asComposable({ props: { include: { message: true } } }) }),
    render: (_props, { composables }) => <composables.Frame><composables.Message /></composables.Frame>,
  });
  const Users = definition.createResourceLayout({ resource: 'users', name: 'Users' });
  render(<Users message='Function render reference' />);
  expect(screen.getByText('Function render reference')).toBeInTheDocument();
});

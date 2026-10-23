import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { Component, type ReactNode } from 'react';
import { afterEach, expect, expectTypeOf, it, vi } from 'vitest';
import { createDefinedResourceLayout, createProp, defineComposableComponent } from '../../src';

afterEach(cleanup);

it('inherits all reference props and exposes a Ref composable', () => {
  const { createRenderState, defineResourceLayout } = createDefinedResourceLayout({
    resources: ['users'], options: { title: createProp.string() },
  });
  const Source = createRenderState({
    state: 'Source',
    props: { include: { title: true }, custom: { message: createProp.string(), count: createProp.number().optional() } },
    render: ({ title, message, count }) => <p>{title}: {message} {count ?? 0}</p>,
  });
  const Derived = createRenderState.fromState({
    ref: Source,
    props: { custom: { heading: createProp.string() } },
    composables: (create) => ({ Frame: create({ name: 'Frame' }) }),
    render: ({ title, message, count, heading }, { composables, resources }) => {
      expectTypeOf(title).toEqualTypeOf<string>();
      expectTypeOf(message).toEqualTypeOf<string>();
      expectTypeOf(count).toEqualTypeOf<number | undefined>();
      expectTypeOf(heading).toEqualTypeOf<string>();
      expectTypeOf(composables.Ref).toBeCallableWith({});
      return <composables.Frame><h1>{heading} {resources.current}</h1><composables.Ref /></composables.Frame>;
    },
  });
  const definition = defineResourceLayout({ render: { ...Derived } });
  const Users = definition.createResourceLayout({ resource: 'users', name: 'Users', title: 'Title' });
  expectTypeOf(Users).toBeCallableWith({ message: 'Message', heading: 'Heading' });
  () => {
    // @ts-expect-error inherited required props stay required
    <Users heading='Heading' />;
    // @ts-expect-error inherited optional props keep their value types
    <Users message='Message' heading='Heading' count='wrong' />;
  };
  render(<Users message='Message' heading='Heading' />);
  expect(screen.getByText('Heading users')).toBeInTheDocument();
  expect(screen.getByText('Title: Message 0')).toBeInTheDocument();
});

it('selects inherited props and requires excluded Ref props explicitly', () => {
  const { createRenderState, defineResourceLayout } = createDefinedResourceLayout({ resources: ['users'] });
  const Source = createRenderState({
    props: { custom: { message: createProp.string(), count: createProp.number() } },
    render: ({ message, count }) => <p>{message} {count}</p>,
  });
  const Derived = createRenderState.fromState({
    ref: Source, state: 'Selected',
    props: { include: { message: { visibility: 'required', passthrough: 'component' } } },
    render: (props, { composables }) => {
      expectTypeOf(props.message).toEqualTypeOf<string>();
      () => {
        // @ts-expect-error excluded props are not exposed to the derived render
        props.count;
        // @ts-expect-error excluded required props must be supplied to Ref
        <composables.Ref />;
      };
      return <composables.Ref count={2} />;
    },
  });
  const Users = defineResourceLayout({ render: { default: () => <></>, ...Derived } })
    .createResourceLayout({ resource: 'users', name: 'Users' });
  expectTypeOf(Users.Selected).toBeCallableWith({ message: 'Selected' });
  render(<Users.Selected message='Selected' />);
  expect(screen.getByText('Selected 2')).toBeInTheDocument();
});

it('supports config-passthrough selection and chained states', () => {
  const { createRenderState, defineResourceLayout } = createDefinedResourceLayout({ resources: ['users'] });
  const Source = createRenderState({
    state: 'Source', props: { custom: { message: createProp.string() } },
    render: ({ message }) => <p>{message}</p>,
  });
  const Middle = createRenderState.fromState({
    ref: Source, state: 'Middle',
    props: { include: { message: true } },
    render: ({ message }, { composables }) => <section data-message={message}><composables.Ref /></section>,
  });
  const Final = createRenderState.fromState({
    ref: Middle,
    render: ({ message }, { composables }) => {
      expectTypeOf(message).toEqualTypeOf<string>();
      return <composables.Ref />;
    },
  });
  const Users = defineResourceLayout({ render: { ...Final } }).createResourceLayout({
    resource: 'users', name: 'Users', message: 'Chained',
  });
  render(<Users />);
  expect(screen.getByText('Chained')).toBeInTheDocument();
});

it('inherits from deferred states without eagerly rendering them', async () => {
  const { createRenderState, defineResourceLayout } = createDefinedResourceLayout({ resources: ['users'] });
  const Source = createRenderState.defer({
    state: 'Deferred', props: { custom: { message: createProp.string() } },
    render: ({ message }) => <p>{message}</p>,
  });
  const Derived = createRenderState.fromState({ ref: Source, render: (_props, { composables }) => <composables.Ref /> });
  const Users = defineResourceLayout({ render: { ...Derived } }).createResourceLayout({ resource: 'users', name: 'Users' });
  render(<Users message='Deferred' />);
  expect(await screen.findByText('Deferred')).toBeInTheDocument();
});

it('inherits source-local preset schemas and component-valued props', () => {
  const { createRenderState, defineResourceLayout } = createDefinedResourceLayout({
    resources: ['users'], options: () => ({ content: createProp.component({ type: 'JSX.Element' }).props({ label: createProp.string() }) }),
  });
  const Message = defineComposableComponent({ name: 'Message', props: { message: createProp.string() } })(() => <></>);
  const Source = createRenderState({
    composables: () => Message,
    props: { include: {
      content: { visibility: 'required', passthrough: 'component' },
      message: { visibility: 'required', passthrough: 'component' },
    } },
    render: ({ Content, message }) => <><Content label='Source' /><p>{message}</p></>,
  });
  const Derived = createRenderState.fromState({
    ref: Source,
    render: ({ Content }, { composables }) => {
      expectTypeOf(composables.Ref).toBeCallableWith({});
      return <><Content label='Derived' /><composables.Ref /></>;
    },
  });
  const Users = defineResourceLayout({ render: { ...Derived } }).createResourceLayout({ resource: 'users', name: 'Users' });
  render(<Users message='Preset' Content={({ label }) => <p>{label}</p>} />);
  expect(screen.getByText('Source')).toBeInTheDocument();
  expect(screen.getByText('Derived')).toBeInTheDocument();
  expect(screen.getByText('Preset')).toBeInTheDocument();
});

it.each([false, true])('inherits lazy references and supports further derivation (deferred source: %s)', async (deferred) => {
  const { createRenderState, defineResourceLayout } = createDefinedResourceLayout({ resources: ['users'] });
  const sourceDefinition = {
    state: 'Source', props: { custom: { message: createProp.string() } },
    render: ({ message }: { message: string }) => <p>{message}</p>,
  } as const;
  const Source = deferred ? createRenderState.defer(sourceDefinition) : createRenderState(sourceDefinition);
  let loads = 0;
  const LazySource = createRenderState.lazy(async () => { loads += 1; return { Source }; });
  const Derived = createRenderState.fromState({
    ref: LazySource, state: 'Derived',
    render: ({ message }, { composables }) => {
      expectTypeOf(message).toEqualTypeOf<string>();
      return <composables.Ref />;
    },
  });
  expect(loads).toBe(0);
  const Final = createRenderState.fromState({
    ref: Derived, state: 'Final', render: (_props, { composables }) => <composables.Ref />,
  });
  const definition = defineResourceLayout({ render: {
    default: () => <></>,
    Final: createRenderState.lazy(async () => ({ Final })),
  } });
  const Users = definition.createResourceLayout({ resource: 'users', name: 'Users' });
  render(<Users.Final message='Lazy inheritance' />);
  expect(await screen.findByText('Lazy inheritance')).toBeInTheDocument();
  expect(loads).toBe(1);
});

it('does not require excluded preset props at layout creation', () => {
  const { createRenderState, defineResourceLayout } = createDefinedResourceLayout({ resources: ['users'] });
  const Pair = defineComposableComponent({
    name: 'Pair', props: { message: createProp.string(), count: createProp.number() },
  })(() => <></>);
  const Source = createRenderState({
    composables: () => Pair,
    props: { include: {
      message: { visibility: 'required', passthrough: 'component' },
      count: { visibility: 'required', passthrough: 'component' },
    } },
    render: ({ message, count }) => <p>{message} {count}</p>,
  });
  const Derived = createRenderState.fromState({
    ref: Source,
    props: { include: { message: { visibility: 'required', passthrough: 'component' } } },
    render: (_props, { composables }) => <composables.Ref count={3} />,
  });
  const Users = defineResourceLayout({ render: { ...Derived } }).createResourceLayout({ resource: 'users', name: 'Users' });
  render(<Users message='Subset' />);
  expect(screen.getByText('Subset 3')).toBeInTheDocument();
});

it('supports custom overrides and rejects invalid reference configuration', () => {
  const { createRenderState, defineResourceLayout } = createDefinedResourceLayout({ resources: ['users'], options: () => ({ title: createProp.string() }) });
  const Source = createRenderState({
    props: { custom: { message: createProp.string() }, include: { title: true } },
    render: ({ message }) => <p>{message}</p>,
  });
  const Derived = createRenderState.fromState({
    ref: Source,
    props: { custom: { message: createProp.number() } },
    render: ({ message, title }, { composables }) => {
      expectTypeOf(message).toEqualTypeOf<number>();
      expectTypeOf(title).toEqualTypeOf<string>();
      () => {
        // @ts-expect-error an overridden source prop must be supplied to Ref
        <composables.Ref />;
      };
      return <><span>{message}</span><composables.Ref message='Original' /></>;
    },
  });
  () => {
    createRenderState.fromState({ ref: Source, props: {
      // @ts-expect-error unknown include keys are rejected alongside valid keys
      include: { message: true, missing: true },
    }, render: () => <></> });
    createRenderState.fromState({
      // @ts-expect-error only created states can be referenced
      ref: { render: () => <></> }, render: () => <></>,
    });
    createRenderState.fromState({ ref: Source,
      // @ts-expect-error the Ref name is reserved for the referenced state
      composables: () => ({ Ref: Source.asComposable() }), render: () => <></>,
    });
  };
  const Users = defineResourceLayout({ render: { ...Derived } }).createResourceLayout({ resource: 'users', name: 'Users', title: 'Title' });
  render(<Users message={7} />);
  expect(screen.getByText('7')).toBeInTheDocument();
  expect(screen.getByText('Original')).toBeInTheDocument();
});

it('accepts excluded source configuration props directly on Ref', () => {
  const { createRenderState, defineResourceLayout } = createDefinedResourceLayout({
    resources: ['users'], options: { title: createProp.string() },
  });
  const Source = createRenderState({
    props: { include: { title: true }, custom: { message: createProp.string() } },
    render: ({ title, message }) => <p>{title}: {message}</p>,
  });
  const Derived = createRenderState.fromState({
    ref: Source,
    props: { include: { message: { visibility: 'required', passthrough: 'component' } } },
    render: (props, { composables }) => {
      () => {
        // @ts-expect-error excluded configuration props must be supplied to Ref
        <composables.Ref />;
        // @ts-expect-error only selected props appear in the derived render
        props.title;
      };
      return <composables.Ref title='Explicit' />;
    },
  });
  const Users = defineResourceLayout({ render: { ...Derived } }).createResourceLayout({ resource: 'users', name: 'Users' });
  render(<Users message='Selected' />);
  expect(screen.getByText('Explicit: Selected')).toBeInTheDocument();
});


it.each([undefined, false, true])('can defer only the Ref component (lazy: %s)', async (lazy) => {
  const { createRenderState, defineResourceLayout } = createDefinedResourceLayout({ resources: ['users'] });
  const Source = createRenderState({
    props: { custom: { message: createProp.string() } },
    render: ({ message }) => <p>{message}</p>,
  });
  const Derived = createRenderState.fromState({
    ref: Source,
    lazy,
    render: ({ message }, { composables }) => {
      expectTypeOf(message).toEqualTypeOf<string>();
      expectTypeOf(composables.Ref).toBeCallableWith({});
      return <section><h1>Derived ready</h1><composables.Ref /></section>;
    },
  });
  const Users = defineResourceLayout({ render: {
    ...Derived,
    Loading: () => <p>Loading ref</p>,
  } }).createResourceLayout({ resource: 'users', name: 'Users' });
  expectTypeOf(Users).toBeCallableWith({ message: 'Source ready' });
  () => {
    // @ts-expect-error deferring the ref preserves inherited required props
    <Users />;
    // @ts-expect-error deferring the ref preserves inherited prop value types
    <Users message={123} />;
  };
  render(<Users message='Source ready' />);
  expect(screen.getByText('Derived ready')).toBeInTheDocument();
  if (lazy) {
    expect(screen.getByText('Loading ref')).toBeInTheDocument();
    expect(screen.queryByText('Source ready')).not.toBeInTheDocument();
  } else {
    expect(screen.getByText('Source ready')).toBeInTheDocument();
    expect(screen.queryByText('Loading ref')).not.toBeInTheDocument();
  }
  expect(await screen.findByText('Source ready')).toBeInTheDocument();
});

it('does not reuse the outer Loading state as a deferred Ref fallback', async () => {
  const { createRenderState, defineResourceLayout } = createDefinedResourceLayout({ resources: ['users'] });
  const Source = createRenderState({
    state: 'Source',
    props: { custom: { message: createProp.string() } },
    render: ({ message }) => <p>{message}</p>,
  });
  const Loading = createRenderState.fromState({
    ref: Source,
    state: 'Loading',
    lazy: true,
    render: (_props, { composables }) => <section><h1>Derived loading</h1><composables.Ref message='Ready' /></section>,
  });
  const Users = defineResourceLayout({ render: { default: () => <></>, ...Loading } })
    .createResourceLayout({ resource: 'users', name: 'Users' });

  render(<Users.Loading message='Ready' />);

  expect(screen.getByText('Derived loading')).toBeInTheDocument();
  expect(await screen.findByText('Ready')).toBeInTheDocument();
});

it('does not reuse the outer Error state as a deferred Ref fallback', async () => {
  const { createRenderState, defineResourceLayout } = createDefinedResourceLayout({ resources: ['users'] });
  const Source = createRenderState({
    state: 'Source',
    render: () => { throw new Error('source failed'); },
  });
  let errorStateRenderCount = 0;
  const ErrorState = createRenderState.fromState({
    ref: Source,
    state: 'Error',
    lazy: true,
    render: (_props, { composables }) => {
      errorStateRenderCount += 1;
      return <composables.Ref />;
    },
  });
  const Users = defineResourceLayout({ render: { default: () => <></>, ...ErrorState } })
    .createResourceLayout({ resource: 'users', name: 'Users' });

  let error: Error | undefined;
  class ErrorBoundary extends Component<{
    children?: ReactNode;
  }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() {
      return { failed: true };
    }
    componentDidCatch(caught: Error) {
      error = caught;
    }
    render() {
      return this.state.failed ? null : this.props.children;
    }
  }

  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const suppressWindowError = (event: ErrorEvent) => event.preventDefault();
  window.addEventListener('error', suppressWindowError);
  try {
    render(<ErrorBoundary><Users.Error /></ErrorBoundary>);
    await waitFor(() => expect(error).toBeDefined());
    await new Promise((resolve) => setTimeout(resolve, 0));
  } finally {
    window.removeEventListener('error', suppressWindowError);
    consoleError.mockRestore();
  }

  expect(error).toBeInstanceOf(Error);
  expect(error?.message).toContain('source failed');
  expect(errorStateRenderCount).toBe(1);
});

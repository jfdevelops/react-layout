import { expectTypeOf, it } from 'vitest';
import { createDefinedResourceLayout, createProp, defineComposableComponent, defineResourceLayout } from '../../src';

it('preserves required props and narrows the carry-over configuration', () => {
  const { createRenderState, defineResourceLayout: defineLayout } = createDefinedResourceLayout({
    resources: ['users'], options: { title: createProp.string() },
  });
  const Target = createRenderState({
    state: 'Target',
    props: {
      custom: { label: createProp.string(), count: createProp.number() },
      include: { title: { visibility: 'required', passthrough: 'component' } },
    },
    render: ({ label, count, title }) => <p>{title}: {label}: {count}</p>,
  });
  const Direct = Target.asComposable();
  const Carried = Target.asComposable({ props: { include: { label: true, title: true } } });
  expectTypeOf(Direct).toBeCallableWith({ title: 'Title', label: 'Label', count: 1 });
  expectTypeOf(Carried).toBeCallableWith({ count: 1 });
  () => {
    // @ts-expect-error all props are required unless explicitly carried
    Direct({});
    // @ts-expect-error count was not selected for carry-over
    Carried({});
    // @ts-expect-error only declared props can be carried
    Target.asComposable({ props: { include: { missing: true } } });
    // @ts-expect-error unknown props are rejected alongside valid props
    Target.asComposable({ props: { include: { label: true, missing: true } } });
    // @ts-expect-error include uses the standard prop selection values
    Target.asComposable({ props: { include: { label: false } } });
    // @ts-expect-error prop selection uses an include object
    Target.asComposable({ props: ['label'] });
  };
  const definition = defineLayout({ render: { default: () => <></>, ...Target } });
  const Users = definition.createResourceLayout({ resource: 'users', name: 'Users' });
  // @ts-expect-error fragment helper methods do not become render-state members
  Users.asComposable;
});

it('infers forward state references and their composable aliases in an inline map', () => {
  const definition = defineResourceLayout({
    resources: ['users'],
    layout: {
      composables: (create, states) => {
            expectTypeOf(states.Target).not.toBeAny();
            expectTypeOf<typeof states.Target.props.label>().toEqualTypeOf<string>();
            expectTypeOf<typeof states.Target.props.count>().toEqualTypeOf<number>();
            // @ts-expect-error unknown states cannot be referenced
            states.Missing;
            // @ts-expect-error carry-over keys come from the target state
            states.Target.asComposable({ props: { include: { missing: true } } });
            return {
              Frame: create({ name: 'Frame' }),
              Direct: states.Target,
              Carried: states.Target.asComposable({ props: { include: { label: true } } }),
            };
      },
      render: {
        default: {
          props: { custom: { label: createProp.string() } },
          render: (_props, { composables }) => {
            expectTypeOf(composables.Direct).not.toBeAny();
            expectTypeOf(composables.Carried).toBeCallableWith({ count: 1 });
            // @ts-expect-error aliases retain the target state's required props
            composables.Direct({});
            // @ts-expect-error only returned composables are available
            composables.Unknown;
            return <composables.Frame><composables.Carried count={1} /></composables.Frame>;
          },
        },
        Target: {
          props: { custom: { label: createProp.string(), count: createProp.number() } },
          render: ({ label, count }) => <p>{label}: {count}</p>,
        },
      },
    },
  });
  const Users = definition.createResourceLayout({ resource: 'users', name: 'Users' });
  expectTypeOf(Users).toBeCallableWith({ label: 'Label' });
  expectTypeOf(Users.Target).toBeCallableWith({ label: 'Label', count: 1 });
});

it('types references and aliases in bound inline layouts', () => {
  const { defineResourceLayout: defineLayout } = createDefinedResourceLayout({ resources: ['users'] });
  const definition = defineLayout({
    composables: (create, states) => ({
      Frame: create({ name: 'Frame' }),
      Alias: states.Preview,
    }),
    render: {
      default: {
        render: (_props, { composables }) => {
          expectTypeOf<typeof composables.Alias.props.label>().toEqualTypeOf<string>();
          // @ts-expect-error declared target props are required
          composables.Alias({});
          // @ts-expect-error no unknown composable aliases
          composables.Unknown;
          return <composables.Frame><composables.Alias label='Preview' /></composables.Frame>;
        },
      },
      Preview: {
        props: { custom: { label: createProp.string() } },
        render: ({ label }) => <p>{label}</p>,
      },
    },
  });
  expectTypeOf(definition.createResourceLayout).toBeFunction();
});

it('tracks state names when the inline declarations contain only callbacks', () => {
  defineResourceLayout({
    resources: ['users'],
    layout: {
      composables: (_create, states) => {
        // @ts-expect-error inference keeps the declared keys instead of widening to string
        states.Missing;
        return { Detail: states.Detail };
      },
      render: {
        default: { render: (_props, { composables }) => <composables.Detail /> },
        Detail: { render: () => <p>Detail</p> },
      },
    },
  });
});


it('preserves preset prop requirements while inferring layout composables', () => {
  const Message = defineComposableComponent({
    name: 'Message', props: { message: createProp.string(), suffix: createProp.string() },
  })(() => <></>);
  const options = { title: createProp.string() };
  const states = {
    default: () => <></>,
    Target: {
      props: { include: {
        title: { visibility: 'required', passthrough: 'component' },
        message: { visibility: 'required', passthrough: 'component' },
        suffix: { visibility: 'optional', passthrough: 'component' },
      } },
      render: ({ message }: { message: string }) => <p>{message}</p>,
    },
  } as const;
  const definition = defineResourceLayout<['users'], typeof states, typeof options, typeof Message>({
    resources: ['users'], options,
    layout: {
      composables: (_create, refs) => {
        expectTypeOf(refs.Target).toBeCallableWith({ message: 'Required', title: 'Title' });
        expectTypeOf<typeof refs.Target.props.title>().toEqualTypeOf<string>();
        expectTypeOf(refs.Target.asComposable({ props: { include: { message: true } } })).toBeCallableWith({ title: 'Title' });
        () => {
          // @ts-expect-error a preset's required component prop cannot be omitted
          refs.Target({});
          // @ts-expect-error optional props cannot replace a required prop
          refs.Target({ suffix: 'Optional' });
        };
        return { ...Message, Direct: refs.Target };
      },
      render: states,
    },
  });
  () => {
    const Users = definition.createResourceLayout({ resource: 'users', name: 'Users' });
    expectTypeOf<typeof Users.Target.props.message>().toEqualTypeOf<string>();
  };
  const factory = createDefinedResourceLayout({ resources: ['users'], options });
  factory.defineResourceLayout<typeof states, typeof Message>({
    composables: (_create, refs) => {
      expectTypeOf(refs.Target).toBeCallableWith({ message: 'Required', title: 'Title' });
      () => {
        // @ts-expect-error bound local preset props are required on references
        refs.Target({});
      };
      return { ...Message, Direct: refs.Target };
    },
    render: states,
  });
});

it('uses inferred layout presets in state-local reference callbacks', () => {
  const Message = defineComposableComponent({
    name: 'Message', props: { message: createProp.string() },
  })(() => <></>);
  defineResourceLayout({
    resources: ['users'],
    layout: {
      composables: () => Message,
      render: {
        default: {
          composables: (_create, refs) => {
            expectTypeOf<typeof refs.Target.props.message>().toEqualTypeOf<string>();
            () => {
              // @ts-expect-error inferred preset props keep their requiredness
              refs.Target({});
              // @ts-expect-error inferred preset props retain their value types
              refs.Target({ message: 123 });
            };
            return {};
          },
          render: () => <></>,
        },
        Target: {
          props: { include: { message: { visibility: 'required', passthrough: 'component' } } },
          render: ({ message }) => <p>{message}</p>,
        },
      },
    },
  });
});

import { expectTypeOf, it } from 'vitest';
import {
  createDefinedResourceLayout,
  createComposableComponent,
  createProp,
  defineResourceLayout,
} from '../../src';

it('contextually types inline state render arguments', () => {
  const sourceDefinition = defineResourceLayout({
    resources: ['users'],
    layout: {
      render: {
        default: () => <></>,
        Loading: () => <></>,
      },
    },
  });
  const Source = sourceDefinition.createResourceLayout({
    resource: 'users',
    name: 'Source',
  });

  const { createRenderState, defineResourceLayout: defineTargetLayout } =
    createDefinedResourceLayout('users');
  const Preview = createRenderState({
    state: 'Preview',
    composables: () => ({
      Layout: createComposableComponent({ name: 'TargetLayout' }),
      Loading: Source.Loading,
    }),
    render: (props, { composables }) => {
      expectTypeOf(props).not.toBeAny();
      expectTypeOf(composables).not.toBeAny();
      expectTypeOf(composables.Layout).toBeFunction();
      expectTypeOf(composables.Loading).toBeFunction();

      return <></>;
    },
  });

  defineTargetLayout({
    layout: {
      render: {
        default: () => <></>,
        ...Preview,
      },
    },
  });
});

it('infers included option props independently for built-in inline states', () => {
  const definition = defineResourceLayout({
    resources: ['users'],
    options: {
      title: createProp.string(),
      message: createProp.string(),
    },
    layout: {
      render: {
        default: {
          props: { include: { title: true } },
          render: ({ title }) => {
            expectTypeOf(title).toEqualTypeOf<string>();
            return <h1>{title}</h1>;
          },
        },
        Loading: {
          props: { include: { message: true } },
          render: ({ message }) => {
            expectTypeOf(message).toEqualTypeOf<string>();
            return <p>{message}</p>;
          },
        },
        NotFound: () => <p>Missing</p>,
      },
    },
  });
  const Users = definition.createResourceLayout({
    resource: 'users',
    name: 'Users',
    title: 'Title',
    message: 'Loading',
  });

  expectTypeOf(Users.Loading).toBeFunction();
  expectTypeOf(Users.NotFound).toBeFunction();
  // @ts-expect-error Error was not configured on this layout.
  Users.Error;
});

it('infers included option props through a bound layout builder', () => {
  const { defineResourceLayout: defineBoundLayout } =
    createDefinedResourceLayout('users').defineOptions({
      title: createProp.string(),
      message: createProp.string(),
    });

  defineBoundLayout({
    layout: {
      render: {
        default: {
          props: { include: { title: true } },
          render: ({ title }) => {
            expectTypeOf(title).toEqualTypeOf<string>();
            return <h1>{title}</h1>;
          },
        },
        Loading: {
          props: { include: { message: true } },
          render: ({ message }) => {
            expectTypeOf(message).toEqualTypeOf<string>();
            return <p>{message}</p>;
          },
        },
      },
    },
  });
});

it('carries defined options and typed composable factories through the builders', () => {
  const {
    composables,
    createRenderState,
    defineResourceLayout: defineBoundLayout,
  } = createDefinedResourceLayout('users').defineOptions({
    title: createProp.string(),
  });
  const layoutComposables = composables((create) => ({
    Layout: create({
      name: ({ resource }) => {
        expectTypeOf(resource).toEqualTypeOf<'users'>();
        return 'Layout';
      },
    }),
  }));
  const Loading = createRenderState({
    state: 'Loading',
    composables: (create) => ({
      LoadingFrame: create({ name: 'LoadingFrame' }),
      LoadingMessage: createComposableComponent({ name: 'LoadingMessage' }),
    }),
    props: {
      include: { title: true },
    },
    render: ({ title }, { composables: stateComposables }) => {
      expectTypeOf(title).toEqualTypeOf<string>();
      expectTypeOf(stateComposables.LoadingFrame).toBeFunction();
      return <stateComposables.LoadingMessage>{title}</stateComposables.LoadingMessage>;
    },
  });
  const { createResourceLayout } = defineBoundLayout({
    layout: {
      composables: layoutComposables,
      render: {
        default: () => <></>,
        ...Loading,
      },
    },
  });
  const Users = createResourceLayout({
    resource: 'users',
    name: 'Users',
    title: 'Loading users',
  });

  expectTypeOf(Users.Loading).toBeCallableWith({});

  // @ts-expect-error only defined options and state composable props are includable
  createRenderState({
    state: 'Invalid',
    props: {
      include: {
        missing: true,
      },
    },
    render: () => <></>,
  });
});

it('types compound render states independently', () => {
  const { createRenderState, defineResourceLayout: defineBoundLayout } =
    createDefinedResourceLayout('users');
  const ErrorState = createRenderState({
    state: 'Error',
    props: {
      custom: {
        error: createProp.string(),
      },
    },
    render: ({ error }, { retry }) => {
      expectTypeOf(error).toEqualTypeOf<string>();
      expectTypeOf(retry).toEqualTypeOf<(() => void) | undefined>();
      return <></>;
    },
  });
  const { createResourceLayout } = defineBoundLayout({
    layout: {
      render: {
        default: () => <></>,
        ...ErrorState,
        Loading: () => <></>,
      },
    },
  });
  const Users = createResourceLayout({ resource: 'users', name: 'Users' });

  expectTypeOf(Users).toBeCallableWith({});
  expectTypeOf(Users.Error).toBeCallableWith({ error: 'Failed' });
  expectTypeOf(Users.Loading).toBeCallableWith({});

  () => {
    // @ts-expect-error Error owns its required state-specific prop.
    Users.Error({});
  };
});

it('types dot-delimited nested lazy resource paths', () => {
  const { defineResourceLayout: defineBoundLayout } =
    createDefinedResourceLayout({
      value: 'admin',
      subResources: [
        {
          value: 'users',
          subResources: ['detail'],
        },
      ],
    });

  defineBoundLayout.lazy({
    resource: 'admin.users.detail',
    load: async () => ({ Example: (() => null) as never }),
  });

  () => {
    defineBoundLayout.lazy({
      // @ts-expect-error unknown nested resource path
      resource: 'admin.posts',
      load: async () => ({ Example: (() => null) as never }),
    });
  };
});

it('lifts included component props with their call-site optionality', () => {
  const sourceDefinition = defineResourceLayout({
    resources: ['users'],
    options: {
      title: createProp.string(),
    },
    layout: {
      props: {
        include: {
          title: {
            visibility: 'optional',
            passthrough: 'component',
          },
        },
      },
      render: () => <></>,
    },
  });
  const Source = sourceDefinition.createResourceLayout({
    resource: 'users',
    name: 'Source',
  });
  const lifted = createProp.fromComponent(Source).pick('title');
  const targetDefinition = defineResourceLayout({
    resources: ['users'],
    layout: {
      props: { custom: lifted },
      render: () => <></>,
    },
  });
  const Target = targetDefinition.createResourceLayout({
    resource: 'users',
    name: 'Target',
  });

  expectTypeOf(Target).toBeCallableWith({});
  expectTypeOf(Target).toBeCallableWith({ title: 'Optional title' });
});

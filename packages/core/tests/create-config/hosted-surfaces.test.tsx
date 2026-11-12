import type { CreateLayoutComposable } from '@jfdevelops/react-layout';

/** Runtime-guard tests call builders with invalid input; skip overload inference. */
type UntypedCall = (...args: unknown[]) => unknown;
import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  createDefinedResourceLayout,
  createProp,
  defineResourceSurfaces,
} from '@jfdevelops/react-layout';

const root = createDefinedResourceLayout({
  resources: ['users', 'teams'],
});
const pane = root.defineResourceSurface({
  resources: ['create', 'detail'],
  host: {
    resources: ['users'],
  },
  options: {
    title: createProp.string(),
  },
});
const layout = pane.defineResourceLayout({
  props: {
    include: {
      title: true,
    },
  },
  render: ({ title }) => <h1>{title}</h1>,
});

it('creates hosted layouts through direct, single and multiple resource factories', () => {
  const Direct = layout.createResourceLayout({
    resource: 'create',
    hostedBy: 'users',
    title: 'Direct',
  });
  const Bound = layout.createResourceLayout.forResource({
    resource: 'detail',
    hostedBy: 'users',
  })({
    title: 'Bound',
  });
  const Scoped = layout.createResourceLayout.forResources({
    resources: ['create'],
    hostedBy: 'users',
  });
  const Multiple = Scoped({
    resource: 'create',
    title: 'Multiple',
  });
  render(
    <>
      <Direct />
      <Bound />
      <Multiple />
    </>,
  );
  expect(screen.getByText('Direct')).toBeTruthy();
  expect(screen.getByText('Bound')).toBeTruthy();
  expect(screen.getByText('Multiple')).toBeTruthy();
});

function checkTypes() {
  const bindPane = layout.createResourceLayout.forResource;
  const createPane = layout.createResourceLayout;
  const bindPanes = layout.createResourceLayout.forResources;
  const bindRoot = root.defineResourceLayout({
    render: () => <></>,
  }).createResourceLayout.forResource;

  // @ts-expect-error Hosted selection requires a host.
  bindPane({
    resource: 'create',
  });
  bindPane({
    resource: 'create',
    // @ts-expect-error Only declared hosts are accepted.
    hostedBy: 'teams',
  });
  // @ts-expect-error Direct creation requires a host.
  createPane({
    resource: 'create',
    title: 'Missing',
  });
  // @ts-expect-error Hosted factories cannot use the hostless shorthand.
  bindPane('create');
  // @ts-expect-error Multiple resource narrowing requires a host.
  bindPanes({
    resources: ['create'],
  });
  bindRoot({
    // @ts-expect-error Root layouts have no hostedBy option.
    resource: 'users',
    hostedBy: 'teams',
  });
}
void checkTypes;

it('supports wildcard hosts and independent surface contracts', () => {
  const surface = root.defineResourceSurface({
    resources: ['general'],
    host: {
      resources: '*',
    },
  });
  const settings = surface.defineResourceLayout({
    render: () => <p>Settings</p>,
  });
  const Settings = settings.createResourceLayout.forResource({
    resource: 'general',
    hostedBy: 'teams',
  })();
  render(<Settings />);
  expect(screen.getByText('Settings')).toBeTruthy();
});

it('validates host selections at runtime', () => {
  expect(() =>
    Reflect.apply(layout.createResourceLayout as UntypedCall, undefined, [
      {
        resource: 'create',
        title: 'Missing',
      },
    ]),
  ).toThrow('hostedBy');
  expect(() =>
    Reflect.apply(layout.createResourceLayout.forResource as UntypedCall, undefined, [
      {
        resource: 'create',
        hostedBy: 'teams',
      },
    ]),
  ).toThrow('hostedBy');
  expect(() =>
    Reflect.apply(root.defineResourceSurface, undefined, [
      {
        resources: ['create'],
        host: {
          resources: ['missing'],
        },
      },
    ]),
  ).toThrow('Unknown host');
});

const bag = defineResourceSurfaces({
  page: {
    resources: ['users', 'teams'],
    render: () => <p>Page</p>,
  },
  pane: {
    resources: ['create'],
    host: {
      surface: 'page',
      resources: ['users'],
    },
    render: () => <p>Pane</p>,
  },
});

it('creates and registers a bag of surfaces', () => {
  const Pane = bag.pane.createResourceLayout.forResource({
    resource: 'create',
    hostedBy: 'users',
  })();
  render(<Pane />);
  expect(screen.getByText('Pane')).toBeTruthy();
  expect(
    defineResourceSurfaces({
      page: bag.page,
      pane: bag.pane,
    }).pane,
  ).toBe(bag.pane);
});

function checkBagTypes() {
  const bindPane = bag.pane.createResourceLayout.forResource;

  // @ts-expect-error Hosted bag factories require a host.
  bindPane({
    resource: 'create',
  });
  bindPane({
    resource: 'create',
    // @ts-expect-error Hosts are restricted to the declared subset.
    hostedBy: 'teams',
  });
  // @ts-expect-error Unknown sibling keys are rejected.
  defineResourceSurfaces({
    page: {
      resources: ['users'],
      host: {
        surface: 'missing',
        resources: '*',
      },
      render: () => <></>,
    },
  });
  defineResourceSurfaces({
    page: {
      resources: ['users'],
      render: () => <></>,
    },
    pane: {
      resources: ['create'],
      host: {
        surface: 'page',
        // @ts-expect-error Host subsets must belong to the referenced sibling.
        resources: ['missing'],
      },
      render: () => <></>,
    },
  });
}
void checkBagTypes;

const bagWithProps = defineResourceSurfaces({
  page: {
    resources: ['users'],
    options: {
      title: createProp.string(),
    },
    props: {
      include: {
        title: true,
      },
    },
    render: ({ title }) => <h2>{title}</h2>,
  },
});

it('preserves option contracts in the bag API', () => {
  const Page = bagWithProps.page.createResourceLayout({
    resource: 'users',
    title: 'Bag title',
  });
  render(<Page />);
  expect(screen.getByText('Bag title')).toBeTruthy();
});

const shellBag = defineResourceSurfaces({
  page: {
    resources: ['users'],
    name: 'UsersPage',
    shell: {
      render: (_props, { children }) => <main>{children}</main>,
    },
    render: (_props, { name }) => <p>Shell page: {name}</p>,
  },
});

it('uses the existing persistent shell implementation', () => {
  const Page = shellBag.page.createResourceLayout({
    resource: 'users',
  });
  const Overridden = shellBag.page.createResourceLayout({
    resource: 'users',
    name: 'CustomUsersPage',
  });
  render(
    <shellBag.page.Shell>
      <Page />
      <Overridden />
    </shellBag.page.Shell>,
  );
  expect(Page.displayName).toBe('UsersPage');
  expect(Overridden.displayName).toBe('CustomUsersPage');
  expect(screen.getByText('Shell page: UsersPage').closest('main')).toBeTruthy();
  expect(screen.getByText('Shell page: CustomUsersPage').closest('main')).toBeTruthy();
});

it('keeps surfaces without a host independent', () => {
  const independent = root
    .defineResourceSurface({
      resources: ['login'],
    })
    .defineResourceLayout({
      render: () => <p>Login</p>,
    });
  const Login = independent.createResourceLayout.forResource('login')();
  render(<Login />);
  expect(screen.getByText('Login')).toBeTruthy();
});

function createPageComposables(create: CreateLayoutComposable<string>) {
  return {
    Header: create({
      name: 'Header',
    }),
  };
}

const composedOptions = {
  title: createProp.string(),
};
const composedDefinition = createDefinedResourceLayout({
  resources: ['users'],
  options: composedOptions,
  props: {
    include: {
      title: true,
    },
    custom: {
      children: createProp
        .component({
          type: 'ReactNode',
        })
        .optional(),
    },
  },
  composables: createPageComposables,
});
const composedDefault = composedDefinition.createRenderState({
  state: 'default',
  render: ({ title, children }, { composables: { Header } }) => (
    <Header>
      <h3>{title}</h3>
      {children}
    </Header>
  ),
});

const composedBag = defineResourceSurfaces({
  page: {
    resources: ['users'],
    options: composedOptions,
    composables: createPageComposables,
    props: {
      include: {
        title: true,
      },
      custom: {
        children: createProp
          .component({
            type: 'ReactNode',
          })
          .optional(),
      },
    },
    render: {
      ...composedDefault,
    },
  },
  pane: {
    resources: ['create'],
    host: {
      surface: 'page',
      resources: '*',
    },
    render: {
      default: () => <p>Default pane</p>,
    },
  },
});

it('retains composables and render-state maps in bag entries', () => {
  const Page = composedBag.page.createResourceLayout({
    resource: 'users',
    title: 'Composed',
  });
  const Pane = composedBag.pane.createResourceLayout({
    resource: 'create',
    hostedBy: 'users',
  });
  render(
    <Page>
      <Pane />
    </Page>,
  );
  expect(screen.getByText('Composed')).toBeTruthy();
  expect(screen.getByText('Default pane')).toBeTruthy();
});

function checkAdditionalTypes() {
  const scoped = layout.createResourceLayout.forResources({
    resources: ['create'],
    hostedBy: 'users',
  });
  const createPane = layout.createResourceLayout;
  const defineSurface = root.defineResourceSurface;
  const settings = root
    .defineResourceSurface({
      resources: ['general'],
      host: {
        resources: '*',
      },
    })
    .defineResourceLayout({
      render: () => <></>,
    });
  const createSettings = settings.createResourceLayout;

  scoped.forResource({
    resource: 'create',
  })({
    title: 'Scoped',
  });
  scoped({
    // @ts-expect-error The scoped resource set remains narrow.
    resource: 'detail',
    title: 'Wrong mode',
  });
  createPane({
    // @ts-expect-error Pane resources do not include root resources.
    resource: 'users',
    hostedBy: 'users',
    title: 'Wrong',
  });
  defineSurface({
    resources: ['create'],
    host: {
      // @ts-expect-error Unknown host subsets are rejected in the split API.
      resources: ['missing'],
    },
  });
  createSettings({
    resource: 'general',
    // @ts-expect-error Unknown wildcard host ids are rejected.
    hostedBy: 'missing',
  });
}
void checkAdditionalTypes;

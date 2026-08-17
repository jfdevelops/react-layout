import type { JSX } from 'react';
import { describe, expectTypeOf, it } from 'vitest';
import { defineResourceLayout } from '../../src';
import type {
  ExtractPathVariables,
  ParameterizedResourcePath,
  PathComponentKeys,
  PathResourceCandidates,
  PathSubResourceKeys,
  PathVariables,
} from '../../src/create-config';

const { createResourceConfig } = defineResourceLayout({
  resources: [
    {
      value: 'users',
      subResources: [
        'admins',
        {
          value: 'managers',
          subResources: ['female', 'male'],
        },
      ],
    },
    'groups',
  ],
  layout: {
    render: () => null as unknown as JSX.Element,
  },
});

const config = createResourceConfig({
  users: {
    component: null as unknown as JSX.Element,
    errorComponent: null as unknown as JSX.Element,
    detail: {
      component: null as unknown as JSX.Element,
      errorComponent: null as unknown as JSX.Element,
    },
    admins: { component: null as unknown as JSX.Element },
    managers: {
      component: null as unknown as JSX.Element,
      female: { component: null as unknown as JSX.Element },
    },
  },
  groups: {
    component: null as unknown as JSX.Element,
    detail: { component: null as unknown as JSX.Element },
  },
});

type Resources = readonly [
  {
    readonly value: 'users';
    readonly subResources: readonly [
      'admins',
      {
        readonly value: 'managers';
        readonly subResources: readonly ['female', 'male'];
      },
    ];
  },
  'groups',
];
type Config = typeof config.config;

describe('path variables', () => {
  it('extracts the variables a path leaves open', () => {
    expectTypeOf<
      ExtractPathVariables<'$resource.$subResource.$component'>
    >().toEqualTypeOf<'resource' | 'subResource' | 'component'>();
    expectTypeOf<
      ExtractPathVariables<'$resource.detail.$component'>
    >().toEqualTypeOf<'resource' | 'component'>();
    expectTypeOf<ExtractPathVariables<'users.detail.component'>>().toEqualTypeOf<never>();
  });

  it('offers variable and literal segments as paths', () => {
    expectTypeOf<'$resource'>().toExtend<ParameterizedResourcePath<Resources>>();
    expectTypeOf<'$resource.$component'>().toExtend<
      ParameterizedResourcePath<Resources>
    >();
    expectTypeOf<'$resource.$subResource.$component'>().toExtend<
      ParameterizedResourcePath<Resources>
    >();
    expectTypeOf<'$resource.detail.$component'>().toExtend<
      ParameterizedResourcePath<Resources>
    >();
    expectTypeOf<'users.managers.female.component'>().toExtend<
      ParameterizedResourcePath<Resources>
    >();
  });

  it('rejects segments that are not declared in the layout', () => {
    expectTypeOf<'users.nope'>().not.toExtend<
      ParameterizedResourcePath<Resources>
    >();
    expectTypeOf<'$resource.$nope'>().not.toExtend<
      ParameterizedResourcePath<Resources>
    >();
    expectTypeOf<'groups.managers'>().not.toExtend<
      ParameterizedResourcePath<Resources>
    >();
  });
});

describe('resource narrowing', () => {
  it('keeps every resource for a bare $resource path', () => {
    expectTypeOf<
      PathResourceCandidates<Resources, Config, '$resource'>
    >().toEqualTypeOf<'users' | 'groups'>();
  });

  it('keeps only resources that configure the fixed segments', () => {
    expectTypeOf<
      PathResourceCandidates<Resources, Config, '$resource.detail.$component'>
    >().toEqualTypeOf<'users' | 'groups'>();
    expectTypeOf<
      PathResourceCandidates<Resources, Config, '$resource.$subResource'>
    >().toEqualTypeOf<'users'>();
    expectTypeOf<
      PathResourceCandidates<Resources, Config, '$resource.errorComponent'>
    >().toEqualTypeOf<'users'>();
  });

  it('resolves a literal resource segment to that resource', () => {
    expectTypeOf<
      PathResourceCandidates<Resources, Config, 'groups.detail.component'>
    >().toEqualTypeOf<'groups'>();
  });
});

describe('component and sub-resource domains', () => {
  it('offers only the slots configured at the path', () => {
    expectTypeOf<
      PathComponentKeys<Resources, Config, '$resource.detail.$component'>
    >().toEqualTypeOf<'component' | 'errorComponent'>();
    expectTypeOf<
      PathComponentKeys<Resources, Config, 'groups.detail.$component'>
    >().toEqualTypeOf<'component'>();
    expectTypeOf<
      PathComponentKeys<Resources, Config, 'users.$component'>
    >().toEqualTypeOf<'component' | 'errorComponent'>();
  });

  it('offers only the sub-resources configured at the path', () => {
    expectTypeOf<
      PathSubResourceKeys<Resources, Config, '$resource.$subResource'>
    >().toEqualTypeOf<'admins' | 'managers' | 'female'>();
  });
});

describe('path params', () => {
  it('requires one param per variable', () => {
    expectTypeOf<
      PathVariables<Resources, Config, 'users.detail.component'>
    >().toEqualTypeOf<{}>();
    expectTypeOf<
      keyof PathVariables<Resources, Config, '$resource.detail.$component'>
    >().toEqualTypeOf<'resource' | 'component'>();
  });

  it('narrows the component param per resource', () => {
    type UsersDetail = Extract<
      PathVariables<Resources, Config, '$resource.detail.$component'>,
      { resource: 'users' }
    >;
    type GroupsDetail = Extract<
      PathVariables<Resources, Config, '$resource.detail.$component'>,
      { resource: 'groups' }
    >;

    expectTypeOf<UsersDetail['component']>().toEqualTypeOf<
      'component' | 'errorComponent'
    >();
    expectTypeOf<GroupsDetail['component']>().toEqualTypeOf<'component'>();
  });

  it('accepts nested sub-resource params', () => {
    type UsersSubResource = Extract<
      PathVariables<Resources, Config, '$resource.$subResource.$component'>,
      { resource: 'users' }
    >['subResource'];

    expectTypeOf<'admins'>().toExtend<UsersSubResource>();
    expectTypeOf<{
      value: 'managers';
      subResource: 'female';
    }>().toExtend<UsersSubResource>();
  });
});

describe('createGetComponent', () => {
  it('accepts the params a path leaves open', () => {
    expectTypeOf(config.createGetComponent('$resource')).toBeCallableWith({
      resource: 'users',
    });
    expectTypeOf(
      config.createGetComponent('$resource.detail.$component'),
    ).toBeCallableWith({ resource: 'groups', component: 'component' });
    expectTypeOf(
      config.createGetComponent('$resource.$subResource.$component'),
    ).toBeCallableWith({
      resource: 'users',
      subResource: { value: 'managers', subResource: 'female' },
      component: 'component',
    });
  });

  it('resolves a component slot to an element', () => {
    expectTypeOf(
      config.createGetComponent('$resource.$component')({
        resource: 'users',
        component: 'errorComponent',
      }),
    ).toEqualTypeOf<JSX.Element>();
    expectTypeOf(config.createGetComponent('users.detail.component')()).toEqualTypeOf<
      JSX.Element
    >();
  });

  it('resolves a branch to a node with a slot reader', () => {
    const groups = config.createGetComponent('$resource')({
      resource: 'groups',
    });

    expectTypeOf(groups.getComponent('component')).toEqualTypeOf<JSX.Element>();
    expectTypeOf(groups.getComponent).toBeCallableWith('detail');
  });

  it('exposes the path metadata', () => {
    const getDetail = config.createGetComponent('$resource.detail.$component');

    expectTypeOf(getDetail.path).toEqualTypeOf<'$resource.detail.$component'>();
    expectTypeOf(getDetail.variables).toEqualTypeOf<
      ReadonlyArray<'resource' | 'component'>
    >();
    expectTypeOf(getDetail.resources).toEqualTypeOf<
      ReadonlyArray<'users' | 'groups'>
    >();
  });

  it('rejects params outside the config', () => {
    const getResource = config.createGetComponent('$resource');
    const getGroupsDetail = config.createGetComponent(
      'groups.detail.$component',
    );
    const getSubResource = config.createGetComponent('$resource.$subResource');

    () => {
      // @ts-expect-error nope is not a configured resource
      getResource({ resource: 'nope' });
    };
    () => {
      // @ts-expect-error groups detail has no errorComponent
      getGroupsDetail({ component: 'errorComponent' });
    };
    () => {
      // @ts-expect-error groups has no sub-resources
      getSubResource({ resource: 'groups', subResource: 'admins' });
    };
  });
});

describe('forPaths', () => {
  it('types the props from the declared params', () => {
    const ResourceView = config
      .forPaths('$resource.$component')
      .addPathParams()
      .render(({ params, getComponentForPath }) =>
        getComponentForPath('$resource.$component')(params),
      );

    expectTypeOf(ResourceView).toBeCallableWith({
      component: 'errorComponent',
      resource: 'users',
    });
    () => {
      // @ts-expect-error nope is not a configured resource
      ResourceView({ component: 'errorComponent', resource: 'nope' });
    };
  });

  it('narrows a picked path param', () => {
    const ComponentOnly = config
      .forPaths('groups.$component')
      .addPathParams({ pick: { component: true } })
      .render(({ params }) => params.component as unknown as JSX.Element);

    expectTypeOf<
      Parameters<typeof ComponentOnly>[0]
    >().toEqualTypeOf<{ component: 'component' }>();
  });

  it('adds a narrowed componentKey param', () => {
    const Slot = config
      .forPaths('groups.detail')
      .addComponentKeyParams()
      .render(({ params }) => params.componentKey as unknown as JSX.Element);

    expectTypeOf<Parameters<typeof Slot>[0]>().toEqualTypeOf<{
      componentKey: 'component';
    }>();
  });

  it('marks an optional componentKey as optional', () => {
    const Slot = config
      .forPaths('groups.detail')
      .addComponentKeyParams({ optional: true })
      .render(({ params }) => params.componentKey as unknown as JSX.Element);

    expectTypeOf<Parameters<typeof Slot>[0]>().toEqualTypeOf<{
      componentKey?: 'component';
    }>();
  });

  it('merges custom params', () => {
    const Heading = config
      .forPaths('$resource')
      .addParams({ heading: 'Directory' })
      .render(({ params }) => params.heading as unknown as JSX.Element);

    expectTypeOf<Parameters<typeof Heading>[0]>().toEqualTypeOf<{
      heading?: string;
    }>();
  });

  it('drops each builder step once it has been used', () => {
    const builder = config.forPaths('$resource').addPathParams();

    expectTypeOf(builder).not.toHaveProperty('addPathParams');
    expectTypeOf(builder).toHaveProperty('render');
  });

  it('removes bound params from the props of an asHOF component', () => {
    const createResourceView = config
      .forPaths('$resource.$component')
      .addPathParams()
      .render(({ params, getComponentForPath }) =>
        getComponentForPath('$resource.$component')(params),
      )
      .asHOF({ args: { resource: true } });

    expectTypeOf(createResourceView).toBeCallableWith('users');

    const UsersView = createResourceView('users');

    expectTypeOf(UsersView).toBeCallableWith({ component: 'errorComponent' });
    expectTypeOf<Parameters<typeof UsersView>[0]>().not.toHaveProperty(
      'resource',
    );
  });

  it('keeps remaining params after chaining asHOF', () => {
    const createResourceView = config
      .forPaths('$resource.$component')
      .addPathParams()
      .render(({ params, getComponentForPath }) =>
        getComponentForPath('$resource.$component')(params),
      )
      .asHOF({ args: { resource: true } });
    const UsersError = createResourceView('users').asHOF({
      args: { component: true },
    })('errorComponent');

    expectTypeOf<Parameters<typeof UsersError>[0]>().toEqualTypeOf<{}>();
  });

  it('closes over an object when several params are bound', () => {
    const createResourceView = config
      .forPaths('$resource.$component')
      .addPathParams()
      .render(({ params, getComponentForPath }) =>
        getComponentForPath('$resource.$component')(params),
      )
      .asHOF({ args: { component: true, resource: true } });

    expectTypeOf(createResourceView).toBeCallableWith({
      component: 'component',
      resource: 'users',
    });
  });

  it('rejects a path outside the config', () => {
    () => {
      // @ts-expect-error users.nope is not a valid config path
      config.forPaths('users.nope');
    };
  });
});

describe('isSubResourceKey', () => {
  it('narrows by resource', () => {
    const key: unknown = 'admins';

    if (config.isSubResourceKey(key, { resource: 'users' })) {
      expectTypeOf(key).toEqualTypeOf<'admins' | 'managers' | 'female'>();
    }
  });

  it('narrows by path', () => {
    const key: unknown = 'managers';

    if (config.isSubResourceKey(key, { path: '$resource.$subResource' })) {
      expectTypeOf(key).toEqualTypeOf<'admins' | 'managers' | 'female'>();
    }
  });
});

describe('created config metadata', () => {
  it('types the configured sub-resources', () => {
    expectTypeOf(config.subResources).toEqualTypeOf<
      ReadonlyArray<'admins' | 'managers' | 'female'>
    >();
  });
});

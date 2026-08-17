import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  defineResourceLayout,
  InvalidComponentError,
  InvalidConfigError,
  InvalidPathError,
  InvalidResourceError,
  InvalidSubResourceError,
  MissingPathVariableError,
} from '../../src';

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
    render: () => <></>,
  },
});

const usersList = <div data-testid='users-list'>users</div>;
const usersError = <div data-testid='users-error'>users error</div>;
const usersDetail = <div data-testid='users-detail'>users detail</div>;
const usersDetailError = (
  <div data-testid='users-detail-error'>detail error</div>
);
const adminsList = <div data-testid='admins-list'>admins</div>;
const femaleList = <div data-testid='female-list'>female managers</div>;
const groupsList = <div data-testid='groups-list'>groups</div>;
const groupsDetail = <div data-testid='groups-detail'>groups detail</div>;

function createTestConfig() {
  return createResourceConfig({
    users: {
      component: usersList,
      errorComponent: usersError,
      detail: {
        component: usersDetail,
        errorComponent: usersDetailError,
      },
      admins: { component: adminsList },
      managers: {
        component: <div>managers</div>,
        female: { component: femaleList },
      },
    },
    groups: {
      component: groupsList,
      detail: { component: groupsDetail },
    },
  });
}

describe('createGetComponent', () => {
  it('resolves a path with no variables', () => {
    const { createGetComponent } = createTestConfig();

    expect(createGetComponent('users.detail.component')()).toBe(usersDetail);
  });

  it('resolves the $resource variable and reads slots from the node', () => {
    const { createGetComponent } = createTestConfig();
    const getResource = createGetComponent('$resource');

    expect(getResource({ resource: 'users' }).getComponent('component')).toBe(
      usersList,
    );
    expect(getResource({ resource: 'groups' }).getComponent('component')).toBe(
      groupsList,
    );
  });

  it('resolves $resource and $component together', () => {
    const { createGetComponent } = createTestConfig();
    const getComponentForResource = createGetComponent('$resource.$component');

    expect(
      getComponentForResource({
        resource: 'users',
        component: 'errorComponent',
      }),
    ).toBe(usersError);
  });

  it('narrows a fixed segment to the resources that configure it', () => {
    const { createGetComponent } = createTestConfig();
    const getDetail = createGetComponent('$resource.detail.$component');

    expect(getDetail({ resource: 'users', component: 'errorComponent' })).toBe(
      usersDetailError,
    );
    expect(getDetail({ resource: 'groups', component: 'component' })).toBe(
      groupsDetail,
    );
  });

  it('resolves a $subResource variable one level deep', () => {
    const { createGetComponent } = createTestConfig();
    const getSubResource = createGetComponent(
      '$resource.$subResource.$component',
    );

    expect(
      getSubResource({
        resource: 'users',
        subResource: 'admins',
        component: 'component',
      }),
    ).toBe(adminsList);
  });

  it('resolves a nested $subResource param', () => {
    const { createGetComponent } = createTestConfig();
    const getSubResource = createGetComponent(
      '$resource.$subResource.$component',
    );

    expect(
      getSubResource({
        resource: 'users',
        subResource: { value: 'managers', subResource: 'female' },
        component: 'component',
      }),
    ).toBe(femaleList);
  });

  it('returns null for a slot that is not configured on the resolved node', () => {
    const { createGetComponent } = createTestConfig();

    expect(
      createGetComponent('$resource')({ resource: 'groups' }).getComponent(
        'pendingComponent',
      ),
    ).toBeNull();
  });

  it('exposes the path, its variables and the resources it can target', () => {
    const { createGetComponent } = createTestConfig();
    const getDetail = createGetComponent('$resource.detail.$component');

    expect(getDetail.path).toBe('$resource.detail.$component');
    expect(getDetail.variables).toEqual(['resource', 'component']);
    expect(getDetail.resources).toEqual(['users', 'groups']);
  });

  it('narrows values with the variable guards', () => {
    const { createGetComponent } = createTestConfig();
    const getSubResource = createGetComponent(
      '$resource.$subResource.$component',
    );

    expect(getSubResource.isResource('users')).toBe(true);
    expect(getSubResource.isResource('nope')).toBe(false);
    // `groups` has no sub-resources, so it cannot satisfy a `$subResource` path.
    expect(getSubResource.resource.isVariable('groups')).toBe(false);
    expect(getSubResource.resource.isVariable('users')).toBe(true);
    expect(getSubResource.subResource.isVariable('female')).toBe(true);
    expect(getSubResource.subResource.isVariable('groups')).toBe(false);
    expect(getSubResource.component.isVariable('component')).toBe(true);
    expect(getSubResource.isValidSubResource('users', 'admins')).toBe(true);
    expect(getSubResource.isValidSubResource('users', 'groups')).toBe(false);
  });

  it('throws when a required variable is missing', () => {
    const { createGetComponent } = createTestConfig();
    const getResource = createGetComponent('$resource');

    expect(() =>
      (
        getResource as unknown as (
          variables?: Record<string, unknown>,
        ) => unknown
      )(),
    ).toThrowError(MissingPathVariableError);
  });

  it('throws typed errors for values outside the config', () => {
    const { createGetComponent } = createTestConfig();
    const getSubResource = createGetComponent(
      '$resource.$subResource.$component',
    );
    const call = (variables: Record<string, unknown>) =>
      (
        getSubResource as unknown as (
          variables: Record<string, unknown>,
        ) => unknown
      )(variables);

    expect(() =>
      call({ resource: 'nope', subResource: 'admins', component: 'component' }),
    ).toThrowError(InvalidResourceError);
    expect(() =>
      call({ resource: 'users', subResource: 'nope', component: 'component' }),
    ).toThrowError(InvalidSubResourceError);
    expect(() =>
      call({ resource: 'users', subResource: 'admins', component: 'nope' }),
    ).toThrowError(InvalidComponentError);
  });
});

describe('forPaths', () => {
  afterEach(() => {
    cleanup();
  });

  it('rejects a path the config does not support', () => {
    const { forPaths } = createTestConfig();

    expect(() => forPaths('users.missing.component' as never)).toThrowError(
      InvalidPathError,
    );
    expect(() => forPaths('users.missing.component' as never)).toThrowError(
      /Available paths are/,
    );
  });

  it('renders a component built from the path params', () => {
    const { forPaths } = createTestConfig();
    const ResourceComponent = forPaths('$resource.$component')
      .addPathParams()
      .render(({ params, getComponentForPath }) =>
        getComponentForPath('$resource.$component')(params),
      );

    render(<ResourceComponent resource='users' component='errorComponent' />);

    expect(screen.getByTestId('users-error')).toBeDefined();
  });

  it('picks only the requested path params', () => {
    const { forPaths } = createTestConfig();
    const UsersComponent = forPaths('$resource.$component')
      .addPathParams({ pick: { component: true } })
      .render(({ params, getComponentForPath }) =>
        getComponentForPath('$resource.$component')({
          resource: 'users',
          component: params.component,
        }),
      );

    render(<UsersComponent component='component' />);

    expect(screen.getByTestId('users-list')).toBeDefined();
  });

  it('exposes custom params as defaults', () => {
    const { forPaths } = createTestConfig();
    const Heading = forPaths('$resource')
      .addParams({ heading: 'Directory' })
      .render(({ params }) => <h1>{params.heading}</h1>);

    render(<Heading />);

    expect(screen.getByRole('heading').textContent).toBe('Directory');
  });

  it('adds a componentKey param narrowed to the configured slots', () => {
    const { forPaths } = createTestConfig();
    const Slot = forPaths('$resource')
      .addComponentKeyParams()
      .addPathParams({ pick: { resource: true } })
      .render(({ params, getComponentForPath }) =>
        getComponentForPath('$resource')({
          resource: params.resource,
        }).getComponent(params.componentKey),
      );

    render(<Slot resource='users' componentKey='errorComponent' />);

    expect(screen.getByTestId('users-error')).toBeDefined();
  });

  it('throws when a required componentKey is missing or unknown', () => {
    const { forPaths } = createTestConfig();
    const Slot = forPaths('$resource')
      .addComponentKeyParams()
      .render(({ params }) => <div>{String(params.componentKey)}</div>);
    const renderWith = (props: Record<string, unknown>) =>
      (Slot as unknown as (props: Record<string, unknown>) => unknown)(props);

    expect(() => renderWith({})).toThrowError(InvalidComponentError);
    expect(() => renderWith({ componentKey: 'nope' })).toThrowError(
      InvalidComponentError,
    );
  });

  it('allows an optional componentKey to be omitted', () => {
    const { forPaths } = createTestConfig();
    const Slot = forPaths('$resource')
      .addComponentKeyParams({ optional: true })
      .render(({ params }) => <div>{params.componentKey ?? 'none'}</div>);

    render(<Slot />);

    expect(screen.getByText('none')).toBeDefined();
  });

  it('rejects a path the component was not built for', () => {
    const { forPaths } = createTestConfig();
    const Detail = forPaths('$resource.detail.component').render(
      ({ getComponentForPath }) =>
        (getComponentForPath as unknown as (path: string) => () => JSX.Element)(
          '$resource.$component',
        )(),
    );

    expect(() =>
      (Detail as unknown as (props: Record<string, unknown>) => unknown)({}),
    ).toThrowError(InvalidPathError);
  });

  it('names the component statically and from the render context', () => {
    const { forPaths } = createTestConfig();
    const builder = forPaths('$resource').addPathParams();
    const Named = builder
      .render(({ params, getComponentForPath }) =>
        getComponentForPath('$resource')(params).getComponent('component'),
      )
      .setDisplayName('UsersView');
    const Dynamic = builder
      .render(({ params, getComponentForPath }) =>
        getComponentForPath('$resource')(params).getComponent('component'),
      )
      .setDisplayName(({ params }) => `View:${params.resource}`);

    expect(Named.displayName).toBe('UsersView');

    render(<Dynamic resource='groups' />);

    expect(Dynamic.displayName).toBe('View:groups');
  });

  it('binds a single param through asHOF', () => {
    const { forPaths } = createTestConfig();
    const createResourceView = forPaths('$resource.$component')
      .addPathParams()
      .render(({ params, getComponentForPath }) =>
        getComponentForPath('$resource.$component')(params),
      )
      .asHOF({ args: { resource: true } });
    const UsersView = createResourceView('users');

    render(<UsersView component='errorComponent' />);

    expect(screen.getByTestId('users-error')).toBeDefined();
  });

  it('binds several params through asHOF', () => {
    const { forPaths } = createTestConfig();
    const createResourceView = forPaths('$resource.$component')
      .addPathParams()
      .render(({ params, getComponentForPath }) =>
        getComponentForPath('$resource.$component')(params),
      )
      .asHOF({ args: { component: true, resource: true } });
    const UsersError = createResourceView({
      component: 'errorComponent',
      resource: 'users',
    });

    render(<UsersError />);

    expect(screen.getByTestId('users-error')).toBeDefined();
  });
});

describe('isSubResourceKey', () => {
  it('narrows sub-resource keys for a resource', () => {
    const { isSubResourceKey } = createTestConfig();

    expect(isSubResourceKey('admins', { resource: 'users' })).toBe(true);
    expect(isSubResourceKey('female', { resource: 'users' })).toBe(true);
    expect(isSubResourceKey('admins', { resource: 'groups' })).toBe(false);
    expect(isSubResourceKey('component', { resource: 'users' })).toBe(false);
  });

  it('narrows sub-resource keys for a path', () => {
    const { isSubResourceKey } = createTestConfig();

    expect(
      isSubResourceKey('managers', { path: '$resource.$subResource' }),
    ).toBe(true);
    expect(isSubResourceKey('nope', { path: '$resource.$subResource' })).toBe(
      false,
    );
  });
});

describe('created config metadata', () => {
  it('lists every configured sub-resource', () => {
    const { subResources } = createTestConfig();

    expect([...subResources].sort()).toEqual(['admins', 'female', 'managers']);
  });

  it('rejects a config with no resources', () => {
    expect(() => createResourceConfig({})).toThrowError(InvalidConfigError);
  });
});

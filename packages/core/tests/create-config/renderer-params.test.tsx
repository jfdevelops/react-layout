import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { defineResourceLayout } from '../../src';
import { pages } from './fixtures/renderer';

describe('renderer path parameters', () => {
  it('forwards included path variables and permits omitted optional component keys', () => {
    const renderPage = pages.createRenderer({
      params: {
        include: {
          path: true,
          keys: true,
        },
      },
      render: ({ getComponentForPath, path }) => {
        const getComponents = getComponentForPath(path);
        const components = getComponents();

        return components.component;
      },
      factory: {
        render: (_props, { context }) => context.resource,
      },
    });
    const renderResource = renderPage('$resource');
    const resource = renderResource({
      component: 'component',
      params: {
        resource: 'trash',
      },
    });
    expect(resource).toBe('trash');
    const createOptional = pages.createRenderer({
      params: {
        include: {
          keys: {
            optional: true,
          },
          path: false,
        },
      },
      render: () => null,
      factory: {
        render: (_props, { context }) => context.componentKey,
      },
    });
    const Optional = createOptional('trash');
    expect(Optional()).toBeUndefined();
  });

  it('preserves picked and optional path parameters in factories', () => {
    const createSelected = pages.createRenderer({
      params: {
        include: {
          path: {
            pick: {
              resource: true,
            },
          },
        },
      },
      render: () => null,
      factory: {
        render: (_props, { context }) => context.resource,
      },
    });
    const selected = createSelected('$resource.$subResource');
    expect(
      selected({
        params: {
          resource: 'containers',
        },
      }),
    ).toBe('containers');
    // @ts-expect-error Exercise missing required picked params from JS.
    expect(() => selected({})).toThrow('resource');
    const createOptional = pages.createRenderer({
      params: {
        include: {
          path: {
            optional: true,
          },
        },
      },
      render: () => null,
      factory: {
        render: (_props, { context }) => context.resource,
      },
    });
    const optional = createOptional('$resource');
    expect(optional()).toBeUndefined();
  });

  it('preserves getter guards, slot readers, and explicit overrides of bound variables', () => {
    const createPage = pages.createRenderer({
      params: {
        include: {
          path: true,
        },
      },
      render: ({ getComponentForPath, path }) => {
        const getter = getComponentForPath('$resource');
        expect(path).toBe('$resource');
        expect(getter.resource.isVariable('trash')).toBe(true);
        expect(getter.isResource('missing')).toBe(false);
        expect(getter().getComponent('missing')).toBeNull();

        return getter({
          resource: 'containers',
        }).getComponent('component');
      },
    });
    const Component = createPage('$resource');
    expect(renderToStaticMarkup(<Component resource='trash' />)).toBe(
      '<p>Containers</p>',
    );
  });

  it('drills through sub-resource values and narrows component keys to the selected leaf', () => {
    const nested = defineResourceLayout({
      resources: [
        {
          value: 'users',
          subResources: [
            {
              value: 'managers',
              subResources: ['female', 'male'],
            },
          ],
        },
      ],
      layout: {
        render: () => <main />,
      },
    }).createResourceConfig({
      users: {
        component: <p>Users</p>,
        managers: {
          component: <p>Managers</p>,
          female: {
            component: <p>Female</p>,
          },
          male: {
            component: <p>Male</p>,
            errorComponent: <p>Male error</p>,
          },
        },
      },
    });
    const createPage = nested.createRenderer({
      params: {
        include: {
          keys: true,
          path: {
            pick: {
              resource: {
                users: {
                  managers: {
                    female: true,
                  },
                },
              },
              subResource: {
                managers: {
                  female: true,
                },
              },
            },
          },
        },
      },
      render: ({ getComponentForPath, path, params }) => {
        expectTypeOf(params.subResource).toEqualTypeOf<{
          value: 'managers';
          subResource: 'female';
        }>();
        expectTypeOf(params.componentKey).toEqualTypeOf<'component'>();

        const getComponents = getComponentForPath(path);
        const components = getComponents();

        return components.component;
      },
    });
    const Component = createPage('$resource.$subResource');
    expect(
      renderToStaticMarkup(
        <Component
          resource='users'
          subResource={{
            value: 'managers',
            subResource: 'female',
          }}
          componentKey='component'
        />,
      ),
    ).toBe('<p>Female</p>');
    const invalidParams = {
      resource: 'users',
      componentKey: 'component',
      subResource: {
        value: 'managers',
        subResource: 'male',
      },
    } as const;
    // @ts-expect-error The unselected sibling is excluded from the parameter type.
    const invalid = <Component {...invalidParams} />;
    expect(() => renderToStaticMarkup(invalid)).toThrow('male');
  });
});

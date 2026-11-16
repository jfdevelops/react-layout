import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { defineResourceLayout, InvalidPathError } from '../../src';

const { createResourceConfig } = defineResourceLayout({
  resources: [
    {
      value: 'containers',
      subResources: ['$containerId'],
    },
    'trash',
  ],
  layout: {
    render: () => <main />,
  },
});
const pages = createResourceConfig({
  containers: {
    component: <p>Containers</p>,
    $containerId: {
      component: <p>Container</p>,
      errorComponent: <p>Container error</p>,
    },
  },
  trash: {
    component: <p>Trash</p>,
    pendingComponent: <p>Trash pending</p>,
  },
});

describe('createRenderer', () => {
  it('infers component keys and preserves thunk results with either property order', () => {
    const renderPage = pages.createRenderer({
      factory: {
        render: (_props, { context }) => {
          const { Component, componentKey } = context;

          return () => <Component componentKey={componentKey} />;
        },
      },
      displayName: ({ path, params }) => `${path}Page${params.componentKey}`,
      render: ({ getComponentForPath, path, params }) =>
        getComponentForPath(path)()[params.componentKey],
      params: {
        include: {
          keys: true,
        },
      },
    });
    const Component = renderPage('trash')('pendingComponent');
    const Direct = renderPage('containers.$containerId')('errorComponent');
    const Partial =
      renderPage.forPath('containers')('$containerId')('errorComponent');
    expectTypeOf(Component).toEqualTypeOf<() => React.JSX.Element>();
    expect(renderToStaticMarkup(<Component />)).toBe('<p>Trash pending</p>');
    expect(renderToStaticMarkup(<Direct />)).toEqual(
      renderToStaticMarkup(<Partial />),
    );
  });

  it('returns a Component by default and isolates scoped and selected overrides', () => {
    const renderPage = pages.createRenderer({
      render: () => <p>Shared</p>,
    });
    const Original = renderPage('trash');
    const Changed = Original.render(() => <p>Changed</p>);
    const Scoped = renderPage
      .forPath('containers')
      .render(({ path }) => <p>{path}</p>)
      .build();
    expect(renderToStaticMarkup(<Original />)).toBe('<p>Shared</p>');
    expect(renderToStaticMarkup(<Changed />)).toBe('<p>Changed</p>');
    expect(renderToStaticMarkup(<Scoped />)).toBe('<p>containers</p>');
    expect(renderToStaticMarkup(<Original />)).toBe('<p>Shared</p>');
  });

  it('validates custom input and factory props and preserves arbitrary return values', () => {
    const renderPage = pages.createRenderer({
      params: {
        include: {
          keys: true,
        },
        custom: {
          count: z.string().transform(Number),
        },
      },
      render: ({ params }) => {
        expectTypeOf(params.count).toEqualTypeOf<number>();

        return <p>{params.count}</p>;
      },
      factory: {
        props: {
          label: z.string(),
          enabled: z.boolean().default(true),
        },
        render: (props, { context }) => {
          expectTypeOf(context.count).toEqualTypeOf<number>();
          expectTypeOf(props.enabled).toEqualTypeOf<boolean>();

          return {
            count: context.count,
            label: props.label,
            enabled: props.enabled,
          };
        },
      },
    });
    const output = renderPage('trash')(
      {
        componentKey: 'component',
        count: '42',
      },
      {
        label: 'Count',
      },
    );
    expectTypeOf(output).toEqualTypeOf<{
      count: number;
      label: string;
      enabled: boolean;
    }>();
    expect(output).toEqual({
      count: 42,
      label: 'Count',
      enabled: true,
    });
    expect(() =>
      renderPage('trash')(
        {
          componentKey: 'component',
          count: '1',
        },
        {
          label: 123 as unknown as string,
        },
      ),
    ).toThrow('label');
  });

  it('preserves direct JSX and primitive factory returns', () => {
    const element = pages.createRenderer({
      render: () => null,
      factory: {
        render: () => <p>Element</p>,
      },
    })('trash')({});
    const value = pages.createRenderer({
      render: () => null,
      factory: {
        render: () => 42 as const,
      },
    })('trash')({});
    expectTypeOf(element).toEqualTypeOf<React.JSX.Element>();
    expectTypeOf(value).toEqualTypeOf<42>();
    expect(renderToStaticMarkup(element)).toBe('<p>Element</p>');
    expect(value).toBe(42);
  });

  it('supports schema parameters and optional included keys on existing builders', () => {
    const Component = pages
      .forPaths('trash')
      .addParams({
        include: {
          keys: {
            optional: true,
          },
        },
        custom: {
          title: z.string().default('Default'),
        },
      })
      .render(({ params }) => {
        expectTypeOf(params.title).toEqualTypeOf<string>();
        expectTypeOf(params.componentKey).toEqualTypeOf<
          'component' | 'pendingComponent' | undefined
        >();

        return <p>{params.title}</p>;
      });
    expect(renderToStaticMarkup(<Component />)).toBe('<p>Default</p>');
    expect(renderToStaticMarkup(<Component title='Custom' />)).toBe(
      '<p>Custom</p>',
    );
  });

  it('keeps a factory and its render override separate across sibling scopes', () => {
    const shared = pages.createRenderer({
      render: () => <p>Shared</p>,
      factory: {
        render: (_props, { context: { Component } }) => <Component />,
      },
    });
    const custom = shared.forPath('trash').render(() => <p>Custom</p>);
    expect(renderToStaticMarkup(custom.build()({}))).toBe('<p>Custom</p>');
    expect(renderToStaticMarkup(shared('trash')({}))).toBe('<p>Shared</p>');
  });
  it('carries included path variables through the factory and bound getter', () => {
    const renderPage = pages.createRenderer({
      params: {
        include: {
          path: true,
          keys: true,
        },
      },
      render: ({ getComponentForPath, path }) =>
        getComponentForPath(path)().component,
      factory: {
        render: (_props, { context }) => context.resource,
      },
    });
    expect(
      renderPage('$resource')({
        resource: 'trash',
        componentKey: 'component',
      }),
    ).toBe('trash');
    const Component = pages.createRenderer({
      params: {
        include: {
          path: true,
        },
      },
      render: ({ getComponentForPath, path }) =>
        getComponentForPath(path)().component,
    })('$resource');
    expect(renderToStaticMarkup(<Component resource='trash' />)).toBe(
      '<p>Trash</p>',
    );
    const Optional = pages.createRenderer({
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
    })('trash');
    expect(Optional()).toBeUndefined();
  });

  it('preserves picked and optional path parameters in factories', () => {
    const selected = pages.createRenderer({
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
    })('$resource.$subResource');
    expect(
      selected({
        resource: 'containers',
      }),
    ).toBe('containers');
    // @ts-expect-error Exercise missing required picked params from JS.
    expect(() => selected({})).toThrow('resource');
    const optional = pages.createRenderer({
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
    })('$resource');
    expect(optional()).toBeUndefined();
  });

  it('preserves getter guards, slot readers, and explicit overrides of bound variables', () => {
    const Component = pages.createRenderer({
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
    })('$resource');
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
    const Component = nested.createRenderer({
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

        return getComponentForPath(path)().component;
      },
    })('$resource.$subResource');
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

  it('narrows component values within a selected shared branch', () => {
    const nested = defineResourceLayout({
      resources: ['users'],
      layout: {
        render: () => <main />,
      },
    }).createResourceConfig({
      users: {
        component: <p>Users</p>,
        detail: {
          component: <p>Detail</p>,
          errorComponent: <p>Detail error</p>,
        },
      },
    });
    const Component = nested
      .forPaths('$resource.detail.$component')
      .addParams({
        include: {
          path: {
            pick: {
              resource: {
                users: true,
              },
              component: {
                errorComponent: true,
              },
            },
          },
        },
      })
      .render(({ params, getComponentForPath }) => {
        expectTypeOf(params.component).toEqualTypeOf<'errorComponent'>();

        return getComponentForPath('$resource.detail.$component')(params);
      });
    expect(
      renderToStaticMarkup(
        <Component resource='users' component='errorComponent' />,
      ),
    ).toBe('<p>Detail error</p>');
  });

  it('rejects invalid paths, component keys, and colliding parameter names at runtime', () => {
    const shared = pages.createRenderer({
      params: {
        include: {
          keys: true,
        },
      },
      render: () => null,
      factory: {
        render: () => 42,
      },
    });
    const unknownPath: string = 'missing';
    // @ts-expect-error Exercise invalid runtime input from JS consumers.
    expect(() => shared(unknownPath)).toThrow('missing');
    // @ts-expect-error Exercise an invalid key from JS consumers.
    expect(() => shared('trash')('errorComponent')).toThrow('errorComponent');
    const params: import('../../src').PathParamsOptions = {
      custom: {
        Component: z.string(),
      },
    };
    expect(() =>
      pages.createRenderer({
        params,
        render: () => null,
      }),
    ).toThrow('reserved');
  });

  it('selects and builds a parent scope whose own page is unselected', () => {
    const renderPage = pages.createRenderer({
      params: {
        include: {
          path: {
            pick: {
              resource: {
                containers: {
                  $containerId: true,
                },
              },
            },
          },
        },
      },
      render: ({ getComponentForPath, path }) =>
        getComponentForPath(path)().component,
    });
    const Nested = renderPage('containers')('$containerId');
    const Built = renderPage
      .forPath('containers')
      .render(() => <p>Custom</p>)
      .build();
    expect(renderToStaticMarkup(<Nested />)).toBe('<p>Container</p>');
    expect(renderToStaticMarkup(<Built />)).toBe('<p>Custom</p>');
    expect(() => renderPage.build()).toThrowError(InvalidPathError);
  });
});

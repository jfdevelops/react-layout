import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { defineResourceLayout, InvalidPathError } from '../../src';
import { pages } from './fixtures/renderer';

describe('createRenderer', () => {
  it('selects shared detail pages without evaluating the parent factory', () => {
    let factoryCalls = 0;
    const layout = defineResourceLayout({
      resources: ['users'],
      layout: {
        render: () => <main />,
      },
    });
    const config = layout.createResourceConfig({
      users: {
        component: <p>Users</p>,
        detail: {
          component: <p>Detail</p>,
          errorComponent: <p>Error</p>,
        },
      },
    });
    const renderPage = config.createRenderer({
      params: {
        include: {
          keys: true,
        },
      },
      render: () => null,
      factory: {
        render: (_props, { context }) => {
          factoryCalls += 1;

          return context.componentKey;
        },
      },
    });
    const renderUsers = renderPage('users');
    const renderDetail = renderUsers.forResource('detail');
    const renderDirect = renderPage('users.detail');
    expect(factoryCalls).toBe(0);
    const detail = renderDetail({
      component: '*',
    });
    const direct = renderDirect({
      component: '*',
    });
    expect(factoryCalls).toBe(4);
    expectTypeOf<keyof typeof detail>().toEqualTypeOf<
      'component' | 'errorComponent'
    >();
    expect(detail).toEqual(direct);
    expect(detail).toEqual({
      component: 'component',
      errorComponent: 'errorComponent',
    });
    expect(renderDetail).not.toHaveProperty('forResource');
    expectTypeOf(renderDetail).not.toHaveProperty('forResource');
  });

  it('preserves scoped overrides when selecting descendants of components', () => {
    const renderPage = pages.createRenderer({
      render: () => <p>Shared</p>,
    });
    const Parent = renderPage('containers');
    const ChangedParent = Parent.render(({ path }) => <p>{path}</p>);
    const Child = ChangedParent.forResource('$containerId');
    const OriginalChild = Parent.forResource('$containerId');
    expect(renderToStaticMarkup(<Child />)).toBe(
      '<p>containers.$containerId</p>',
    );
    expect(renderToStaticMarkup(<OriginalChild />)).toBe('<p>Shared</p>');
    expect(Child).not.toHaveProperty('forResource');
    expectTypeOf(Child).not.toHaveProperty('forResource');
    const missing: string = 'missing';
    // @ts-expect-error Relative selections must be configured descendants.
    expect(() => Parent.forResource(missing)).toThrow(InvalidPathError);
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

  it('keeps a factory and its render override separate across sibling scopes', () => {
    const shared = pages.createRenderer({
      render: () => <p>Shared</p>,
      factory: {
        render: (_props, { context: { Component } }) => <Component />,
      },
    });
    const custom = shared.forPath('trash').render(() => <p>Custom</p>);
    const createCustom = custom.build();
    const createShared = shared('trash');
    const customElement = createCustom({});
    const sharedElement = createShared({});
    expect(renderToStaticMarkup(customElement)).toBe('<p>Custom</p>');
    expect(renderToStaticMarkup(sharedElement)).toBe('<p>Shared</p>');
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
    const renderTrash = shared('trash');
    expect(() =>
      renderTrash({
        // @ts-expect-error Exercise an invalid key from JS consumers.
        component: 'errorComponent',
      }),
    ).toThrow('errorComponent');
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
      render: ({ getComponentForPath, path }) => {
        const getComponents = getComponentForPath(path);
        const components = getComponents();

        return components.component;
      },
    });
    const containers = renderPage('containers');
    const Nested = containers('$containerId');
    const Built = renderPage
      .forPath('containers')
      .render(() => <p>Custom</p>)
      .build();
    expect(renderToStaticMarkup(<Nested />)).toBe('<p>Container</p>');
    expect(renderToStaticMarkup(<Built />)).toBe('<p>Custom</p>');
    expect(() => renderPage.build()).toThrowError(InvalidPathError);
  });

  it('allows omitted factory props when every input prop is optional', () => {
    const renderPage = pages.createRenderer({
      params: {
        include: {
          keys: true,
        },
      },
      render: () => null,
      factory: {
        props: {
          label: z.string().optional(),
          count: z.number().default(1),
        },
        render: (props) => props,
      },
    });
    const renderTrash = renderPage('trash');
    const single = renderTrash({
      component: 'component',
    });
    const all = renderTrash({
      component: '*',
    });
    const supplied = renderTrash({
      component: 'component',
      props: {
        label: 'Trash',
        count: 2,
      },
    });
    expectTypeOf(single.label).toEqualTypeOf<string | undefined>();
    expectTypeOf(single.count).toEqualTypeOf<number>();
    expectTypeOf(all).toEqualTypeOf<{
      component: typeof single;
      pendingComponent: typeof single;
    }>();
    expect(single).toEqual({
      count: 1,
    });
    expect(all).toEqual({
      component: single,
      pendingComponent: single,
    });
    expect(supplied).toEqual({
      label: 'Trash',
      count: 2,
    });
  });

  it('omits the entire options object when all factory inputs are optional', () => {
    const renderOptional = pages.createRenderer({
      render: () => null,
      factory: {
        props: {
          label: z.string().default('Default'),
        },
        render: (props) => props.label,
      },
    });
    const optional = renderOptional('trash');
    const omitted = optional();
    const explicit = optional({
      props: {
        label: 'Explicit',
      },
    });
    expect(omitted).toBe('Default');
    expect(explicit).toBe('Explicit');
  });

  it('accepts props without params and validates the factory options object', () => {
    const renderPage = pages.createRenderer({
      render: () => null,
      factory: {
        props: {
          label: z.string(),
        },
        render: (props) => props.label,
      },
    });
    const renderTrash = renderPage('trash');
    const result = renderTrash({
      props: {
        label: 'Trash',
      },
    });
    expectTypeOf(result).toEqualTypeOf<string>();
    expect(result).toBe('Trash');
    const invalidComponent = {
      component: {
        componentKey: 'component',
      },
    };
    // @ts-expect-error Component selection no longer accepts parameter objects.
    expect(() => renderTrash(invalidComponent)).toThrow(
      'component must be a component key',
    );
    const misplacedKey = {
      params: {
        componentKey: 'component',
      },
    };
    // @ts-expect-error Component keys cannot be supplied under params.
    expect(() => renderTrash(misplacedKey)).toThrow(
      'component key in component',
    );
    // @ts-expect-error Required props cannot be omitted, even without params.
    expect(() => renderTrash()).toThrow('label');
    // @ts-expect-error Positional factory calls have been replaced by options.
    expect(() => renderTrash('component')).toThrow('options must be an object');
    expect(() =>
      renderTrash({
        // @ts-expect-error Props must be an object for JavaScript callers too.
        props: 'invalid',
      }),
    ).toThrow('props must be an object');
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
    const renderTrash = renderPage('trash');
    const output = renderTrash({
      component: 'component',
      params: {
        count: '42',
      },
      props: {
        label: 'Count',
      },
    });
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
      renderTrash({
        component: 'component',
        params: {
          count: '1',
        },
        props: {
          label: 123 as unknown as string,
        },
      }),
    ).toThrow('label');
  });

  it('preserves direct JSX and primitive factory returns', () => {
    const renderElement = pages.createRenderer({
      render: () => null,
      factory: {
        render: () => <p>Element</p>,
      },
    });
    const createElement = renderElement('trash');
    const element = createElement({});
    const renderValue = pages.createRenderer({
      render: () => null,
      factory: {
        render: () => 42 as const,
      },
    });
    const createValue = renderValue('trash');
    const value = createValue({});
    expectTypeOf(element).toEqualTypeOf<React.JSX.Element>();
    expectTypeOf(value).toEqualTypeOf<42>();
    expect(renderToStaticMarkup(element)).toBe('<p>Element</p>');
    expect(value).toBe(42);
  });

  it('returns all factory results keyed by the selected path component keys', () => {
    const renderPage = pages.createRenderer({
      params: {
        include: {
          keys: true,
        },
      },
      render: ({ getComponentForPath, path, params }) => {
        const getComponents = getComponentForPath(path);
        const components = getComponents();

        return components[params.componentKey];
      },
      factory: {
        props: {
          label: z.string(),
        },
        render: (props, { context: { Component, componentKey } }) => {
          return () => (
            <section aria-label={props.label}>
              <Component componentKey={componentKey} />
            </section>
          );
        },
      },
    });
    const renderTrash = renderPage('trash');
    const all = renderTrash({
      component: '*',
      props: {
        label: 'All',
      },
    });
    expectTypeOf(all).toEqualTypeOf<{
      component: () => React.JSX.Element;
      pendingComponent: () => React.JSX.Element;
    }>();
    expect(Object.keys(all)).toEqual(['component', 'pendingComponent']);
    expect(renderToStaticMarkup(<all.component />)).toBe(
      '<section aria-label="All"><p>Trash</p></section>',
    );
    expect(renderToStaticMarkup(<all.pendingComponent />)).toBe(
      '<section aria-label="All"><p>Trash pending</p></section>',
    );
    const containers = renderPage.forPath('containers');
    const renderContainer = containers('$containerId');
    const nested = renderContainer({
      component: '*',
      props: {
        label: 'Nested',
      },
    });
    expectTypeOf(nested).toEqualTypeOf<{
      component: () => React.JSX.Element;
      errorComponent: () => React.JSX.Element;
    }>();
    expect(Object.keys(nested)).toEqual(['component', 'errorComponent']);
    expect(() =>
      renderTrash({
        component: '*',
        props: {
          label: 123 as unknown as string,
        },
      }),
    ).toThrow('label');
  });

  it('passes custom parameters to every wildcard factory result', () => {
    const renderPage = pages.createRenderer({
      params: {
        include: {
          keys: true,
        },
        custom: {
          count: z.number(),
        },
      },
      render: () => null,
      factory: {
        render: (_props, { context }) => context.count,
      },
    });
    const selected = renderPage('trash');
    const all = selected({
      component: '*',
      params: {
        count: 42,
      },
    });
    expectTypeOf(all).toEqualTypeOf<{
      component: number;
      pendingComponent: number;
    }>();
    expect(all).toEqual({
      component: 42,
      pendingComponent: 42,
    });
    expect(() =>
      // @ts-expect-error Required custom inputs must be supplied under params.
      selected({
        component: '*',
      }),
    ).toThrow('count');
  });

  it('capitalizes an explicit path and widens wildcard results to valid strings', () => {
    const renderPage = pages.createRenderer({
      render: () => null,
      displayName: ({ path }) => {
        const explicit = path.capitalize('containers.$containerId');
        const all = path.capitalize('*');
        expectTypeOf(explicit).toEqualTypeOf<'Containers.$containerId'>();
        expectTypeOf(all).toEqualTypeOf<
          | 'Containers'
          | 'Containers.$containerId'
          | 'Containers.$subResource'
          | 'Trash'
          | '$resource'
          | '$resource.$containerId'
          | '$resource.$subResource'
        >();
        expect(all).toBe('Trash');
        if (path.is('trash')) {
          const wildcard = path.capitalize('*');
          expectTypeOf(wildcard).toEqualTypeOf<typeof all>();
        }

        const invalid: string = 'missing';
        // @ts-expect-error Unknown paths are rejected by the caller contract too.
        expect(() => path.capitalize(invalid)).toThrow(InvalidPathError);

        return explicit;
      },
    });
    const Component = renderPage('trash');
    renderToStaticMarkup(<Component />);
    expect(Component.displayName).toBe('Containers.$containerId');
  });

  it('limits wildcard capitalization to the selected path configuration', () => {
    const renderPage = pages.createRenderer({
      params: {
        include: {
          path: {
            pick: {
              resource: {
                trash: true,
              },
            },
          },
        },
      },
      render: () => null,
      displayName: ({ path }) => {
        const all = path.capitalize('*');
        expectTypeOf(all).toEqualTypeOf<'Trash' | '$resource'>();
        expect(all).toBe('Trash');

        return all;
      },
    });
    const Component = renderPage('trash');
    renderToStaticMarkup(<Component />);
    expect(Component.displayName).toBe('Trash');
  });

  it('narrows display-name paths and reuses capitalization helpers', () => {
    const renderPage = pages.createRenderer({
      render: () => null,
      displayName: ({ path, capitalize }) => {
        if (path.is('containers')) {
          expectTypeOf(path.value).toEqualTypeOf<
            'containers' | 'containers.$containerId' | 'containers.$subResource'
          >();

          if (path.is('containers.$containerId')) {
            expectTypeOf(path.value).toEqualTypeOf<'containers.$containerId'>();
            expectTypeOf(
              path.capitalize(),
            ).toEqualTypeOf<'Containers.$containerId'>();

            return path.capitalize();
          }

          return capitalize(path.value);
        }

        return `${path}`;
      },
    });
    const names = (
      ['containers', 'containers.$containerId', 'trash'] as const
    ).map((path) => {
      const Component = renderPage(path);
      renderToStaticMarkup(<Component />);

      return Component.displayName;
    });
    expect(names).toEqual(['Containers', 'Containers.$containerId', 'trash']);
  });

  it('matches nested parent paths on dot boundaries', () => {
    const config = defineResourceLayout({
      resources: [
        {
          value: 'author',
          subResources: [
            {
              value: 'address',
              subResources: ['city'],
            },
          ],
        },
        'authorId',
      ],
      layout: {
        render: () => <main />,
      },
    }).createResourceConfig({
      author: {
        component: <p>Author</p>,
        address: {
          component: <p>Address</p>,
          city: {
            component: <p>City</p>,
          },
        },
      },
      authorId: {
        component: <p>ID</p>,
      },
    });
    const renderPage = config.createRenderer({
      render: () => null,
      displayName: ({ path }) => {
        if (path.value === 'authorId') {
          // @ts-expect-error Unknown paths cannot be tested.
          path.is('missing');
        }

        if (path.is('author.address')) {
          expectTypeOf(path.value).toEqualTypeOf<
            'author.address' | 'author.address.city'
          >();

          return 'Address';
        }

        return path.is('author') ? 'Author' : 'ID';
      },
    });
    const names = [
      renderPage('author.address.city'),
      renderPage.forPath('author').build(),
      renderPage('authorId'),
    ].map((Component) => {
      renderToStaticMarkup(<Component />);

      return Component.displayName;
    });
    expect(names).toEqual(['Address', 'Author', 'ID']);
  });

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

        const getComponent = getComponentForPath('$resource.detail.$component');
        const component = getComponent(params);

        return component;
      });
    expect(
      renderToStaticMarkup(
        <Component resource='users' component='errorComponent' />,
      ),
    ).toBe('<p>Detail error</p>');
  });
});

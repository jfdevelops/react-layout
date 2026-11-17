import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { defineResourceLayout, InvalidPathError } from '../../src';
import { pages } from './fixtures/renderer';

describe('resource renderer selection', () => {
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
});

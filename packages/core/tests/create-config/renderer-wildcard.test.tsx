import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { pages } from './fixtures/renderer';

describe('renderer wildcard selection', () => {
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
});

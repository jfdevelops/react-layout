import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { defineResourceLayout } from '../../src';
import { pages } from './fixtures/renderer';

describe('schema-backed path builder parameters', () => {
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

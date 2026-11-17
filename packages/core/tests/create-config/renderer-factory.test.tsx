import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { pages } from './fixtures/renderer';

describe('renderer factory inputs and results', () => {
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
});

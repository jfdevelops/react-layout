import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import {
  composablePresetMetaKey,
  defineComposableComponent,
  LayoutComposablePresetProvider,
} from '../src';
import { z } from 'zod';

function Frame({ children, label }: { children?: ReactNode; label: string }) {
  return <section aria-label={label}>{children}</section>;
}

describe('factory property name collisions', () => {
  afterEach(cleanup);

  it.each([
    'props',
    'extend',
    'name',
    'length',
    'prototype',
    'arguments',
    'caller',
    'constructor',
    '__proto__',
    'toString',
  ] as const)('preserves the factory API for a composable named %s', (name) => {
    const create = defineComposableComponent({
      name,
      props: {
        value: z.string(),
      },
    });
    const Component = create(({ value }) => <p>{value}</p>)[name];

    render(<Component value='Direct' />);
    expect(screen.getByText('Direct')).toBeInTheDocument();
    expect(create.props.value).toBeDefined();
    expect(
      create.extend({
        name: 'Other',
      }).Other.props,
    ).toEqual(create.props);

    const renamed = defineComposableComponent({
      name: 'Original',
      props: {
        value: z.string(),
      },
    }).extend({
      name,
    });
    const Renamed = renamed(({ value }) => <p>{value}</p>)[name];

    render(<Renamed value='Renamed' />);
    expect(screen.getByText('Renamed')).toBeInTheDocument();

    const contextual = defineComposableComponent
      .defineContext({})
      .handler(() => ({
        name,
        props: {
          value: z.string(),
        },
      }));
    const Contextual = contextual(({ value }) => <p>{value}</p>)[name];

    render(<Contextual value='Contextual' />);
    expect(screen.getByText('Contextual')).toBeInTheDocument();
    expect(
      contextual.extend({
        name: 'Other',
      }).Other.props,
    ).toEqual(contextual.props);
  });
});

describe('defined composable factory overloads', () => {
  const createLabel = defineComposableComponent({
    name: 'Label',
    props: {
      value: z.string(),
      suffix: z.string(),
    },
    wrapWith: Frame,
  });

  it('accepts a render callback and a render-only object with the same defaults', () => {
    const legacy = createLabel(({ value, suffix }) => value + suffix);
    const object = createLabel({
      render: ({ value, suffix }) => value + suffix,
    });
    render(
      <>
        <legacy.Label value='Legacy' suffix='!' label='Legacy frame' />
        <object.Label value='Object' suffix='!' label='Object frame' />
      </>,
    );
    expect(screen.getByLabelText('Legacy frame')).toHaveTextContent('Legacy!');
    expect(screen.getByLabelText('Object frame')).toHaveTextContent('Object!');
  });

  it('merges replacement and extra props while retaining unmodified definitions', () => {
    const { Count } = createLabel({
      name: 'Count',
      props: {
        value: z.number(),
        prefix: z.string(),
      },
      render: ({ value, prefix, suffix }) => `${prefix}${value}${suffix}`,
    });
    const definitions = Count[composablePresetMetaKey].props;
    expect(definitions.value.type).toBe('number');
    expect(definitions.suffix).toBe(createLabel.props.suffix);
    expect(createLabel.props.value.type).toBe('string');
    expect(Count.displayName).toBe('Count');
    expect(Count[composablePresetMetaKey].key).toBe('Count');
    render(<Count value={2} prefix='#' suffix='!' label='Count frame' />);
    expect(screen.getByLabelText('Count frame')).toHaveTextContent('#2!');
    expect(() =>
      Count({
        value: 'wrong',
        prefix: '#',
        suffix: '!',
        label: 'Invalid',
      } as never),
    ).toThrow();
  });

  it('uses customized preset metadata when values come from a layout provider', () => {
    const { Count } = createLabel({
      name: 'Count',
      props: (defaults) => ({
        value: z.number(),
        suffix: defaults.suffix,
      }),
      wrapWith: 'aside',
      render: ({ value, suffix }) => `${value}${suffix}`,
    });
    render(
      <LayoutComposablePresetProvider
        value={{
          Count: {
            value: 3,
            suffix: '!',
          },
        }}
      >
        <Count {...({} as { value: number; suffix: string })} />
      </LayoutComposablePresetProvider>,
    );
    expect(screen.getByText('3!').tagName).toBe('ASIDE');
  });
});

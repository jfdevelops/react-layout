import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createProp } from '@jfdevelops/react-layout-validator';
import type { ReactNode } from 'react';
import {
  composablePresetMetaKey,
  defineComposableComponent,
  LayoutComposablePresetProvider,
} from '../src';

function Frame({ children, label }: { children?: ReactNode; label: string }) {
  return <section aria-label={label}>{children}</section>;
}

describe('defined composable factory overloads', () => {
  const createLabel = defineComposableComponent({
    name: 'Label',
    props: { value: createProp.string(), suffix: createProp.string() },
    wrapWith: Frame,
  });

  it('accepts a render callback and a render-only object with the same defaults', () => {
    const legacy = createLabel(({ value, suffix }) => value + suffix);
    const object = createLabel({
      render: ({ value, suffix }) => value + suffix,
    });
    render(
      <>
        <legacy.Label value="Legacy" suffix="!" label="Legacy frame" />
        <object.Label value="Object" suffix="!" label="Object frame" />
      </>,
    );
    expect(screen.getByLabelText('Legacy frame')).toHaveTextContent('Legacy!');
    expect(screen.getByLabelText('Object frame')).toHaveTextContent('Object!');
  });

  it('merges replacement and extra props while retaining unmodified definitions', () => {
    const { Count } = createLabel({
      name: 'Count',
      props: { value: createProp.number(), prefix: createProp.string() },
      render: ({ value, prefix, suffix }) => `${prefix}${value}${suffix}`,
    });
    const definitions = Count[composablePresetMetaKey].props;
    expect(definitions.value.type).toBe('number');
    expect(definitions.suffix).toBe(createLabel.props.suffix);
    expect(createLabel.props.value.type).toBe('string');
    expect(Count.displayName).toBe('Count');
    expect(Count[composablePresetMetaKey].key).toBe('Count');
    render(<Count value={2} prefix="#" suffix="!" label="Count frame" />);
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
        value: createProp.number(),
        suffix: defaults.suffix,
      }),
      wrapWith: 'aside',
      render: ({ value, suffix }) => `${value}${suffix}`,
    });
    render(
      <LayoutComposablePresetProvider
        value={{ Count: { value: 3, suffix: '!' } }}
      >
        <Count value={undefined as never} suffix={undefined as never} />
      </LayoutComposablePresetProvider>,
    );
    expect(screen.getByText('3!').tagName).toBe('ASIDE');
  });
});

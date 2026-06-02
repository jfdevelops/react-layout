import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createComposableComponent, createProp, makeComposable } from '../src';

describe('composable helpers', () => {
  it('renders resolved out props into function children', () => {
    const Badge = createComposableComponent({
      name: 'Badge',
      inProps: {
        tone: createProp.string().literal('info'),
      },
      outProps: () => ({
        label: 'Admin',
      }),
    });

    render(
      <div>
        {Badge({
          tone: 'info',
          children: ({ label }: { label: string }) => <span>{label}</span>,
        })}
      </div>,
    );

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(Badge.displayName).toBe('Badge');
  });

  it('requires a Layout composable when composing a layout', () => {
    const createComposition = makeComposable<{}>();

    expect(() =>
      createComposition({
        name: 'UsersLayout',
        components: {
          Header: createComposableComponent({
            name: 'Header',
          }),
        },
      }),
    ).toThrow('The Layout composable is required');
  });
});

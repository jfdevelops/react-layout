import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createActionsComposable, InvalidIntentError } from '../src';
import { createActionsComposable as contract } from '../src/contract';

describe('actions contract', () => {
  it('is the preset exported by the package', () => {
    expect(createActionsComposable).toBe(contract);
  });

  it('renders link-style actions with their intent', () => {
    const { Actions } = createActionsComposable(({ actions }) => (
      <div>
        {Object.entries(actions).map(([key, action]) => (
          <a
            key={key}
            href={action.href}
            data-intent={action.intent ?? 'default'}
            aria-disabled={action.isDisabled}
          >
            {action.value}
          </a>
        ))}
      </div>
    ));

    render(
      <Actions
        actions={{
          create: {
            value: 'New user',
            href: '/users/new',
            intent: 'primary',
          },
          archive: {
            value: 'Archive',
            isDisabled: true,
          },
        }}
      />,
    );
    expect(
      screen.getByRole('link', {
        name: 'New user',
      }),
    ).toHaveAttribute('data-intent', 'primary');
    expect(screen.getByText('Archive')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('rejects an unknown intent', () => {
    const { Actions } = createActionsComposable(() => null);

    expect(() =>
      render(
        createElement(Actions, {
          actions: {
            create: {
              value: 'New user',
              intent: 'loud',
            },
          },
        } as never),
      ),
    ).toThrow(
      /Invalid prop "actions": "create" has the intent "loud"; expected primary, destructive/,
    );
  });

  it('reports an unknown intent as the cause of the prop error', () => {
    const { Actions } = createActionsComposable(() => null);
    let caught: unknown;

    try {
      render(
        createElement(Actions, {
          actions: {
            create: {
              value: 'New user',
              intent: 'loud',
            },
          },
        } as never),
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).cause).toBeInstanceOf(InvalidIntentError);
    expect((caught as Error).cause).toMatchObject({
      code: 'invalidIntent',
      context: {
        action: 'create',
        intent: 'loud',
        intents: ['primary', 'destructive'],
      },
    });
  });

  it('describes an unknown intent with its own error', () => {
    const error = new InvalidIntentError({
      action: 'create',
      intent: 'loud',
      intents: ['primary'],
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: 'InvalidIntentError',
      code: 'invalidIntent',
      context: {
        action: 'create',
        intent: 'loud',
        intents: ['primary'],
      },
    });
    expect(() =>
      InvalidIntentError.invariant(false, {
        action: 'archive',
        intent: 1,
        intents: ['primary'],
      }),
    ).toThrow(/"archive" has the intent 1/);
  });

  it('uses the intents chosen where the composable is created', () => {
    const { Actions } = createActionsComposable({
      intents: ['primary', 'ghost'],
      render: ({ actions }) => (
        <p>
          {Object.values(actions)
            .map((action) => action.intent)
            .join(',')}
        </p>
      ),
    });

    render(
      <Actions
        actions={{
          create: {
            value: 'New user',
            intent: 'ghost',
          },
        }}
      />,
    );
    expect(screen.getByText('ghost')).toBeInTheDocument();
    expect(() =>
      render(
        createElement(Actions, {
          actions: {
            archive: {
              value: 'Archive',
              intent: 'destructive',
            },
          },
        } as never),
      ),
    ).toThrow(
      /"archive" has the intent "destructive"; expected primary, ghost/,
    );
  });

  it('adds to the default intents with a function', () => {
    const { Actions } = createActionsComposable({
      intents: (defaults) => [...defaults, 'ghost'],
      render: ({ actions }) => (
        <p>
          {Object.values(actions)
            .map((action) => action.intent)
            .join(',')}
        </p>
      ),
    });

    render(
      <Actions
        actions={{
          create: {
            value: 'New user',
            intent: 'primary',
          },
          more: {
            value: 'More',
            intent: 'ghost',
          },
        }}
      />,
    );
    expect(screen.getByText('primary,ghost')).toBeInTheDocument();
  });

  it('derives a list with its own name and prop', () => {
    const { Shortcuts } = createActionsComposable.extend({
      name: 'Shortcuts',
      rename: {
        actions: 'shortcuts',
      },
    })(({ shortcuts }) => <p>{Object.keys(shortcuts).join(',')}</p>);

    render(
      <Shortcuts
        shortcuts={{
          docs: {
            value: 'Docs',
          },
          support: {
            value: 'Support',
          },
        }}
      />,
    );
    expect(screen.getByText('docs,support')).toBeInTheDocument();
  });
});

import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import {
  collectComposablePresetEntries,
  createPropValidator,
  defineComposableComponent,
} from '../src';

afterEach(cleanup);

describe('defined composable inline validators', () => {
  const createNotice = defineComposableComponent({
    name: 'Notice',
    props: {
      title: ({ value, error }) => {
        if (typeof value !== 'string') {
          throw error('Expected text');
        }

        return value;
      },
      tone: ({ value, error }) => {
        if (value === undefined || value === 'info' || value === 'warning') {
          return value;
        }

        throw error('Expected info or warning');
      },
      count: z.number(),
    },
  });

  it('types and validates props declared as functions', () => {
    const { Notice } = createNotice(({ title, tone, count }) => {
      expectTypeOf(title).toEqualTypeOf<string>();
      expectTypeOf(tone).toEqualTypeOf<string | undefined>();
      expectTypeOf(count).toEqualTypeOf<number>();

      return <p>{`${title} ${tone ?? 'info'} ${count}`}</p>;
    });

    render(<Notice title='Saved' count={2} />);
    expect(screen.getByText('Saved info 2')).toBeInTheDocument();
    expect(() =>
      render(
        createElement(Notice, {
          title: 1,
          count: 2,
        } as never),
      ),
    ).toThrow(/Invalid prop "title": Expected text/);
    expect(() =>
      render(
        createElement(Notice, {
          title: 'Saved',
          tone: 'loud',
          count: 2,
        } as never),
      ),
    ).toThrow(/Invalid prop "tone": Expected info or warning/);
  });

  it('shares one definition with every derived composable', () => {
    const createBanner = createNotice.extend({
      name: 'Banner',
      props: {
        isDismissible: ({ value }) => Boolean(value),
      },
    });

    expect(createBanner.props.title).toBe(createNotice.props.title);
    expect(
      collectComposablePresetEntries({
        ...createNotice(() => null),
        ...createBanner(({ isDismissible }) => {
          expectTypeOf(isDismissible).toEqualTypeOf<boolean>();

          return null;
        }),
      }).map(({ key }) => key),
    ).toEqual(['Notice', 'Banner']);
  });

  it('accepts a validator as a renamed prop definition', () => {
    const { Notice } = createNotice({
      rename: {
        title: {
          name: 'heading',
          schema: ({ value }) => Number(value),
        },
      },
      render: ({ heading }) => {
        expectTypeOf(heading).toEqualTypeOf<number>();

        return <p>{heading}</p>;
      },
    });

    render(<Notice heading={404} count={1} />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('reuses a validator created once', () => {
    const copy = createPropValidator(({ value }) => String(value));
    const createCard = defineComposableComponent({
      name: 'Card',
      props: {
        title: copy,
        description: copy.optional(),
      },
    });

    expect(createCard.props.title).toBe(copy);
    expect(createCard.props.description).toBe(copy.optional());
  });
});

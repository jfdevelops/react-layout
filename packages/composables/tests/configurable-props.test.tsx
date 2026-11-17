import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { builtIn, defineComposableComponent } from '../src';

afterEach(cleanup);

describe('defined composable context', () => {
  const createNotice = defineComposableComponent
    .defineContext({
      tones: {
        value: ['info', 'warning'] as const,
      },
      limit: {
        value: 3,
        handler: ({ value, supplied }) => Math.min(value, supplied),
      },
    })
    .handler(({ tones, limit }) => ({
      name: 'Notice',
      props: {
        title: builtIn.string,
        tone: builtIn.literal(...tones),
        lines: ({ value, error }) => {
          const lines = builtIn
            .array(builtIn.string)
            ['~standard'].validate(value);

          if (lines instanceof Promise || lines.issues) {
            throw error('Expected lines of text');
          }

          if (lines.value.length > limit) {
            throw error(`Expected at most ${limit} lines`);
          }

          return lines.value;
        },
      },
    }));

  it('uses the default values when the caller supplies none', () => {
    const { Notice } = createNotice(({ title, tone, lines }) => {
      expectTypeOf(title).toEqualTypeOf<string>();
      expectTypeOf(tone).toEqualTypeOf<string>();
      expectTypeOf(lines).toEqualTypeOf<string[]>();

      return <p>{`${title} ${tone} ${lines.length}`}</p>;
    });

    render(<Notice title='Saved' tone='info' lines={['a']} />);
    expect(screen.getByText('Saved info 1')).toBeInTheDocument();
    expect(() =>
      render(
        createElement(Notice, {
          title: 'Saved',
          tone: 'loud',
          lines: [],
        } as never),
      ),
    ).toThrow(/Invalid prop "tone": Expected one of info, warning/);
  });

  it('takes a value in the call', () => {
    const { Notice } = createNotice({
      tones: ['loud'],
      render: ({ tone }) => <p>{tone}</p>,
    });

    render(<Notice title='Saved' tone='loud' lines={[]} />);
    expect(screen.getByText('loud')).toBeInTheDocument();
    expect(() =>
      render(
        createElement(Notice, {
          title: 'Saved',
          tone: 'info',
          lines: [],
        } as never),
      ),
    ).toThrow(/Invalid prop "tone": Expected one of loud/);
  });

  it('takes a function that receives the default', () => {
    const { Notice } = createNotice({
      tones: (defaults) => {
        expectTypeOf(defaults).toEqualTypeOf<ReadonlyArray<string>>();

        return [...defaults, 'loud'];
      },
      render: ({ tone }) => <p>{tone}</p>,
    });

    render(
      <>
        <Notice title='Saved' tone='info' lines={[]} />
        <Notice title='Saved' tone='loud' lines={[]} />
      </>,
    );
    expect(screen.getByText('info')).toBeInTheDocument();
    expect(screen.getByText('loud')).toBeInTheDocument();
  });

  it('lets an entry decide how a supplied value is applied', () => {
    const { Notice } = createNotice({
      limit: 10,
      render: ({ lines }) => <p>{lines.length}</p>,
    });

    expect(() =>
      render(
        createElement(Notice, {
          title: 'Saved',
          tone: 'info',
          lines: ['a', 'b', 'c', 'd'],
        } as never),
      ),
    ).toThrow(/Invalid prop "lines": Expected at most 3 lines/);
  });

  it('keeps the other options beside the context values', () => {
    const createAlert = createNotice.extend({
      name: 'Alert',
      tones: ['critical'],
      rename: {
        title: 'heading',
      },
    });
    const { Alert } = createAlert(({ heading, tone }) => {
      expectTypeOf(heading).toEqualTypeOf<string>();

      return <p>{`${heading} ${tone}`}</p>;
    });

    render(<Alert heading='Down' tone='critical' lines={[]} />);
    expect(screen.getByText('Down critical')).toBeInTheDocument();
    expect(Object.keys(createAlert.props)).toEqual([
      'heading',
      'tone',
      'lines',
    ]);
    expect(Object.keys(createNotice.props)).toEqual(['title', 'tone', 'lines']);
  });

  it('rejects a value of the wrong type and a reserved option name', () => {
    createNotice({
      // @ts-expect-error The limit is a number.
      limit: 'many',
      render: () => null,
    });
    defineComposableComponent.defineContext({
      // @ts-expect-error `name` is an option of every defined composable.
      name: {
        value: 'Notice',
      },
    });
    expect(createNotice.props.title).toBe(builtIn.string);
  });
});

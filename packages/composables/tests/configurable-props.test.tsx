import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import {
  builtIn,
  defineComposableComponent,
  InvalidComposablePropsError,
} from '../src';

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

  it('exposes the default definitions under its name', () => {
    expect(createNotice.Notice.props).toBe(createNotice.props);
    expect(
      createNotice.Notice.props.tone['~standard'].validate('info'),
    ).toEqual({
      value: 'info',
    });
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

  it('takes a function value from a function of the default', () => {
    const createLabel = defineComposableComponent
      .defineContext({
        format: {
          value: (text: string) => text,
        },
      })
      .handler(({ format }) => ({
        name: 'Label',
        props: {
          text: ({ value }) => format(String(value)),
        },
      }));
    const { Label } = createLabel({
      format: (defaultFormat) => {
        expectTypeOf(defaultFormat).toEqualTypeOf<(text: string) => string>();

        return (text) => defaultFormat(text).toUpperCase();
      },
      render: ({ text }) => <p>{text}</p>,
    });

    render(<Label text='saved' />);
    expect(screen.getByText('SAVED')).toBeInTheDocument();

    // Type check only: called, the function would receive the default.
    function supplyFormatDirectly() {
      return createLabel({
        // @ts-expect-error A function value is returned from a function.
        format: (text: string) => text.toUpperCase(),
        render: () => null,
      });
    }

    expectTypeOf(supplyFormatDirectly).toBeFunction();
  });

  it('rejects a value of the wrong type and a reserved option name', () => {
    createNotice({
      // @ts-expect-error The limit is a number.
      limit: 'many',
      render: () => null,
    });
    expect(() =>
      defineComposableComponent.defineContext({}).handler(() => ({
        name: 'Notice',
        props: {
          children: 'required',
          // Constraining the returned props would cost inline validators
          // their inferred argument, so this is rejected when it is defined.
          title: 'required',
        },
      })),
    ).toThrow(InvalidComposablePropsError);
    defineComposableComponent.defineContext({
      // @ts-expect-error `name` is an option of every defined composable.
      name: {
        value: 'Notice',
      },
    });
    expect(createNotice.props.title).toBe(builtIn.string);
  });
});

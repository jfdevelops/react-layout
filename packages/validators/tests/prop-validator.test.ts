import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import {
  createPropValidator,
  isStandardSchema,
  normalizePropDefinitions,
  PropError,
  PropValidatorError,
  validateProps,
  type PropValidatorSchema,
  type ResolveProps,
} from '../src';

function capturePropError(validate: () => unknown) {
  let caught: unknown;

  try {
    validate();
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(PropError);

  return caught as PropError;
}

describe('createPropValidator', () => {
  const text = createPropValidator(({ value, error }) => {
    if (typeof value !== 'string') {
      throw error('Expected text');
    }

    return value;
  });

  it('creates a prop definition typed by the validator', () => {
    expect(isStandardSchema(text)).toBe(true);
    expectTypeOf(text).toEqualTypeOf<PropValidatorSchema<string>>();
    expect(
      validateProps(
        {
          title: text,
        },
        {
          title: 'Users',
        },
      ),
    ).toEqual({
      title: 'Users',
    });
  });

  it('creates a custom error with the error helper', () => {
    let created: unknown;
    const cause = new Error('cause');

    createPropValidator(({ value, error }) => {
      created = error('Expected text', {
        cause,
      });

      return value;
    })['~standard'].validate('Users');

    expect(created).toBeInstanceOf(PropValidatorError);
    expect(created).toMatchObject({
      code: 'invalidPropValue',
      message: 'Expected text',
      cause,
    });
  });

  it('passes the returned value to the composable', () => {
    const count = createPropValidator(({ value }) => Number(value));

    expectTypeOf(count).toEqualTypeOf<PropValidatorSchema<number>>();
    expectTypeOf<
      ResolveProps<{
        count: typeof count;
      }>['count']
    >().toEqualTypeOf<number>();
    expect(
      validateProps(
        {
          count,
        },
        {
          count: '2',
        },
      ),
    ).toEqual({
      count: 2,
    });
  });

  it('rejects a value with the thrown error message', () => {
    const error = capturePropError(() =>
      validateProps(
        {
          title: text,
        },
        {
          title: 1,
        },
      ),
    );

    expect(error.path).toBe('title');
    expect(error.message).toBe('Invalid prop "title": Expected text');
  });

  it('reports any thrown error, with a default message when it has none', () => {
    const never = createPropValidator(({ value }) => {
      throw value;
    });
    const strict = createPropValidator(() => {
      throw new RangeError('Out of range');
    });

    expect(() =>
      validateProps(
        {
          strict,
        },
        {},
      ),
    ).toThrow(/Invalid prop "strict": Out of range/);

    const error = capturePropError(() =>
      validateProps(
        {
          never,
        },
        {
          never: 'x',
        },
      ),
    );

    expect(error.message).toBe(
      'Invalid prop "never": Value did not pass validation',
    );
  });

  it('makes a prop optional with one shared definition', () => {
    const optionalText = text.optional();

    expect(text.optional()).toBe(optionalText);
    expectTypeOf(optionalText).toEqualTypeOf<
      PropValidatorSchema<string | undefined>
    >();
    expectTypeOf<
      ResolveProps<{
        title: typeof text;
        description: typeof optionalText;
      }>
    >().toMatchTypeOf<{
      title: string;
      description?: string | undefined;
    }>();
    expectTypeOf<{
      title: string;
    }>().toMatchTypeOf<
      ResolveProps<{
        title: typeof text;
        description: typeof optionalText;
      }>
    >();
    expect(
      validateProps(
        {
          description: optionalText,
        },
        {},
      ),
    ).toEqual({});
    expect(() =>
      validateProps(
        {
          description: optionalText,
        },
        {
          description: 1,
        },
      ),
    ).toThrow(/Invalid prop "description": Expected text/);
  });
});

describe('normalizePropDefinitions', () => {
  it('turns inline validators into definitions and keeps schemas', () => {
    const title = z.string();
    const definitions = normalizePropDefinitions({
      title,
      isOpen: ({ value, error }) => {
        if (typeof value !== 'boolean') {
          throw error('Expected true or false');
        }

        return value;
      },
    });

    expect(definitions.title).toBe(title);
    expect(isStandardSchema(definitions.isOpen)).toBe(true);
    expectTypeOf(definitions.isOpen).toEqualTypeOf<
      PropValidatorSchema<boolean>
    >();
    expect(() =>
      validateProps(definitions, {
        title: 'Users',
        isOpen: 'yes',
      }),
    ).toThrow(/Invalid prop "isOpen": Expected true or false/);
  });
});

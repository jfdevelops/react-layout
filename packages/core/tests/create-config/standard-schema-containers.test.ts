import { expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { createProp, validateProps } from '../../src';

it('returns transformed schema outputs from legacy arrays, objects, and records', () => {
  const count = z.string().transform(Number);
  const array = createProp.array(count);
  const object = createProp.object({
    count,
  });
  const record = createProp.record(count);

  expectTypeOf(array(['2'])).toEqualTypeOf<number[]>();
  expect(array(['2'])).toEqual([2]);
  expect(
    object({
      count: '2',
    }),
  ).toEqual({
    count: 2,
  });
  expect(
    record({
      first: '2',
    }),
  ).toEqual({
    first: 2,
  });
});

it('applies nested defaults and optionality in legacy objects', () => {
  const object = createProp.object({
    count: z.string().default('2').transform(Number),
    label: z.string().optional(),
    legacy: createProp.string().optional(),
  });

  expect(object({})).toEqual({
    count: 2,
  });
  expect(object._baseProp.allows({})).toBe(true);
  expect(
    object({
      count: '3',
      label: undefined,
    }),
  ).toEqual({
    count: 3,
    label: undefined,
  });
  expect(() =>
    object({
      label: 4,
    }),
  ).toThrow();
  expect(
    object._baseProp.allows({
      label: 4,
    }),
  ).toBe(false);
});

it('propagates nested container outputs through validateProps without mutating inputs', () => {
  const shape = {
    items: createProp.array(
      createProp.object({
        count: z.string().default('2').transform(Number),
        labels: createProp.record(z.string().transform((value) => value.length)),
        enabled: createProp.boolean(),
      }),
    ),
  };
  const item = Object.freeze({
    labels: Object.freeze({
      first: 'text',
    }),
    enabled: true,
  });
  const input = Object.freeze({
    items: Object.freeze([item]),
  });

  expect(validateProps(shape, input)).toEqual({
    items: [
      {
        count: 2,
        labels: {
          first: 4,
        },
        enabled: true,
      },
    ],
  });
  expect(input).toEqual({
    items: [
      {
        labels: {
          first: 'text',
        },
        enabled: true,
      },
    ],
  });
});

it('preserves undefined schema outputs and legacy primitive values', () => {
  const absent = z.string().transform(() => undefined);

  expect(createProp.array(absent)(['value'])).toEqual([undefined]);
  expect(
    createProp.record(absent)({
      first: 'value',
    }),
  ).toEqual({
    first: undefined,
  });
  expect(
    createProp.object({
      value: absent,
    })({
      value: 'value',
    }),
  ).toEqual({
    value: undefined,
  });
  expect(
    validateProps(
      {
        value: createProp.object({
          name: createProp.string(),
        }),
      },
      {
        value: {
          name: 'Name',
        },
      },
    ),
  ).toEqual({
    value: {
      name: 'Name',
    },
  });
});

it('propagates transforms and defaults from union container members', () => {
  const count = z.string().transform(Number);
  const cases = [
    {
      definition: createProp.array(count).or(createProp.boolean()),
      input: ['2'],
      output: [2],
    },
    {
      definition: createProp
        .object({
          count: z.string().default('2').transform(Number),
        })
        .or(createProp.boolean()),
      input: {},
      output: {
        count: 2,
      },
    },
    {
      definition: createProp.record(count).or(createProp.boolean()),
      input: {
        first: '2',
      },
      output: {
        first: 2,
      },
    },
  ];

  for (const { definition, input, output } of cases) {
    expect(definition(input)).toEqual(output);
    expect(
      validateProps(
        {
          value: definition,
        },
        {
          value: input,
        },
      ),
    ).toEqual({
      value: output,
    });
    expect(
      createProp.object({
        value: definition,
      })({
        value: input,
      }),
    ).toEqual({
      value: output,
    });
    expect(definition(true)).toBeUndefined();
    expect(
      validateProps(
        {
          value: definition,
        },
        {
          value: true,
        },
      ),
    ).toEqual({
      value: true,
    });
    expect(() => definition(null)).toThrow();
  }
});

it('validates the selected union member once and preserves pure legacy inputs', () => {
  let transforms = 0;
  const definition = createProp
    .array(
      z.string().transform((value) => {
        transforms++;

        return Number(value);
      }),
    )
    .or(createProp.boolean());

  expect(
    validateProps(
      {
        value: definition,
      },
      {
        value: ['2'],
      },
    ),
  ).toEqual({
    value: [2],
  });
  expect(transforms).toBe(1);
  const cause = new Error('Cause');
  const error = new Error('Failure', {
    cause,
  });
  const legacy = createProp
    .object({
      message: createProp.string(),
    })
    .or(createProp.boolean());

  expect(
    validateProps(
      {
        error: legacy,
      },
      {
        error,
      },
    ).error,
  ).toBe(error);
});

import { createSchema, fail, pass } from '../schema';

/** Accepts a string. */
export const string = createSchema((value) =>
  typeof value === 'string' ? pass(value) : fail('Expected a string'),
);

/** Accepts a number other than `NaN`. */
export const number = createSchema((value) =>
  typeof value === 'number' && !Number.isNaN(value)
    ? pass(value)
    : fail('Expected a number'),
);

/** Accepts `true` or `false`. */
export const boolean = createSchema((value) =>
  typeof value === 'boolean' ? pass(value) : fail('Expected true or false'),
);

/** Accepts any value. */
export const unknown = createSchema((value) => pass(value));

/** Accepts a function, which includes a component. */
export const callable = createSchema((value) =>
  typeof value === 'function'
    ? pass(value as (...input: never[]) => unknown)
    : fail('Expected a function'),
);

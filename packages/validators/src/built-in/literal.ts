import { createSchema, fail, pass } from '../schema';

type Literal = bigint | boolean | number | string | null | undefined;

/** Accepts one of the listed values. */
export function literal<const Values extends ReadonlyArray<Literal>>(
  ...values: Values
) {
  return createSchema((value) =>
    values.includes(value as Literal)
      ? pass(value as Values[number])
      : fail(`Expected one of ${values.map(String).join(', ')}`),
  );
}

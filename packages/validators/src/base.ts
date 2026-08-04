import type { BasePropOptions, PropType, PropVisibility } from './types';
import {
  createMismatchedPropMessage,
  getPropValueType,
  PropError,
} from './prop-error';

export const primitiveTypes = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  object: 'object',
  array: 'array',
  date: 'date',
  regex: 'regex',
  error: 'error',
  symbol: 'symbol',
  bigint: 'bigint',
};

export abstract class BaseProp<
  Type extends PropType,
  Visibility extends PropVisibility,
  Value = unknown,
> {
  readonly type: Type;
  readonly visibility: Visibility;
  readonly value?: Value;

  constructor(options: BasePropOptions<Type, Visibility, Value>) {
    const { type, visibility, value } = options;

    this.type = type;
    this.visibility = visibility;
    this.value = value;
  }

  protected createError(value: unknown) {
    const received = getPropValueType(value);

    return new PropError({
      received,
      expected: this.type,
      message: createMismatchedPropMessage({
        path: 'value',
        received,
        expected: this.type,
      }),
      path: 'value',
    });
  }

  abstract validate(value: unknown): void;
  abstract allows(value: unknown): value is Value;
}

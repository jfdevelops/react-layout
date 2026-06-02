import type { BasePropOptions, PropType, PropVisibility } from './types';

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

function createInvalidPropValueMessage(type: string) {
  return `"value" is not of type "${type}".`;
}

export class InvalidPropValueError<Type extends string> extends Error {
  constructor(type: Type) {
    super(createInvalidPropValueMessage(type));

    this.name = 'InvalidPropValueError';
  }
}

export abstract class BaseProp<
  Type extends PropType,
  Visibility extends PropVisibility,
  Value = unknown,
> {
  readonly type: Type;
  readonly visibility: Visibility;
  readonly value?: Value;

  protected error: InvalidPropValueError<Type>;

  constructor(options: BasePropOptions<Type, Visibility, Value>) {
    const { type, visibility, value } = options;

    this.type = type;
    this.visibility = visibility;
    this.value = value;
    this.error = new InvalidPropValueError(type);
  }

  abstract validate(value: unknown): void;
  abstract allows(value: unknown): value is Value;
}

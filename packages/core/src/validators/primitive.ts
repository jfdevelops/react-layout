import type {
  NonEmptyReadonlyArray,
  PropVisibility,
} from './types';
import { BaseProp } from './base';
import { EnumProp } from './enum';
import { LiteralProp } from './literal';

export class StringProp<Visibility extends PropVisibility> extends BaseProp<
  'string',
  Visibility,
  string
> {
  constructor(visibility: Visibility) {
    super({ type: 'string', visibility });
  }

  optional(this: StringProp<'required'>) {
    return new StringProp('optional');
  }

  literal<const Value extends string>(value: Value) {
    return new LiteralProp(value, 'string', this.visibility);
  }

  enum<const Values extends NonEmptyReadonlyArray<string>>(values: Values) {
    return new EnumProp(values, 'string', this.visibility);
  }

  validate(value: unknown) {
    if (typeof value !== 'string') {
      throw this.error;
    }
  }

  allows(value: unknown): value is string {
    return typeof value === 'string';
  }
}

export class NumberProp<Visibility extends PropVisibility> extends BaseProp<
  'number',
  Visibility,
  number
> {
  constructor(visibility: Visibility) {
    super({ type: 'number', visibility });
  }

  optional(this: NumberProp<'required'>) {
    return new NumberProp('optional');
  }

  literal<const Value extends number>(value: Value) {
    return new LiteralProp(value, 'number', this.visibility);
  }

  enum<const Values extends NonEmptyReadonlyArray<number>>(values: Values) {
    return new EnumProp(values, 'number', this.visibility);
  }

  validate(value: unknown) {
    if (typeof value !== 'number') {
      throw this.error;
    }
  }

  allows(value: unknown): value is number {
    return typeof value === 'number';
  }
}

export class BooleanProp<Visibility extends PropVisibility> extends BaseProp<
  'boolean',
  Visibility,
  boolean
> {
  constructor(visibility: Visibility) {
    super({ type: 'boolean', visibility });
  }

  optional(this: BooleanProp<'required'>) {
    return new BooleanProp('optional');
  }

  literal<const Value extends boolean>(value: Value) {
    return new LiteralProp(value, 'boolean', this.visibility);
  }

  enum<const Values extends NonEmptyReadonlyArray<boolean>>(values: Values) {
    return new EnumProp(values, 'boolean', this.visibility);
  }

  validate(value: unknown) {
    if (typeof value !== 'boolean') {
      throw this.error;
    }
  }

  allows(value: unknown): value is boolean {
    return typeof value === 'boolean';
  }
}

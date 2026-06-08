import type {
  PrimitivePropType,
  PrimitiveTypesMap,
  PropVisibility,
} from './types';
import { BaseProp } from './base';

export class LiteralProp<
  const Value extends PrimitiveTypesMap[Type],
  Type extends PrimitivePropType,
  Visibility extends PropVisibility,
> extends BaseProp<Type, Visibility, Value> {
  declare readonly value: Value;

  constructor(value: Value, type: Type, visibility: Visibility) {
    super({ type, visibility, value });
  }

  optional(this: LiteralProp<Value, Type, 'required'>) {
    return new LiteralProp(this.value, this.type, 'optional');
  }

  validate(value: unknown) {
    if (value !== this.value) {
      throw this.error;
    }
  }

  allows(value: unknown): value is Value {
    return value === this.value;
  }
}

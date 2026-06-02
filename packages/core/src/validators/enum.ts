import type {
  NonEmptyReadonlyArray,
  PrimitivePropType,
  PrimitiveTypesMap,
  PropVisibility,
} from './types';
import { BaseProp, primitiveTypes } from './base';

export class EnumProp<
  const Values extends NonEmptyReadonlyArray<PrimitiveTypesMap[Type]>,
  Type extends PrimitivePropType,
  Visibility extends PropVisibility,
> extends BaseProp<Type, Visibility, Values[number]> {
  private readonly allowedValues: Values;

  constructor(values: Values, type: Type, visibility: Visibility) {
    super({ type, visibility });
    this.allowedValues = values;
  }

  optional(this: EnumProp<Values, Type, 'required'>) {
    return new EnumProp(this.allowedValues, this.type, 'optional');
  }

  validate(value: unknown) {
    if (typeof value !== primitiveTypes[this.type]) {
      throw this.error;
    }

    if (
      !(this.allowedValues as readonly PrimitiveTypesMap[Type][]).includes(
        value as PrimitiveTypesMap[Type],
      )
    ) {
      throw this.error;
    }
  }

  allows(value: unknown): value is Values[number] {
    return this.allowedValues.includes(value as never);
  }
}

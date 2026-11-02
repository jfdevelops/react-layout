import { BaseProp } from './base';
import {
  PropError,
  createMismatchedPropMessage,
  createMissingPropMessage,
} from './prop-error';
import type {
  AnyBuiltPropDefinition,
  ExtractDefinitionValue,
  PropVisibility,
} from './types';

export class ArrayProp<
  Item extends AnyBuiltPropDefinition,
  Visibility extends PropVisibility = 'required',
> extends BaseProp<'array', Visibility, ExtractDefinitionValue<Item>[]> {
  constructor(readonly itemProp: Item, visibility: Visibility) {
    super({ type: 'array', visibility });
  }

  optional(this: ArrayProp<Item, 'required'>) {
    return new ArrayProp(this.itemProp, 'optional');
  }

  validate(value: unknown) {
    if (!Array.isArray(value)) {
      throw this.createError(value);
    }

    for (let index = 0; index < value.length; index++) {
      try {
        this.itemProp(value[index]);
      } catch (error) {
        if (!(error instanceof PropError)) throw error;
        const path =
          error.path === 'value' ? `${index}` : `${index}.${error.path}`;
        throw new PropError({
          path,
          received: error.received,
          expected: error.expected,
          message: error.message.startsWith('Invalid prop')
            ? createMismatchedPropMessage({
                path,
                received: error.received,
                expected: error.expected,
              })
            : createMissingPropMessage({ path }),
        });
      }
    }

    return value as ExtractDefinitionValue<Item>[];
  }

  allows(value: unknown): value is ExtractDefinitionValue<Item>[] {
    try {
      this.validate(value);
      return true;
    } catch {
      return false;
    }
  }
}

import type {
  BuiltPropShape,
  ExtractDefinitionValue,
  PropVisibility,
  ResolvedBuiltPropShape,
} from './types';
import { BaseProp } from './base';
import {
  createMismatchedPropMessage,
  createMissingPropMessage,
  PropError,
} from './prop-error';

export class ObjectProp<
  const Shape extends BuiltPropShape,
  Visibility extends PropVisibility,
> extends BaseProp<
  'object',
  Visibility,
  ResolvedBuiltPropShape<Shape>
> {
  readonly properties: Shape;

  constructor(properties: Shape, visibility: Visibility) {
    super({ type: 'object', visibility });
    this.properties = properties;
  }

  optional(this: ObjectProp<Shape, 'required'>) {
    return new ObjectProp(this.properties, 'optional');
  }

  validate(value: unknown) {
    const validatedObject = {} as ResolvedBuiltPropShape<Shape>;

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw this.createError(value);
    }

    const objectValue = value as Record<string, unknown>;

    for (const key in this.properties) {
      const prop = this.properties[key];
      const propertyValue = objectValue[key];

      if (propertyValue === undefined) {
        if (prop.visibility !== 'optional') {
          throw new PropError({
            path: key,
            received: Object.keys(objectValue),
            expected: Object.keys(this.properties),
            message: createMissingPropMessage({ path: key }),
          });
        }

        continue;
      }

      try {
        prop(propertyValue);
      } catch (error) {
        if (!(error instanceof PropError)) {
          throw error;
        }

        const path = error.path === 'value' ? key : `${key}.${error.path}`;

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
      (validatedObject as Record<string, ExtractDefinitionValue<Shape[string]>>)[
        key
      ] = propertyValue as ExtractDefinitionValue<Shape[typeof key]>;
    }

    return validatedObject;
  }

  allows(value: unknown): value is ResolvedBuiltPropShape<Shape> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    const objectValue = value as Record<string, unknown>;

    for (const key in this.properties) {
      const prop = this.properties[key];
      const propertyValue = objectValue[key];

      if (propertyValue === undefined) {
        if (prop.visibility !== 'optional') {
          return false;
        }

        continue;
      }

      try {
        prop(propertyValue);
      } catch {
        return false;
      }
    }

    return true;
  }
}

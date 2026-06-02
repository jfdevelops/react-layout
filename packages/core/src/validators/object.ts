import type {
  BuiltPropShape,
  PropVisibility,
  ResolveBuiltPropValue,
} from './types';
import { BaseProp } from './base';

export class ObjectProp<
  const Shape extends BuiltPropShape,
  Visibility extends PropVisibility,
> extends BaseProp<
  'object',
  Visibility,
  {
    [Key in keyof Shape]: ResolveBuiltPropValue<Shape[Key]>;
  }
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
    const validatedObject = {} as {
      [Key in keyof Shape]: ResolveBuiltPropValue<Shape[Key]>;
    };

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw this.error;
    }

    const objectValue = value as Record<string, unknown>;

    for (const key in this.properties) {
      const prop = this.properties[key];
      const propertyValue = objectValue[key];

      if (propertyValue === undefined) {
        if (prop.visibility !== 'optional') {
          throw new TypeError(`"${key}" is required.`);
        }

        continue;
      }

      validatedObject[key] = prop(propertyValue) as ResolveBuiltPropValue<
        Shape[typeof key]
      >;
    }

    return validatedObject;
  }

  allows(value: unknown): value is {
    [Key in keyof Shape]: ResolveBuiltPropValue<Shape[Key]>;
  } {
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

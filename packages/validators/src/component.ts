import type {
  BuiltPropShape,
  ComponentPropType,
  ComponentPropTypeMap,
  PropVisibility,
  ResolvedBuiltPropShape,
} from './types';
import { BaseProp } from './base';

export class ComponentProp<
  Type extends ComponentPropType,
  Visibility extends PropVisibility,
> extends BaseProp<Type, Visibility, ComponentPropTypeMap[Type]> {
  constructor(type: Type, visibility: Visibility) {
    super({ type, visibility });
  }

  optional(this: ComponentProp<Type, 'required'>) {
    return new ComponentProp(this.type, 'optional');
  }

  validate(value: unknown) {
    if (this.type === 'JSX.Element') {
      if (
        value === null ||
        typeof value !== 'object' ||
        !('$$typeof' in value)
      ) {
        throw this.error;
      }
    }
  }

  allows(value: unknown): value is ComponentPropTypeMap[Type] {
    if (this.type === 'JSX.Element') {
      return value !== null && typeof value === 'object' && '$$typeof' in value;
    }

    return true;
  }
}

export class ComponentPropWithPropertiesProp<
  Type extends ComponentPropType,
  const Shape extends BuiltPropShape,
  Visibility extends PropVisibility,
> extends BaseProp<Type, Visibility, ComponentPropTypeMap[Type]> {
  readonly properties: Shape;

  constructor(type: Type, properties: Shape, visibility: Visibility) {
    super({ type, visibility });
    this.properties = properties;
  }

  optional(this: ComponentPropWithPropertiesProp<Type, Shape, 'required'>) {
    return new ComponentPropWithPropertiesProp(
      this.type,
      this.properties,
      'optional',
    );
  }

  validate(value: unknown) {
    if (this.type === 'JSX.Element') {
      if (
        value === null ||
        typeof value !== 'object' ||
        !('$$typeof' in value)
      ) {
        throw this.error;
      }
    }
  }

  allows(value: unknown): value is ComponentPropTypeMap[Type] {
    if (this.type === 'JSX.Element') {
      return value !== null && typeof value === 'object' && '$$typeof' in value;
    }

    return true;
  }
}

export class RenderChildrenProp<
  const Shape extends BuiltPropShape,
  ChildrenType extends ComponentPropType,
  Visibility extends PropVisibility,
> extends BaseProp<
  'function',
  Visibility,
  (
    renderProps: ResolvedBuiltPropShape<Shape>,
  ) => ComponentPropTypeMap[ChildrenType]
> {
  readonly renderProps: Shape;
  readonly childrenType: ChildrenType;

  constructor(
    renderProps: Shape,
    childrenType: ChildrenType,
    visibility: Visibility,
  ) {
    super({ type: 'function', visibility });
    this.renderProps = renderProps;
    this.childrenType = childrenType;
  }

  optional(this: RenderChildrenProp<Shape, ChildrenType, 'required'>) {
    return new RenderChildrenProp(
      this.renderProps,
      this.childrenType,
      'optional',
    );
  }

  validate(value: unknown) {
    if (typeof value !== 'function') {
      throw this.error;
    }

    return value as (
      renderProps: ResolvedBuiltPropShape<Shape>,
    ) => ComponentPropTypeMap[ChildrenType];
  }

  allows(
    value: unknown,
  ): value is (
    renderProps: ResolvedBuiltPropShape<Shape>,
  ) => ComponentPropTypeMap[ChildrenType] {
    return typeof value === 'function';
  }
}

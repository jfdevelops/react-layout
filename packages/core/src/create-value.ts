import { ReactNode, JSX } from 'react';

export type PrimitiveTypesMap = PrimitiveValueTypes & {
  object: object;
  array: unknown[];
  date: Date;
  regex: RegExp;
  error: Error;
  symbol: symbol;
  bigint: bigint;
};
export type PrimitiveValueTypes = {
  string: string;
  number: number;
  boolean: boolean;
};

const primitiveTypes = {
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
} satisfies Record<keyof PrimitiveTypesMap, string>;

function createInvalidPropValueMessage(type: string) {
  return `"value" is not of type "${type}".`;
}

class InvalidPropValueError<Type extends string> extends Error {
  constructor(type: Type) {
    super(createInvalidPropValueMessage(type));

    this.name = 'InvalidPropValueError';
  }
}

type PropVisibility = 'optional' | 'required';
type PrimitivePropType = keyof PrimitiveValueTypes;
export type NonEmptyReadonlyArray<Value> = readonly [Value, ...Value[]];
type PropConfig = Record<string, unknown>;

type PropType =
  | keyof PrimitiveTypesMap
  | ComponentPropType
  | 'union'
  | 'function';
type BasePropOptions<
  Type extends PropType,
  Visibility extends PropVisibility,
  Value = unknown,
> = {
  type: Type;
  visibility: Visibility;
  value?: Value;
};

abstract class BaseProp<
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

class NumberProp<Visibility extends PropVisibility> extends BaseProp<
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

class BooleanProp<Visibility extends PropVisibility> extends BaseProp<
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

class LiteralProp<
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

class EnumProp<
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
    // TODO alter for more complex scenarios
    return this.allowedValues.includes(value as never);
  }
}

type AnyBaseProp = BaseProp<PropType, PropVisibility, unknown>;

type ExtractPropValue<Prop extends AnyBaseProp> =
  Prop extends BaseProp<any, any, infer V> ? V : never;

type ExtractVisibility<Prop extends AnyBaseProp> =
  Prop extends BaseProp<any, infer V extends PropVisibility, any>
    ? V
    : PropVisibility;

type OptionalChain<
  Visibility extends PropVisibility,
  OptionalProp extends AnyBaseProp,
> = Visibility extends 'required'
  ? { optional(): WrappedProp<OptionalProp> }
  : {};

type ConfigOptions = {};
type ConfigChain<Prop extends AnyBaseProp> = {
  config<const Config extends PropConfig>(
    config: Config,
  ): ConfiguredWrappedProp<Prop, Config>;
};

type PrimitiveWrappedPropState<
  Type extends PrimitivePropType,
  Visibility extends PropVisibility,
  Value,
> = {
  type: Type;
  visibility: Visibility;
} & ([Value] extends [never] ? {} : { value: Value });

type ObjectWrappedPropState<
  Shape extends BuiltPropShape,
  Visibility extends PropVisibility,
> = {
  type: 'object';
  visibility: Visibility;
  properties: Shape;
};

type ComponentWithPropsWrappedPropState<
  Type extends ComponentPropType,
  Shape extends BuiltPropShape,
  Visibility extends PropVisibility,
> = {
  type: Type;
  visibility: Visibility;
  properties: Shape;
};

type UnionWrappedPropState<
  Members extends readonly AnyBaseProp[],
  Visibility extends PropVisibility,
> = {
  type: 'union';
  visibility: Visibility;
  members: Members;
};

type RenderChildrenWrappedPropState<
  Shape extends BuiltPropShape,
  ChildrenType extends ComponentPropType,
  Visibility extends PropVisibility,
> = {
  type: 'function';
  visibility: Visibility;
  renderProps: Shape;
  childrenType: ChildrenType;
};

type StringWrappedPropState<Visibility extends PropVisibility> =
  PrimitiveWrappedPropState<'string', Visibility, string | undefined>;
type NumberWrappedPropState<Visibility extends PropVisibility> =
  PrimitiveWrappedPropState<'number', Visibility, number | undefined>;
type BooleanWrappedPropState<Visibility extends PropVisibility> =
  PrimitiveWrappedPropState<'boolean', Visibility, boolean | undefined>;
type LiteralWrappedPropState<
  Value,
  Type extends PrimitivePropType,
  Visibility extends PropVisibility,
> = PrimitiveWrappedPropState<Type, Visibility, Value>;
type EnumWrappedPropState<
  Type extends PrimitivePropType,
  Visibility extends PropVisibility,
> = PrimitiveWrappedPropState<Type, Visibility, never>;

type WrappedPropState<Prop extends AnyBaseProp> =
  Prop extends StringProp<infer Visibility>
    ? StringWrappedPropState<Visibility>
    : Prop extends NumberProp<infer Visibility>
      ? NumberWrappedPropState<Visibility>
      : Prop extends BooleanProp<infer Visibility>
        ? BooleanWrappedPropState<Visibility>
        : Prop extends LiteralProp<infer Value, infer Type, infer Visibility>
          ? LiteralWrappedPropState<Value, Type, Visibility>
          : Prop extends EnumProp<infer _Values, infer Type, infer Visibility>
            ? EnumWrappedPropState<Type, Visibility>
            : Prop extends ObjectProp<infer Shape, infer Visibility>
              ? ObjectWrappedPropState<Shape, Visibility>
              : Prop extends ComponentPropWithPropertiesProp<
                    infer Type,
                    infer Shape,
                    infer Visibility
                  >
                ? ComponentWithPropsWrappedPropState<Type, Shape, Visibility>
                : Prop extends ComponentProp<infer Type, infer Visibility>
                  ? { type: Type; visibility: Visibility }
                  : Prop extends UnionProp<infer Members, infer Visibility>
                    ? UnionWrappedPropState<Members, Visibility>
                    : Prop extends RenderChildrenProp<
                          infer Shape,
                          infer ChildrenType,
                          infer Visibility
                        >
                      ? RenderChildrenWrappedPropState<
                          Shape,
                          ChildrenType,
                          Visibility
                        >
                      : never;

type ConfiguredWrappedProp<
  Prop extends AnyBaseProp,
  Config extends PropConfig,
> = ((value: unknown) => ReturnType<Prop['validate']>) &
  WrappedPropState<Prop> & {
    _baseProp: Prop;
    config: Config;
  };

export type WrappedProp<Prop extends AnyBaseProp> = ((
  value: unknown,
) => ReturnType<Prop['validate']>) &
  WrappedPropState<Prop> &
  WrappedPropChainMembers<Prop> & {
    _baseProp: Prop;
    or<Other extends AnyBaseProp>(other: {
      _baseProp: Other;
    }): WrappedProp<UnionProp<readonly [Prop, Other], ExtractVisibility<Prop>>>;
  };

export type LiteralWrappedProp<
  Value extends PrimitiveTypesMap[Type],
  Type extends PrimitivePropType,
  Visibility extends PropVisibility,
> = WrappedProp<LiteralProp<Value, Type, Visibility>>;

export type EnumWrappedProp<
  Values extends NonEmptyReadonlyArray<PrimitiveTypesMap[Type]>,
  Type extends PrimitivePropType,
  Visibility extends PropVisibility,
> = WrappedProp<EnumProp<Values, Type, Visibility>>;
type WrapperFor = 'literal' | 'enum';
type GetValueForWrapper<
  Type extends PrimitivePropType,
  For extends WrapperFor,
  Value extends PrimitiveTypesMap[Type],
> = For extends 'literal'
  ? Value
  : For extends 'enum'
    ? NonEmptyReadonlyArray<Value>
    : never;
type WrappedPropFor<
  Type extends PrimitivePropType,
  Visibility extends PropVisibility,
  For extends WrapperFor,
  Value extends PrimitiveTypesMap[Type],
> = For extends 'literal'
  ? LiteralWrappedProp<Value, Type, Visibility>
  : For extends 'enum'
    ? EnumWrappedProp<NonEmptyReadonlyArray<Value>, Type, Visibility>
    : never;
type CreateWrappedProp<
  Type extends PrimitivePropType,
  Visibility extends PropVisibility,
  For extends WrapperFor,
> = <Value extends PrimitiveTypesMap[Type]>(
  value: GetValueForWrapper<Type, For, Value>,
) => WrappedPropFor<Type, Visibility, For, Value>;

type WrappedPropBuilder<
  Type extends PrimitivePropType,
  Visibility extends PropVisibility,
  Prop extends AnyBaseProp,
  OptionalProp extends AnyBaseProp,
> = ConfigChain<Prop> &
  OptionalChain<Visibility, OptionalProp> & {
    literal: CreateWrappedProp<Type, Visibility, 'literal'>;
    enum: CreateWrappedProp<Type, Visibility, 'enum'>;
  };

type PrimitivePropTypeMap<Visibility extends PropVisibility> = {
  string: WrappedPropBuilder<
    'string',
    Visibility,
    StringProp<Visibility>,
    StringProp<'optional'>
  >;
  number: WrappedPropBuilder<
    'number',
    Visibility,
    NumberProp<Visibility>,
    NumberProp<'optional'>
  >;
  boolean: WrappedPropBuilder<
    'boolean',
    Visibility,
    BooleanProp<Visibility>,
    BooleanProp<'optional'>
  >;
};
type SpecialPropTypeMap = {};
type WrappedPrimitiveProp<Prop> =
  Prop extends BaseProp<
    infer type extends PrimitivePropType,
    infer visibility extends PropVisibility
  >
    ? PrimitivePropTypeMap<visibility>[type]
    : never;
type ConfigChainBuilder<
  Prop extends AnyBaseProp,
  Visibility extends PropVisibility,
  OptionalProp extends AnyBaseProp,
> = ConfigChain<Prop> & OptionalChain<Visibility, OptionalProp>;

type WrappedSpecialProp<Prop> =
  Prop extends LiteralProp<infer value, infer type, infer visibility>
    ? ConfigChainBuilder<
        LiteralProp<value, type, visibility>,
        visibility,
        LiteralProp<value, type, 'optional'>
      >
    : Prop extends EnumProp<infer values, infer type, infer visibility>
      ? ConfigChainBuilder<
          EnumProp<values, type, visibility>,
          visibility,
          EnumProp<values, type, 'optional'>
        >
      : never;
type WrappedObjectProp<Prop> =
  Prop extends ObjectProp<infer Shape, infer Visibility>
    ? OptionalChain<Visibility, ObjectProp<Shape, 'optional'>>
    : never;
type WrappedComponentWithPropsProp<Prop> =
  Prop extends ComponentPropWithPropertiesProp<
    infer Type,
    infer Shape,
    infer Visibility
  >
    ? OptionalChain<
        Visibility,
        ComponentPropWithPropertiesProp<Type, Shape, 'optional'>
      >
    : never;
type WrappedUnionProp<Prop> =
  Prop extends UnionProp<infer Members, infer Visibility>
    ? OptionalChain<Visibility, UnionProp<Members, 'optional'>>
    : never;
type WrappedPropChainMembers<Prop extends AnyBaseProp> = [
  WrappedSpecialProp<Prop>,
] extends [never]
  ? [WrappedObjectProp<Prop>] extends [never]
    ? [WrappedComponentWithPropsProp<Prop>] extends [never]
      ? [WrappedUnionProp<Prop>] extends [never]
        ? [WrappedPrimitiveProp<Prop>] extends [never]
          ? {}
          : WrappedPrimitiveProp<Prop>
        : WrappedUnionProp<Prop>
      : WrappedComponentWithPropsProp<Prop>
    : WrappedObjectProp<Prop>
  : WrappedSpecialProp<Prop>;
export interface AnyBuiltPropDefinition {
  (value: unknown): unknown;
  visibility: PropVisibility;
  _baseProp?: AnyBaseProp;
}
interface BuiltPropShape {
  [key: string]: AnyBuiltPropDefinition;
}
type ResolveBuiltPropValue<Definition extends AnyBuiltPropDefinition> =
  ReturnType<Definition>;
type ExtractDefinitionValue<D extends AnyBuiltPropDefinition> = D extends {
  _baseProp: infer P extends AnyBaseProp;
}
  ? ExtractPropValue<P>
  : ReturnType<D>;
type ResolvedBuiltPropShape<Shape extends BuiltPropShape> = {
  [Key in keyof Shape as Shape[Key]['visibility'] extends 'required'
    ? Key
    : never]: ExtractDefinitionValue<Shape[Key]>;
} & {
  [Key in keyof Shape as Shape[Key]['visibility'] extends 'required'
    ? never
    : Key]?: ExtractDefinitionValue<Shape[Key]>;
};

/** True when the prop's state type carries `type: 'JSX.Element'`. */
type IsJSXElementProp<D extends AnyBuiltPropDefinition> = D extends {
  type: 'JSX.Element';
}
  ? true
  : false;

/**
 * Returns the resolved key name for a prop: capitalizes the key when the prop
 * is a JSX.Element component prop (React convention for component slot props).
 */
type ResolvedPropKey<K extends string, D extends AnyBuiltPropDefinition> =
  IsJSXElementProp<D> extends true ? Capitalize<K> : K;

/**
 * Resolves a shape of prop definitions created by the `createProp` builders
 * into a plain TypeScript props interface.
 *
 * - Optional props become optional keys (`prop?: Type`).
 * - Props whose type is `JSX.Element` have their key capitalized
 *   (`icon` → `Icon`), following React's component-prop convention.
 */
export type ResolveProps<Shape extends Record<string, AnyBuiltPropDefinition>> =
  {
    [K in keyof Shape & string as Shape[K]['visibility'] extends 'required'
      ? ResolvedPropKey<K, Shape[K]>
      : never]: ExtractDefinitionValue<Shape[K]>;
  } & {
    [K in keyof Shape & string as Shape[K]['visibility'] extends 'required'
      ? never
      : ResolvedPropKey<K, Shape[K]>]?: ExtractDefinitionValue<Shape[K]>;
  };

/**
 * Like `ExtractDefinitionValue` but for union members (base props).
 * JSX.Element component props become render functions.
 */
type ExtractLayoutMemberValue<P extends AnyBaseProp> = P extends {
  type: 'JSX.Element';
  properties: infer Shape extends Record<string, AnyBuiltPropDefinition>;
}
  ? (props: ResolveProps<Shape>) => JSX.Element
  : P extends { type: 'JSX.Element' }
    ? () => JSX.Element
    : ExtractPropValue<P>;

/**
 * Like `ExtractDefinitionValue` but JSX.Element component props resolve as
 * render functions instead of the raw `JSX.Element` value:
 * - No component props → `() => JSX.Element`
 * - With component props → `(props: ResolveProps<Shape>) => JSX.Element`
 * Union members are resolved individually with the same rule.
 */
type ExtractLayoutDefinitionValue<D extends AnyBuiltPropDefinition> =
  D extends {
    type: 'JSX.Element';
    properties: infer Shape extends Record<string, AnyBuiltPropDefinition>;
  }
    ? (props: ResolveProps<Shape>) => JSX.Element
    : D extends { type: 'JSX.Element' }
      ? () => JSX.Element
      : D extends { members: infer Members extends readonly AnyBaseProp[] }
        ? ExtractLayoutMemberValue<Members[number]>
        : ExtractDefinitionValue<D>;

/**
 * Like `ResolveProps` but intended for the resolved options passed to the
 * function returned by `defineResourceLayout`. JSX.Element component props
 * become render functions so consumers provide a component slot rather than
 * a pre-rendered element:
 * - `createProp.component({ type: 'JSX.Element' })` → `() => JSX.Element`
 * - `createProp.component({ type: 'JSX.Element' }).props({ ... })` →
 *   `(props: ResolveProps<Shape>) => JSX.Element`
 */
export type ResolveLayoutProps<
  Shape extends Record<string, AnyBuiltPropDefinition>,
> = {
  [K in keyof Shape & string as Shape[K]['visibility'] extends 'required'
    ? ResolvedPropKey<K, Shape[K]>
    : never]: ExtractLayoutDefinitionValue<Shape[K]>;
} & {
  [K in keyof Shape & string as Shape[K]['visibility'] extends 'required'
    ? never
    : ResolvedPropKey<K, Shape[K]>]?: ExtractLayoutDefinitionValue<Shape[K]>;
};

class ObjectProp<
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

class ComponentProp<
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

class ComponentPropWithPropertiesProp<
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

class UnionProp<
  const Members extends readonly AnyBaseProp[],
  Visibility extends PropVisibility,
> extends BaseProp<'union', Visibility, ExtractPropValue<Members[number]>> {
  readonly members: Members;

  constructor(members: Members, visibility: Visibility) {
    super({ type: 'union', visibility });
    this.members = members;
  }

  optional(this: UnionProp<Members, 'required'>) {
    return new UnionProp(this.members, 'optional');
  }

  validate(value: unknown) {
    for (const member of this.members) {
      if (member.allows(value)) return;
    }
    throw this.error;
  }

  allows(value: unknown): value is ExtractPropValue<Members[number]> {
    return this.members.some((m) => m.allows(value));
  }
}

class RenderChildrenProp<
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

export type EnumValueDefinition<
  Values extends NonEmptyReadonlyArray<PrimitiveTypesMap[Type]>,
  Type extends PrimitivePropType,
  Visibility extends PropVisibility = 'required',
> = WrappedProp<EnumProp<Values, Type, Visibility>>;
export type ObjectValueDefinition<
  Shape extends BuiltPropShape,
  Visibility extends PropVisibility = 'required',
> = WrappedProp<ObjectProp<Shape, Visibility>>;

type PrimitivePropInstanceMap<Visibility extends PropVisibility> = {
  string: WrappedProp<StringProp<Visibility>>;
  number: WrappedProp<NumberProp<Visibility>>;
  boolean: WrappedProp<BooleanProp<Visibility>>;
};

type PrimitiveBasePropInstanceMap<Visibility extends PropVisibility> = {
  string: StringProp<Visibility>;
  number: NumberProp<Visibility>;
  boolean: BooleanProp<Visibility>;
};

type LiteralPropBuilder<
  Type extends PrimitivePropType,
  Visibility extends PropVisibility = 'required',
> = <const Value extends PrimitiveTypesMap[Type]>(
  value: Value,
) => LiteralWrappedProp<Value, Type, Visibility>;
type EnumPropBuilder<
  Type extends PrimitivePropType,
  Visibility extends PropVisibility = 'required',
> = <const Values extends NonEmptyReadonlyArray<PrimitiveTypesMap[Type]>>(
  values: Values,
) => EnumWrappedProp<Values, Type, Visibility>;
type PrimitivePropBuilder<
  Type extends PrimitivePropType,
  Visibility extends PropVisibility = 'required',
> = (() => PrimitivePropInstanceMap<Visibility>[Type]) & {
  literal: LiteralPropBuilder<Type, Visibility>;
  enum: EnumPropBuilder<Type, Visibility>;
  config<const Config extends PropConfig>(
    config: Config,
  ): ConfiguredWrappedProp<
    PrimitiveBasePropInstanceMap<Visibility>[Type],
    Config
  >;
} & (Visibility extends 'required'
    ? {
        optional(): PrimitivePropBuilder<Type, 'optional'>;
      }
    : {});

function createConfiguredWrappedProp<
  Prop extends AnyBaseProp,
  const Config extends PropConfig,
>(prop: Prop, config: Config): ConfiguredWrappedProp<Prop, Config> {
  const validate = ((value: unknown) =>
    prop.validate(value)) as ConfiguredWrappedProp<Prop, Config>;

  return Object.assign(validate, getPropState(prop), {
    _baseProp: prop,
    config,
  });
}

function getPropState<Prop extends AnyBaseProp>(
  prop: Prop,
): WrappedPropState<Prop> {
  const state = {
    type: prop.type,
    visibility: prop.visibility,
  } as Record<string, unknown>;

  if ('value' in prop && prop.value !== undefined) {
    state.value = prop.value;
  }

  if (
    prop instanceof ObjectProp ||
    prop instanceof ComponentPropWithPropertiesProp
  ) {
    state.properties = prop.properties;
  }

  if (prop instanceof UnionProp) {
    state.members = prop.members;
  }

  if (prop instanceof RenderChildrenProp) {
    state.renderProps = prop.renderProps;
    state.childrenType = prop.childrenType;
  }

  return state as WrappedPropState<Prop>;
}

function flattenUnionMembers(prop: AnyBaseProp): AnyBaseProp[] {
  return prop instanceof UnionProp
    ? [...(prop.members as AnyBaseProp[])]
    : [prop];
}

function wrapProp<Prop extends AnyBaseProp>(prop: Prop): WrappedProp<Prop> {
  const validate = ((value: unknown) =>
    prop.validate(value)) as WrappedProp<Prop>;
  const chainedProps = getPropState(prop) as Record<string, unknown>;
  const methodNames = ['optional', 'literal', 'enum', 'config'] as const;

  for (const methodName of methodNames) {
    const method = (prop as Record<string, unknown>)[methodName];

    if (typeof method === 'function') {
      if (methodName === 'config') {
        chainedProps.config = <const Config extends PropConfig>(
          config: Config,
        ) => createConfiguredWrappedProp(prop, config);
        continue;
      }

      chainedProps[methodName] = (...args: unknown[]) => {
        const nextProp = (
          method as (...methodArgs: unknown[]) => AnyBaseProp
        ).apply(prop, args);

        return wrapProp(nextProp);
      };
    }
  }

  chainedProps._baseProp = prop;
  chainedProps.or = (other: WrappedProp<AnyBaseProp>) => {
    const otherBase = (other as unknown as Record<string, unknown>)
      ._baseProp as AnyBaseProp;
    const members = [
      ...flattenUnionMembers(prop),
      ...flattenUnionMembers(otherBase),
    ] as never;
    return wrapProp(new UnionProp(members, prop.visibility));
  };

  return Object.assign(validate, chainedProps);
}

function createPrimitiveProp<
  Type extends PrimitivePropType,
  Visibility extends PropVisibility,
>(
  type: Type,
  visibility: Visibility,
): PrimitiveBasePropInstanceMap<Visibility>[Type] {
  switch (type) {
    case 'string':
      return new StringProp(
        visibility,
      ) as unknown as PrimitiveBasePropInstanceMap<Visibility>[Type];
    case 'number':
      return new NumberProp(
        visibility,
      ) as unknown as PrimitiveBasePropInstanceMap<Visibility>[Type];
    case 'boolean':
      return new BooleanProp(
        visibility,
      ) as unknown as PrimitiveBasePropInstanceMap<Visibility>[Type];
  }
}

function createWrappedProp<
  Type extends PrimitivePropType,
  Visibility extends PropVisibility,
>(type: Type, visibility: Visibility) {
  return <For extends WrapperFor>(wrapperFor: For) =>
    <Value extends PrimitiveTypesMap[Type]>(
      value: GetValueForWrapper<Type, For, Value>,
    ) => {
      if (wrapperFor === 'literal') {
        return wrapProp(
          new LiteralProp(value as never, type, visibility),
        ) as unknown as WrappedPropFor<Type, Visibility, For, Value>;
      }

      if (wrapperFor === 'enum') {
        return wrapProp(
          new EnumProp(value as never, type, visibility),
        ) as unknown as WrappedPropFor<Type, Visibility, For, Value>;
      }

      throw new Error(`Invalid wrapper for: ${wrapperFor}`);
    };
}

export function createPrimitivePropBuilder<
  Type extends PrimitivePropType,
  Visibility extends PropVisibility = 'required',
>(
  type: Type,
  visibility = 'required' as Visibility,
): PrimitivePropBuilder<Type, Visibility> {
  const propWrapper = createWrappedProp(type, visibility);
  const builder = (() =>
    wrapProp(
      createPrimitiveProp(type, visibility),
    )) as unknown as PrimitivePropBuilder<Type, Visibility>;

  return Object.assign(builder, {
    literal: propWrapper('literal'),
    enum: propWrapper('enum'),
    config: <const Config extends PropConfig>(config: Config) =>
      createConfiguredWrappedProp(
        createPrimitiveProp(type, visibility),
        config,
      ),
    ...(visibility === 'required'
      ? { optional: () => createPrimitivePropBuilder(type, 'optional') }
      : {}),
  }) as unknown as PrimitivePropBuilder<Type, Visibility>;
}

function createObjectProp<const Shape extends BuiltPropShape>(
  properties: Shape,
): ObjectValueDefinition<Shape, 'required'> {
  return wrapProp(new ObjectProp(properties, 'required'));
}

type ComponentPropType = 'ReactNode' | 'JSX.Element';
type ComponentPropTypeMap = {
  ReactNode: ReactNode;
  'JSX.Element': JSX.Element;
};

type ChildrenPropFor<
  ChildrenType extends ComponentPropType,
  ChildrenVisibility extends PropVisibility,
  RenderProps extends BuiltPropShape | undefined,
> = (RenderProps extends BuiltPropShape
  ? WrappedProp<
      RenderChildrenProp<RenderProps, ChildrenType, ChildrenVisibility>
    >
  : WrappedProp<ComponentProp<ChildrenType, ChildrenVisibility>>) &
  AnyBuiltPropDefinition;

type WithChildrenShape<
  Shape extends BuiltPropShape,
  ChildrenProp extends AnyBuiltPropDefinition,
> = Shape & { children: ChildrenProp };

type WithChildrenOptions<
  ChildrenType extends ComponentPropType,
  ChildrenVisibility extends PropVisibility,
  RenderProps extends BuiltPropShape | undefined,
> = {
  /**
   * The type of the children.
   * @default 'ReactNode'
   */
  type?: ChildrenType;
  /**
   * The visibility of the children.
   * @default 'optional'
   */
  visibility?: ChildrenVisibility;
  /**
   * Optional props for the children. If provided, the children
   * will be a function that renders the children.
   */
  props?: RenderProps;
};

export type ComponentPropWithChildrenBuilder<
  Type extends ComponentPropType,
  Visibility extends PropVisibility,
  ChildrenProp extends AnyBuiltPropDefinition,
> = ((value: unknown) => void) & {
  _baseProp: ComponentPropWithPropertiesProp<
    Type,
    { children: ChildrenProp },
    Visibility
  >;
  type: Type;
  visibility: Visibility;
  props<const Shape extends BuiltPropShape>(
    shape: Shape,
  ): WrappedProp<
    ComponentPropWithPropertiesProp<
      Type,
      WithChildrenShape<Shape, ChildrenProp>,
      Visibility
    >
  >;
  or<Other extends AnyBaseProp>(other: {
    _baseProp: Other;
  }): WrappedProp<
    UnionProp<
      readonly [
        ComponentPropWithPropertiesProp<
          Type,
          { children: ChildrenProp },
          Visibility
        >,
        Other,
      ],
      Visibility
    >
  >;
} & (Visibility extends 'required'
    ? {
        optional(): ComponentPropWithChildrenBuilder<
          Type,
          'optional',
          ChildrenProp
        >;
      }
    : {});

export type ComponentPropBuilder<
  Type extends ComponentPropType,
  Visibility extends PropVisibility = 'required',
> = ((value: unknown) => void) & {
  _baseProp: ComponentProp<Type, Visibility>;
  type: Type;
  visibility: Visibility;
  props<const Shape extends BuiltPropShape>(
    shape: Shape,
  ): WrappedProp<ComponentPropWithPropertiesProp<Type, Shape, Visibility>>;
  config<const Config extends PropConfig>(
    config: Config,
  ): ConfiguredWrappedProp<ComponentProp<Type, Visibility>, Config>;
  /**
   * Allows the component to have children.
   * @param options The options for the children.
   */
  withChildren<
    ChildrenType extends ComponentPropType = 'ReactNode',
    ChildrenVisibility extends PropVisibility = 'optional',
    const RenderProps extends BuiltPropShape | undefined = undefined,
  >(
    options?: WithChildrenOptions<
      ChildrenType,
      ChildrenVisibility,
      RenderProps
    >,
  ): ComponentPropWithChildrenBuilder<
    Type,
    Visibility,
    ChildrenPropFor<ChildrenType, ChildrenVisibility, RenderProps>
  >;
  or<Other extends AnyBaseProp>(other: {
    _baseProp: Other;
  }): WrappedProp<
    UnionProp<readonly [ComponentProp<Type, Visibility>, Other], Visibility>
  >;
} & (Visibility extends 'required'
    ? { optional(): ComponentPropBuilder<Type, 'optional'> }
    : {});

function createComponentPropWithChildrenBuilder<
  Type extends ComponentPropType,
  Visibility extends PropVisibility,
  ChildrenProp extends AnyBuiltPropDefinition,
>(
  type: Type,
  visibility: Visibility,
  childrenProp: ChildrenProp,
): ComponentPropWithChildrenBuilder<Type, Visibility, ChildrenProp> {
  const baseShape = { children: childrenProp };
  const baseProp = new ComponentPropWithPropertiesProp(
    type,
    baseShape,
    visibility,
  );
  const validate = ((value: unknown) =>
    baseProp.validate(value)) as unknown as ComponentPropWithChildrenBuilder<
    Type,
    Visibility,
    ChildrenProp
  >;

  return Object.assign(validate, {
    _baseProp: baseProp,
    type,
    visibility,
    props: <const Shape extends BuiltPropShape>(shape: Shape) =>
      wrapProp(
        new ComponentPropWithPropertiesProp(
          type,
          { ...shape, children: childrenProp },
          visibility,
        ),
      ),
    or: (other: { _baseProp: AnyBaseProp }) => {
      const members = [
        baseProp,
        ...flattenUnionMembers(other._baseProp),
      ] as never;
      return wrapProp(new UnionProp(members, baseProp.visibility));
    },
    ...(visibility === 'required'
      ? {
          optional: () =>
            createComponentPropWithChildrenBuilder(
              type,
              'optional' as const,
              childrenProp,
            ),
        }
      : {}),
  }) as unknown as ComponentPropWithChildrenBuilder<
    Type,
    Visibility,
    ChildrenProp
  >;
}

function buildChildrenProp<
  ChildrenType extends ComponentPropType,
  ChildrenVisibility extends PropVisibility,
  RenderProps extends BuiltPropShape | undefined,
>(
  childrenType: ChildrenType,
  childrenVisibility: ChildrenVisibility,
  renderProps: RenderProps,
): ChildrenPropFor<ChildrenType, ChildrenVisibility, RenderProps> {
  if (renderProps !== undefined) {
    return wrapProp(
      new RenderChildrenProp(renderProps, childrenType, childrenVisibility),
    ) as unknown as ChildrenPropFor<
      ChildrenType,
      ChildrenVisibility,
      RenderProps
    >;
  }
  return wrapProp(
    new ComponentProp(childrenType, childrenVisibility),
  ) as unknown as ChildrenPropFor<
    ChildrenType,
    ChildrenVisibility,
    RenderProps
  >;
}

function createComponentPropBuilder<
  Type extends ComponentPropType,
  Visibility extends PropVisibility = 'required',
>(
  type: Type,
  visibility = 'required' as Visibility,
): ComponentPropBuilder<Type, Visibility> {
  const prop = new ComponentProp(type, visibility);
  const validate = ((value: unknown) =>
    prop.validate(value)) as ComponentPropBuilder<Type, Visibility>;

  return Object.assign(validate, {
    type,
    visibility,
    _baseProp: prop,
    props: <const Shape extends BuiltPropShape>(shape: Shape) =>
      wrapProp(new ComponentPropWithPropertiesProp(type, shape, visibility)),
    config: <const Config extends PropConfig>(config: Config) =>
      createConfiguredWrappedProp(prop, config),
    withChildren: <
      ChildrenType extends ComponentPropType = 'ReactNode',
      ChildrenVisibility extends PropVisibility = 'optional',
      const RenderProps extends BuiltPropShape | undefined = undefined,
    >(
      options?: WithChildrenOptions<
        ChildrenType,
        ChildrenVisibility,
        RenderProps
      >,
    ) => {
      const childrenType = (options?.type ?? 'ReactNode') as ChildrenType;
      const childrenVisibility = (options?.visibility ??
        'optional') as ChildrenVisibility;
      const renderProps = (options?.props ?? undefined) as RenderProps;
      return createComponentPropWithChildrenBuilder(
        type,
        visibility,
        buildChildrenProp(childrenType, childrenVisibility, renderProps),
      );
    },
    or: (other: { _baseProp: AnyBaseProp }) => {
      const members = [prop, ...flattenUnionMembers(other._baseProp)] as never;
      return wrapProp(new UnionProp(members, prop.visibility));
    },
    ...(visibility === 'required'
      ? { optional: () => createComponentPropBuilder(type, 'optional') }
      : {}),
  }) as unknown as ComponentPropBuilder<Type, Visibility>;
}

export const createProp = {
  string: createPrimitivePropBuilder('string'),
  number: createPrimitivePropBuilder('number'),
  boolean: createPrimitivePropBuilder('boolean'),
  object: createObjectProp,
  component: <Type extends ComponentPropType>(options: { type: Type }) =>
    createComponentPropBuilder(options.type),
};

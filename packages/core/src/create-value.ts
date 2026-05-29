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
export type ValueDefinition<
  Value = unknown,
  Type extends keyof PrimitiveTypesMap = never,
  Optional extends boolean = true,
> = {
  value?: Value;
  type: Type;
  optional: Optional;
};
type InferOptional<T> = [T] extends [never]
  ? true
  : undefined extends T
    ? true
    : false;
export type OptionalValueDefinition<
  Value = unknown,
  Type extends keyof PrimitiveTypesMap = never,
> = ValueDefinition<Value, Type>;
export type RequiredValueDefinition<
  Value = unknown,
  Type extends keyof PrimitiveTypesMap = never,
> = ValueDefinition<Value, Type, false>;
export type DependentOnValueDefinition<
  Value = unknown,
  Type extends keyof PrimitiveTypesMap = never,
  DependentOn = never,
> = ValueDefinition<Value, Type, InferOptional<DependentOn>> & {
  dependentOn: DependentOn;
};

type InferPrimitiveValue<T> =
  T extends PrimitiveValueTypes[keyof PrimitiveValueTypes] ? T : never;
type InferType<Value> = Value extends keyof PrimitiveTypesMap ? Value : never;
type GetResolvedValue<Value, Type extends keyof PrimitiveTypesMap> = [
  Type,
] extends [never]
  ? Value
  : PrimitiveTypesMap[Type];
type ValuePropDefinition<Value = unknown> = {
  /**
   * The default value for the prop.
   */
  value?: Value;
};
type TypePropDefinition<Type extends keyof PrimitiveTypesMap = never> = {
  /**
   * The type of the prop.
   */
  type?: Type;
};
type CreatePropTypeOptions<
  Value,
  Type extends keyof PrimitiveTypesMap = never,
> =
  | ValuePropDefinition<Value>
  | TypePropDefinition<Type>
  | (ValuePropDefinition<Value> & TypePropDefinition<Type>);

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
const primitiveValueTypes = ['string', 'number', 'boolean'] as const;

function isPrimitiveValue(value: unknown): value is PrimitiveValueTypes {
  return (
    typeof value === 'string' && primitiveValueTypes.includes(value as never)
  );
}
function isCreatePropTypeOptions(
  value: unknown,
): value is CreatePropTypeOptions<unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  let isValid = false;

  if ('value' in value) {
    isValid = true;
  }

  if ('type' in value) {
    isValid = isPrimitiveValue(value.type);
  }

  return isValid;
}

function createDefaultPropsDefinition<
  const Value extends PrimitiveValueTypes,
  Optional extends boolean = true,
>(value: Value, optional = true as Optional) {
  return {
    value: value as never,
    optional,
    type: typeof value as never,
  } as Required<ValueDefinition<Value, InferType<Value>, Optional>>;
}

function createPropTypeDefinition<
  const Value extends PrimitiveValueTypes,
  Type extends keyof PrimitiveTypesMap = never,
  Optional extends boolean = true,
>(
  options: CreatePropTypeOptions<Value, Type> & {
    /**
     * Whether the prop is optional.
     * @default true
     */
    optional?: Optional;
  },
) {
  const { optional = true, ...config } = options;
  const result = {
    optional,
  } as ValueDefinition<Value, Type, Optional>;

  if ('type' in config) {
    const type = config.type;

    if (typeof type !== 'string') {
      const listFormatter = new Intl.ListFormat('en', {
        style: 'long',
        type: 'conjunction',
      });

      throw new TypeError(
        `The "type" property must be one of the following: ${listFormatter.format(
          Object.keys(primitiveTypes),
        )}.`,
      );
    }

    result.type = type as never;

    if ('value' in config) {
      const value = config.value;

      if (typeof value !== primitiveTypes[type]) {
        throw new TypeError(`"value" is not of type "${type}".`);
      }

      result.value = value;
    }
  } else if ('value' in config) {
    result.value = config.value;
  }

  return result;
}

/**
 * Extra options for {@link createProp} beyond {@link CreatePropTypeOptions}.
 */
export type CreatePropExtraOptions = {
  /**
   * With `defaultVisibility: 'required'`, the prop is required whenever this value is non-nullish;
   * with `'optional'`, the prop stays optional but still carries the dependency at runtime.
   */
  dependentOn?: unknown;
  /**
   * Whether the prop is optional or required by default (when there is no `dependentOn`, or as the
   * baseline when computing optional vs required from `dependentOn`).
   */
  defaultVisibility: 'optional' | 'required';
};

/** Options object passed to {@link createProp}. */
type CreatePropOptionsInput = CreatePropTypeOptions<
  unknown,
  keyof PrimitiveTypesMap
> &
  CreatePropExtraOptions;

type CreatePropInferred<Opts extends CreatePropOptionsInput> = CreatePropReturn<
  Opts extends { value: infer V } ? V : never,
  Opts extends { type: infer T }
    ? T extends keyof PrimitiveTypesMap
      ? T
      : never
    : never,
  'dependentOn' extends keyof Opts ? Opts['dependentOn'] : undefined,
  Opts extends { defaultVisibility: infer Vis extends 'optional' | 'required' }
    ? Vis
    : never
>;

type ConditionFromDependent<Dependent> = [
  Exclude<Dependent, null | undefined>,
] extends [never]
  ? never
  : Exclude<Dependent, null | undefined>;

/**
 * `PropsDefinition` with `optional` driven by the type parameter `Condition` (see
 * {@link createProp} with `dependentOn` and `defaultVisibility: 'required'`), so resolved page
 * props keep the correct required vs optional keys.
 */
export type RequiredWhen<
  Condition,
  Value,
  Type extends keyof PrimitiveTypesMap,
> = ValueDefinition<
  Value,
  Type,
  Condition extends never ? true : Condition extends undefined ? true : false
>;

/**
 * Return type of {@link createProp} from its generic parameters.
 */
export type CreatePropReturn<
  Value,
  Type extends keyof PrimitiveTypesMap,
  Dependent,
  Vis extends 'optional' | 'required',
> = [Dependent] extends [undefined]
  ? [Vis] extends ['optional']
    ? OptionalValueDefinition<GetResolvedValue<Value, Type>, Type>
    : [Vis] extends ['required']
      ? RequiredValueDefinition<GetResolvedValue<Value, Type>, Type>
      : never
  : [Vis] extends ['required']
    ? RequiredWhen<
        ConditionFromDependent<Dependent>,
        GetResolvedValue<Value, Type>,
        Type
      >
    : [Vis] extends ['optional']
      ? OptionalValueDefinition<GetResolvedValue<Value, Type>, Type> & {
          dependentOn: Dependent;
        }
      : never;

export type CreateOptionalValue = typeof optional;
export type CreateRequiredValue = typeof required;

/**
 * Build a page prop definition. Pass {@link CreatePropTypeOptions} plus `dependentOn` (optional)
 * and {@link CreatePropExtraOptions.defaultVisibility}.
 *
 * For a prop that becomes required only when another value is set (e.g. `resourceId` when
 * `subResource` is set), use `dependentOn` and `defaultVisibility: 'required'`.
 *
 * ```ts
 * createProp({
 *   type: 'string',
 *   dependentOn: subResource,
 *   defaultVisibility: 'required',
 * })
 * ```
 */
function createPropBase<const Opts extends CreatePropOptionsInput>(
  options: Opts,
): CreatePropInferred<Opts> {
  const { dependentOn, defaultVisibility, ...config } = options;

  if (defaultVisibility !== 'optional' && defaultVisibility !== 'required') {
    throw new TypeError(
      'createProp: defaultVisibility must be "optional" or "required".',
    );
  }

  let optionalFlag: boolean;
  if (defaultVisibility === 'optional') {
    optionalFlag = true;
  } else if (dependentOn !== undefined) {
    optionalFlag = dependentOn == null;
  } else {
    optionalFlag = false;
  }

  const def = createPropTypeDefinition({
    ...config,
    optional: optionalFlag,
  } as never);

  if (dependentOn !== undefined) {
    return { ...def, dependentOn } as unknown as CreatePropInferred<Opts>;
  }

  return def as unknown as CreatePropInferred<Opts>;
}

/**
 * Defines an optional prop with a configuration.
 * @param config The configuration for the prop.
 */
export function optional<
  const Value = never,
  Type extends keyof typeof primitiveTypes = never,
>(
  config: CreatePropTypeOptions<Value, Type>,
): OptionalValueDefinition<GetResolvedValue<Value, Type>, Type>;
/**
 * Defines an optional prop with a default value. When `strict` is `true`, the default value will
 * be inferred from the type of the given value.
 * @param defaultValue The default value for the prop.
 */
export function optional<Given>(
  defaultValue: Given,
): Required<
  OptionalValueDefinition<InferPrimitiveValue<Given>, InferType<Given>>
>;
export function optional<
  const Value extends PrimitiveValueTypes[keyof PrimitiveValueTypes],
>(
  defaultValue: Value,
  options: { strict: true },
): Required<OptionalValueDefinition<Value, InferType<Value>>>;
export function optional(
  valueOrConfig: unknown,
  strictOptions?: { strict: true },
):
  | OptionalValueDefinition<unknown, keyof PrimitiveTypesMap>
  | Required<OptionalValueDefinition<unknown, keyof PrimitiveTypesMap>> {
  if (strictOptions?.strict === true) {
    if (!isPrimitiveValue(valueOrConfig)) {
      throw new TypeError(
        `Creating an optional prop only works with strings, numbers, booleans, or a "CreatePropTypeOptions" object.`,
      );
    }
    return createDefaultPropsDefinition(
      valueOrConfig as PrimitiveValueTypes,
      true,
    );
  }

  if (isPrimitiveValue(valueOrConfig)) {
    return createDefaultPropsDefinition(
      valueOrConfig as PrimitiveValueTypes,
      true,
    );
  }

  if (isCreatePropTypeOptions(valueOrConfig)) {
    return createPropBase({
      ...(valueOrConfig as object),
      defaultVisibility: 'optional',
    } as never) as never;
  }

  throw new TypeError(
    `Creating an optional prop only works with strings, numbers, booleans, or a "CreatePropTypeOptions" object.`,
  );
}

/**
 * Defines a required prop with a configuration.
 * @param config The configuration for the prop.
 */
export function required<
  const Value = never,
  Type extends keyof typeof primitiveTypes = never,
>(
  config: CreatePropTypeOptions<Value, Type>,
): RequiredValueDefinition<GetResolvedValue<Value, Type>, Type>;
export function required<
  const Value = never,
  Type extends keyof typeof primitiveTypes = never,
  DependentOn = never,
>(
  config: CreatePropTypeOptions<Value, Type> & {
    /**
     * The value this prop depends on. If the dependent value is defined, the prop is required.
     */
    dependentOn: DependentOn;
  },
): DependentOnValueDefinition<GetResolvedValue<Value, Type>, Type, DependentOn>;
/**
 * Defines a required prop with a default value. When `strict` is `true`, the default value will
 * be inferred from the type of the given value.
 * @param defaultValue The default value for the prop.
 */
export function required<Given, Resolved = InferPrimitiveValue<Given>>(
  defaultValue: Given,
): Required<RequiredValueDefinition<Resolved, InferType<Resolved>>>;
export function required<
  const Value extends PrimitiveValueTypes[keyof PrimitiveValueTypes],
>(
  defaultValue: Value,
  options: { strict: true },
): Required<RequiredValueDefinition<Value, InferType<Value>>>;
export function required(
  valueOrConfig: unknown,
  strictOptions?: { strict: true },
):
  | RequiredValueDefinition<unknown, keyof PrimitiveTypesMap>
  | Required<RequiredValueDefinition<unknown, keyof PrimitiveTypesMap>>
  | DependentOnValueDefinition<unknown, keyof PrimitiveTypesMap, unknown> {
  if (strictOptions?.strict === true) {
    if (!isPrimitiveValue(valueOrConfig)) {
      throw new TypeError(
        `Creating a required prop only works with strings, numbers, booleans, or a "CreatePropTypeOptions" object.`,
      );
    }
    return createDefaultPropsDefinition(
      valueOrConfig as PrimitiveValueTypes,
      false,
    );
  }

  if (isPrimitiveValue(valueOrConfig)) {
    return createDefaultPropsDefinition(
      valueOrConfig as PrimitiveValueTypes,
      false,
    );
  }

  if (isCreatePropTypeOptions(valueOrConfig)) {
    return createPropBase({
      ...(valueOrConfig as object),
      defaultVisibility: 'required',
    } as never) as never;
  }

  throw new TypeError(
    `Creating a required prop only works with strings, numbers, booleans, or a "CreatePropTypeOptions" object.`,
  );
}

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
type NonEmptyReadonlyArray<Value> = readonly [Value, ...Value[]];
type PropConfig = Record<string, unknown>;

type BasePropOptions<
  Type extends keyof PrimitiveTypesMap,
  Visibility extends PropVisibility,
  Value = unknown,
> = {
  type: Type;
  visibility: Visibility;
  value?: Value;
};

abstract class BaseProp<
  Type extends keyof PrimitiveTypesMap,
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

class StringProp<Visibility extends PropVisibility> extends BaseProp<
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

type AnyBaseProp = BaseProp<keyof PrimitiveTypesMap, PropVisibility, unknown>;

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
              : never;

type ConfiguredWrappedProp<
  Prop extends AnyBaseProp,
  Config extends PropConfig,
> = ((value: unknown) => ReturnType<Prop['validate']>) &
  WrappedPropState<Prop> & {
    config: Config;
  };

type WrappedProp<Prop extends AnyBaseProp> = ((
  value: unknown,
) => ReturnType<Prop['validate']>) &
  WrappedPropState<Prop> &
  WrappedPropChainMembers<Prop>;

type LiteralWrappedProp<
  Value extends PrimitiveTypesMap[Type],
  Type extends PrimitivePropType,
  Visibility extends PropVisibility,
> = WrappedProp<LiteralProp<Value, Type, Visibility>>;

type EnumWrappedProp<
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
type WrappedPropChainMembers<Prop extends AnyBaseProp> = [
  WrappedSpecialProp<Prop>,
] extends [never]
  ? [WrappedObjectProp<Prop>] extends [never]
    ? [WrappedPrimitiveProp<Prop>] extends [never]
      ? never
      : WrappedPrimitiveProp<Prop>
    : WrappedObjectProp<Prop>
  : WrappedSpecialProp<Prop>;
export interface AnyBuiltPropDefinition {
  (value: unknown): unknown;
  visibility: PropVisibility;
}
interface BuiltPropShape {
  [key: string]: AnyBuiltPropDefinition;
}
type ResolveBuiltPropValue<Definition extends AnyBuiltPropDefinition> =
  ReturnType<Definition>;

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

  return Object.assign(validate, getPropState(prop), { config });
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

  if (prop instanceof ObjectProp) {
    state.properties = prop.properties;
  }

  return state as WrappedPropState<Prop>;
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

function createPrimitivePropBuilder<
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

export const createProp = {
  string: createPrimitivePropBuilder('string'),
  number: createPrimitivePropBuilder('number'),
  boolean: createPrimitivePropBuilder('boolean'),
  object: createObjectProp,
};
import { JSX } from 'react';
import { BaseProp } from './base';
import { ComponentProp, ComponentPropWithPropertiesProp, RenderChildrenProp } from './component';
import { EnumProp } from './enum';
import { LiteralProp } from './literal';
import { ObjectProp } from './object';
import { BooleanProp, NumberProp, StringProp } from './primitive';
import type {
  AnyBaseProp,
  AnyBuiltPropDefinition,
  BuiltPropShape,
  ComponentPropType,
  ExtractPropValue,
  NonEmptyReadonlyArray,
  PrimitivePropType,
  PrimitiveTypesMap,
  PropConfig,
  PropVisibility,
  ResolveLayoutProps,
} from './types';
import { UnionProp } from './union';

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

type WrappedPrimitiveProp<Prop> =
  Prop extends BaseProp<
    infer Type extends PrimitivePropType,
    infer Visibility extends PropVisibility
  >
    ? PrimitivePropTypeMap<Visibility>[Type]
    : never;

type ConfigChainBuilder<
  Prop extends AnyBaseProp,
  Visibility extends PropVisibility,
  OptionalProp extends AnyBaseProp,
> = ConfigChain<Prop> & OptionalChain<Visibility, OptionalProp>;

type WrappedSpecialProp<Prop> =
  Prop extends LiteralProp<infer Value, infer Type, infer Visibility>
    ? ConfigChainBuilder<
        LiteralProp<Value, Type, Visibility>,
        Visibility,
        LiteralProp<Value, Type, 'optional'>
      >
    : Prop extends EnumProp<infer Values, infer Type, infer Visibility>
      ? ConfigChainBuilder<
          EnumProp<Values, Type, Visibility>,
          Visibility,
          EnumProp<Values, Type, 'optional'>
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
    ? { optional(): PrimitivePropBuilder<Type, 'optional'> }
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
  type?: ChildrenType;
  visibility?: ChildrenVisibility;
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
  const baseProp = new ComponentPropWithPropertiesProp(
    type,
    { children: childrenProp },
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

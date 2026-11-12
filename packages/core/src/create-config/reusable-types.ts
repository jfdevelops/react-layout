import {
  type PropDefinition,
  type DefinitionVisibility,
  type InputDefinitions,
  type ResolvePropsAsDefined,
  type ResolveInputPropsAsDefined,
  type StandardSchemaV1,
} from '@jfdevelops/react-layout-validator';
import type { OptionSchema } from '../option-schema';
import type { InferredInProps, InPropsDefinition, InPropsObject, PropsContract } from '../props';
import type { ResourceDefinition, ResourceEnum, ResourcePath } from '../resource';
import type { LayoutResourcesAccessor } from './define-layout';
import type { ShowCallable } from '../utils';
import type { SingleResourceInput, ReusableResourcesAccessor } from './reusable-resource-input';
export type { SingleResourceInput, ReusableResourcesAccessor } from './reusable-resource-input';

type Selector<Source> = (source: Source) => unknown;

/**
 * Standard Schema has no field introspection, so the fields of an object
 * option are read from its output type. Arrays, functions, and built-in
 * objects are values, not field containers.
 */
type IsFieldContainer<Value> = [Value] extends [object]
  ? [Value] extends [
      | ReadonlyArray<unknown>
      | ((...args: never[]) => unknown)
      | Date
      | RegExp
      | Map<unknown, unknown>
      | Set<unknown>
      | Promise<unknown>,
    ]
    ? false
    : true
  : false;

/** One definition per field of an object value. */
type FieldDefinitions<Value> = {
  [Key in keyof Required<Value> & string]: StandardSchemaV1<Value[Key], Value[Key]>;
};

/** Exposes `properties` when an option's value is an object whose fields can be selected. */
type ObjectOption<Definition> = Definition extends PropDefinition
  ? NonNullable<StandardSchemaV1.InferOutput<Definition>> extends infer Value
    ? IsFieldContainer<Value> extends true
      ? { properties: FieldDefinitions<Value> }
      : {}
    : {}
  : {};
type OptionValue<Definition extends PropDefinition> =
  | StandardSchemaV1.InferOutput<Definition>
  | (DefinitionVisibility<Definition> extends 'optional' ? undefined : never);

/** Select or transform resolved option values, or drill into object values. */
export type ReusableOptionSelection<Props extends InPropsObject> = {
  [Key in keyof Props]?: ObjectOption<Props[Key]> extends {
    properties: infer Shape extends InPropsObject;
  }
    ? true | Selector<OptionValue<Props[Key]>> | ReusableOptionSelection<Shape>
    : true | Selector<OptionValue<Props[Key]>>;
};

type ResolvedResourceSelection<Resources extends ReadonlyArray<ResourceDefinition>, Result> =
  Result extends SingleResourceInput<ReadonlyArray<ResourceDefinition>>
    ? ResourcePath<Resources>
    : Result;

type ResourceCallerInput<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Contract,
> = Contract extends { resources: (...args: any[]) => infer Result }
  ? Extract<Result, SingleResourceInput<ReadonlyArray<ResourceDefinition>>> extends never
    ? {}
    : { resources: ResourcePath<Resources> }
  : {};

type OptionDefinitions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
> = InferredInProps<Resources, Options> extends infer Props extends InPropsObject ? Props : never;

/** Only data sources declared by the factory are available for selection. */
export type ReusableInclude<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
> = {
  resources?: true | Selector<ReusableResourcesAccessor<Resources>>;
} & (keyof OptionDefinitions<Resources, Options> extends never
  ? {}
  : {
      options?:
        | true
        | Selector<ResolvePropsAsDefined<OptionDefinitions<Resources, Options>>>
        | ReusableOptionSelection<OptionDefinitions<Resources, Options>>;
    });

type SelectedOptionValue<Definition extends PropDefinition, Selection> = Selection extends true
  ? StandardSchemaV1.InferOutput<Definition>
  : Selection extends (...args: any[]) => infer Result
    ? Result
    : ObjectOption<Definition> extends { properties: infer Shape extends InPropsObject }
      ? SelectedOptionProps<Shape, Selection>
      : never;

type SelectedOptionProps<Props extends InPropsObject, Selection> = {
  [
    Key in keyof Props & keyof Selection as Selection[Key] extends Selector<any>
      ? Key
      : DefinitionVisibility<Props[Key]> extends 'required'
        ? Key
        : never
  ]: SelectedOptionValue<Props[Key], Selection[Key]>;
} & {
  [
    Key in keyof Props & keyof Selection as Selection[Key] extends Selector<any>
      ? never
      : DefinitionVisibility<Props[Key]> extends 'optional'
        ? Key
        : never
  ]?: SelectedOptionValue<Props[Key], Selection[Key]>;
};

/** Options are flattened one level, so `options: { meta: true }` supplies `meta`. */
export type ReusableProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  IncludeProps,
  CustomProps extends InPropsObject,
> = (IncludeProps extends { resources: true }
  ? { resources: ResourceEnum<Resources>[number][] }
  : IncludeProps extends { resources: (...args: any[]) => infer Result }
    ? { resources: ResolvedResourceSelection<Resources, Result> }
    : {}) &
  (IncludeProps extends { options: infer Selection }
    ? Selection extends (...args: any[]) => infer Result
      ? { options: Result }
      : Selection extends true
        ? ResolvePropsAsDefined<OptionDefinitions<Resources, Options>>
        : SelectedOptionProps<OptionDefinitions<Resources, Options>, Selection>
    : {}) &
  ResolvePropsAsDefined<CustomProps>;

/** Data selected for the reusable's single callback argument. */
export type ReusableSelected<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Selection,
> = (Selection extends { resources: infer Value }
  ? {
      resources: Value extends (...args: any[]) => infer Result
        ? ResolvedResourceSelection<Resources, Result>
        : LayoutResourcesAccessor<Resources>;
    }
  : {}) &
  (Selection extends { options: infer Value }
    ? Value extends (...args: any[]) => infer Result
      ? { options: Result }
      : SelectedValues<OptionDefinitions<Resources, Options>, Value>
    : {});

export type ReusableOverlap = 'preferProps' | 'preferSelect';

type SelectionShape<Props extends InPropsObject, Selection> =
  Selection extends Selector<any>
    ? 'value'
    : {
        [
          Key in keyof Props & (Selection extends true ? keyof Props : keyof Selection)
        ]: SelectionAt<Selection, Key> extends Selector<any>
          ? 'value'
          : ObjectOption<Props[Key]> extends { properties: infer Shape extends InPropsObject }
            ? SelectionShape<Shape, SelectionAt<Selection, Key>>
            : 'value';
      };
type ContractShape<Props extends InPropsObject, Contract, CustomProps> = (Contract extends {
  resources: unknown;
}
  ? { resources: 'value' }
  : {}) &
  (Contract extends { options: infer Selection }
    ? Selection extends Selector<any>
      ? { options: 'value' }
      : SelectionShape<Props, Selection>
    : {}) & { [Key in keyof CustomProps]: 'value' };

type MergeValue<Left, Right, Overlap, LeftShape, RightShape> = LeftShape extends object
  ? RightShape extends object
    ? MergeValues<NonNullable<Left>, NonNullable<Right>, Overlap, LeftShape, RightShape>
    : Overlap extends 'preferSelect'
      ? Right
      : Left
  : Overlap extends 'preferSelect'
    ? Right
    : Left;
type SharedKeys<Left, Right> = keyof Left & keyof Right;
type OptionalSharedKeys<Left, Right, Overlap, LeftShape, RightShape> = {
  [Key in SharedKeys<Left, Right>]: Key extends keyof LeftShape
    ? Key extends keyof RightShape
      ? LeftShape[Key] extends object
        ? RightShape[Key] extends object
          ? {} extends Pick<Left, Key>
            ? {} extends Pick<Right, Key>
              ? Key
              : never
            : never
          : Overlap extends 'preferSelect'
            ? {} extends Pick<Right, Key>
              ? Key
              : never
            : {} extends Pick<Left, Key>
              ? Key
              : never
        : Overlap extends 'preferSelect'
          ? {} extends Pick<Right, Key>
            ? Key
            : never
          : {} extends Pick<Left, Key>
            ? Key
            : never
      : never
    : never;
}[SharedKeys<Left, Right>];
type MergeValues<Left, Right, Overlap, LeftShape, RightShape> = Omit<Left, keyof Right> &
  Omit<Right, keyof Left> & {
    [
      Key in Exclude<
        SharedKeys<Left, Right>,
        OptionalSharedKeys<Left, Right, Overlap, LeftShape, RightShape>
      >
    ]: MergeValue<
      Left[Key],
      Right[Key],
      Overlap,
      Key extends keyof LeftShape ? LeftShape[Key] : 'value',
      Key extends keyof RightShape ? RightShape[Key] : 'value'
    >;
  } & {
    [Key in OptionalSharedKeys<Left, Right, Overlap, LeftShape, RightShape>]?: MergeValue<
      Left[Key],
      Right[Key],
      Overlap,
      Key extends keyof LeftShape ? LeftShape[Key] : 'value',
      Key extends keyof RightShape ? RightShape[Key] : 'value'
    >;
  };

// A merged object can exist while only one of its optional source containers exists.
type IndependentSources<Props extends InPropsObject, IncludeProps, Select> = keyof CallerOptions<
  Props,
  IncludeProps,
  Select
> extends never
  ? false
  : keyof (SourceValues<Props, IncludeProps, true> &
        SourceValues<Props, Select, false>) extends never
    ? false
    : true;

type BranchSelection<Selection> = Selection extends Selector<any> ? {} : Selection;

type GuardedFields<
  Value,
  Props extends InPropsObject,
  IncludeProps,
  Select,
  Shape,
  Independent extends boolean,
> = {
  [Key in keyof Value]: Key extends keyof Props
    ? Key extends keyof Shape
      ? Shape[Key] extends object
        ? ObjectOption<Props[Key]> extends { properties: infer Nested extends InPropsObject }
          ?
              | GuardedObject<
                  NonNullable<Value[Key]>,
                  Nested,
                  BranchSelection<SelectionAt<IncludeProps, Key>>,
                  BranchSelection<SelectionAt<Select, Key>>,
                  Shape[Key],
                  IndependentSources<
                    Nested,
                    BranchSelection<SelectionAt<IncludeProps, Key>>,
                    BranchSelection<SelectionAt<Select, Key>>
                  > extends true
                    ? Independent extends true
                      ? true
                      : DefinitionVisibility<Props[Key]> extends 'optional'
                        ? true
                        : false
                    : false
                >
              | Extract<Value[Key], undefined>
          : Value[Key]
        : Value[Key]
      : Value[Key]
    : Value[Key];
};

type GuardedObject<
  Value,
  Props extends InPropsObject,
  IncludeProps,
  Select,
  Shape,
  Independent extends boolean = false,
> = Independent extends true
  ? Partial<GuardedFields<Value, Props, IncludeProps, Select, Shape, Independent>>
  : GuardedFields<Value, Props, IncludeProps, Select, Shape, Independent>;

type MergedShape<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  IncludeProps,
  CustomProps,
  Select,
  Overlap,
> = MergeValues<
  ContractShape<OptionDefinitions<Resources, Options>, IncludeProps, CustomProps>,
  ContractShape<OptionDefinitions<Resources, Options>, Select, {}>,
  Overlap,
  ContractShape<OptionDefinitions<Resources, Options>, IncludeProps, CustomProps>,
  ContractShape<OptionDefinitions<Resources, Options>, Select, {}>
>;

export type ReusableResolved<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  IncludeProps,
  CustomProps extends InPropsObject,
  Select,
  Overlap = undefined,
> = Expanded<
  GuardedObject<
    MergeValues<
      ReusableProps<Resources, Options, IncludeProps, CustomProps>,
      ReusableSelected<Resources, Options, Select>,
      Overlap,
      ContractShape<OptionDefinitions<Resources, Options>, IncludeProps, CustomProps>,
      ContractShape<OptionDefinitions<Resources, Options>, Select, {}>
    >,
    OptionDefinitions<Resources, Options>,
    IncludeProps extends { options: infer Selection } ? Selection : {},
    Select extends { options: infer Selection } ? Selection : {},
    MergedShape<Resources, Options, IncludeProps, CustomProps, Select, Overlap>
  >
>;

type SelectedValues<Props extends InPropsObject, Selection> = Selection extends (
  ...args: any[]
) => infer Result
  ? Result
  : Selection extends true
    ? ResolvePropsAsDefined<Props>
    : SelectedOptionProps<Props, Selection>;

/** Sources are derived against the finite definition tree, not arbitrary input keys. */
type SourceValue<Definition extends PropDefinition, Selection, CallbacksOnly extends boolean> =
  Selection extends Selector<any>
    ? OptionValue<Definition>
    : Selection extends true
      ? CallbacksOnly extends true
        ? never
        : OptionValue<Definition>
      : ObjectOption<Definition> extends { properties: infer Shape extends InPropsObject }
        ? SourceValues<Shape, Selection, CallbacksOnly>
        : never;

type SourceKeys<Props extends InPropsObject, Selection, CallbacksOnly extends boolean> = {
  [Key in keyof Props & keyof Selection]: Selection[Key] extends Selector<any>
    ? Key
    : Selection[Key] extends true
      ? CallbacksOnly extends true
        ? never
        : Key
      : ObjectOption<Props[Key]> extends { properties: infer Shape extends InPropsObject }
        ? keyof SourceValues<Shape, Selection[Key], CallbacksOnly> extends never
          ? never
          : Key
        : never;
}[keyof Props & keyof Selection];

type SourceValues<Props extends InPropsObject, Selection, CallbacksOnly extends boolean> =
  Selection extends Selector<any>
    ? ResolvePropsAsDefined<Props>
    : Selection extends true
      ? CallbacksOnly extends true
        ? {}
        : ResolvePropsAsDefined<Props>
      : {
          [
            Key in SourceKeys<Props, Selection, CallbacksOnly> as DefinitionVisibility<
              Props[Key]
            > extends 'required'
              ? Key
              : never
          ]: SourceValue<Props[Key], Selection[Key], CallbacksOnly>;
        } & {
          [
            Key in SourceKeys<Props, Selection, CallbacksOnly> as DefinitionVisibility<
              Props[Key]
            > extends 'optional'
              ? Key
              : never
          ]?: SourceValue<Props[Key], Selection[Key], CallbacksOnly>;
        };

type OptionSource<
  Props extends InPropsObject,
  Contract,
  CallbacksOnly extends boolean,
> = Contract extends { options: infer Selection }
  ? SourceValues<Props, Selection, CallbacksOnly>
  : {};

/** Expand object intersections for readable public helper signatures. */
type Expanded<Value> =
  Value extends Promise<infer Result>
    ? Promise<Expanded<Result>>
    : Value extends (...args: any[]) => any
      ? Value
      : Value extends readonly unknown[]
        ? Value
        : Value extends object
          ? { [Key in keyof Value]: Expanded<Value[Key]> }
          : Value;

type SourceInput<Values> = keyof Values extends never
  ? {}
  : {} extends Values
    ? { options?: Values }
    : { options: Values };

type InputOptionDefinitions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
> = InputDefinitions<OptionDefinitions<Resources, Options>>;

type SchemaCallerKeys<Schema extends OptionSchema, IncludeProps> = IncludeProps extends {
  options: infer Selection;
}
  ? Selection extends true
    ? keyof StandardSchemaV1.InferInput<Schema>
    : { [Key in keyof Selection]: Selection[Key] extends true ? Key : never }[keyof Selection] &
        keyof StandardSchemaV1.InferInput<Schema>
  : never;

type SchemaReusableInput<Schema extends OptionSchema, IncludeProps, Select> = 'options' extends
  | keyof IncludeProps
  | keyof Select
  ? Pick<StandardSchemaV1.InferInput<Schema>, SchemaCallerKeys<Schema, IncludeProps>> &
      SourceInput<Omit<StandardSchemaV1.InferInput<Schema>, SchemaCallerKeys<Schema, IncludeProps>>>
  : {};

export type ReusableInput<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  IncludeProps,
  CustomProps extends InPropsObject,
  Select,
> = Options extends OptionSchema
  ? Expanded<
      SchemaReusableInput<Options, IncludeProps, Select> &
        ResolveInputPropsAsDefined<CustomProps> &
        ReusableProps<Resources, {}, Omit<IncludeProps, 'options'>, {}> &
        ResourceCallerInput<Resources, IncludeProps> &
        ResourceCallerInput<Resources, Select>
    >
  : Expanded<
      ReusableProps<
        Resources,
        InputOptionDefinitions<Resources, Options>,
        CallerContract<Resources, Options, IncludeProps, Select>,
        InputDefinitions<CustomProps>
      > &
        ResourceCallerInput<Resources, IncludeProps> &
        ResourceCallerInput<Resources, Select> &
        SourceInput<
          OptionSource<InputOptionDefinitions<Resources, Options>, IncludeProps, true> &
            OptionSource<InputOptionDefinitions<Resources, Options>, Select, false>
        >
    >;

type SelectionAt<Selection, Key extends PropertyKey> = Selection extends true
  ? true
  : Key extends keyof Selection
    ? Selection[Key]
    : undefined;

type CallerOptions<Props extends InPropsObject, IncludeProps, Select> = {
  [
    Key in keyof Props as SelectionAt<IncludeProps, Key> extends infer Value
      ? Value extends Selector<any> | undefined
        ? never
        : Value extends true
          ? SelectionAt<Select, Key> extends true
            ? never
            : ObjectOption<Props[Key]> extends { properties: infer Shape extends InPropsObject }
              ? SelectionAt<Select, Key> extends object
                ? keyof CallerOptions<Shape, true, SelectionAt<Select, Key>> extends never
                  ? never
                  : Key
                : Key
              : Key
          : ObjectOption<Props[Key]> extends { properties: infer Shape extends InPropsObject }
            ? keyof CallerOptions<Shape, Value, SelectionAt<Select, Key>> extends never
              ? never
              : Key
            : never
      : never
  ]: ObjectOption<Props[Key]> extends { properties: infer Shape extends InPropsObject }
    ? SelectionAt<IncludeProps, Key> extends true
      ? SelectionAt<Select, Key> extends object
        ? CallerOptions<Shape, true, SelectionAt<Select, Key>>
        : true
      : CallerOptions<Shape, SelectionAt<IncludeProps, Key>, SelectionAt<Select, Key>>
    : true;
};

type CallerContract<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  IncludeProps,
  Select,
> = (IncludeProps extends { resources: true } ? { resources: true } : {}) &
  (IncludeProps extends { options: infer Value }
    ? Value extends Selector<any>
      ? {}
      : {
          options: CallerOptions<
            OptionDefinitions<Resources, Options>,
            Value,
            Select extends { options: infer Other } ? Other : {}
          >;
        }
    : {});

// Generic constraints alone accept extra keys on structurally compatible objects.
type ExactSelection<Selection, Allowed> = {
  [Key in keyof Selection]: Key extends keyof Allowed
    ? Selection[Key] extends Selector<any>
      ? Allowed[Key]
      : Selection[Key] extends object
        ? ExactSelection<Selection[Key], Exclude<Allowed[Key], true | undefined | Selector<any>>>
        : Allowed[Key]
    : never;
};

/** Configuration accepted by the bound reusable factory. */
export type ReusableDefinition<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  IncludeProps extends ReusableInclude<Resources, Options>,
  CustomProps extends InPropsObject,
  Select extends ReusableInclude<Resources, Options>,
  Result,
  Overlap extends ReusableOverlap | undefined = undefined,
> = {
  props?: PropsContract<
    ReusableInclude<Resources, Options> &
      IncludeProps &
      ExactSelection<IncludeProps, ReusableInclude<Resources, Options>>,
    CustomProps
  >;
  select?: ReusableInclude<Resources, Options> &
    Select &
    ExactSelection<Select, ReusableInclude<Resources, Options>>;
  /**
   * Resolve ambiguous leaf collisions explicitly; the default rejects them.
   */
  overlap?: Overlap;
  fn: (
    props: ReusableResolved<Resources, Options, IncludeProps, CustomProps, Select, Overlap>,
  ) => Result;
};

export type ReusableArguments<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  IncludeProps,
  CustomProps extends InPropsObject,
  Select,
> =
  {} extends ReusableInput<Resources, Options, IncludeProps, CustomProps, Select>
    ? [props?: ReusableInput<Resources, Options, IncludeProps, CustomProps, Select>]
    : [props: ReusableInput<Resources, Options, IncludeProps, CustomProps, Select>];

export type ReusableFunction<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  IncludeProps,
  CustomProps extends InPropsObject,
  Select,
  Result,
> = (
  ...args: ReusableArguments<Resources, Options, IncludeProps, CustomProps, Select>
) => Expanded<Result>;

/** Creates a validated function with one merged callback argument. */
export type CreateReusable<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
> = <
  const IncludeProps extends ReusableInclude<Resources, Options> = {},
  const CustomProps extends InPropsObject = {},
  const Select extends ReusableInclude<Resources, Options> = {},
  Result = unknown,
  const Overlap extends ReusableOverlap | undefined = undefined,
>(
  definition: ReusableDefinition<
    Resources,
    Options,
    IncludeProps,
    CustomProps,
    Select,
    Result,
    Overlap
  >,
) => ShowCallable<ReusableFunction<Resources, Options, IncludeProps, CustomProps, Select, Result>>;

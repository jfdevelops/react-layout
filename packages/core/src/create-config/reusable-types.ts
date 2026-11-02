import {
  type AnyBuiltPropDefinition,
  type ExtractDefinitionValue,
  type ResolvedBuiltPropShape,
} from '@jfdevelops/react-layout-validator';
import type {
  InferredInProps,
  InPropsDefinition,
  InPropsObject,
  PropsContract,
} from '../props';
import type { ResourceDefinition, ResourceEnum } from '../resource';
import type { LayoutResourcesAccessor } from './define-layout';

type Selector<Source> = (source: Source) => unknown;
type OptionValue<Definition extends AnyBuiltPropDefinition> =
  | ExtractDefinitionValue<Definition>
  | (Definition['visibility'] extends 'optional' ? undefined : never);

/** Select or transform resolved option values, or drill into object values. */
export type ReusableOptionSelection<Props extends InPropsObject> = {
  [Key in keyof Props]?: Props[Key] extends {
    type: 'object';
    properties: infer Shape extends InPropsObject;
  }
    ? true | Selector<OptionValue<Props[Key]>> | ReusableOptionSelection<Shape>
    : true | Selector<OptionValue<Props[Key]>>;
};

type OptionDefinitions<
  Resources extends readonly ResourceDefinition[],
  Options extends InPropsDefinition<Resources>,
> = InferredInProps<
  Resources,
  Options
> extends infer Props extends InPropsObject
  ? Props
  : never;

/** Only data sources declared by the factory are available for selection. */
export type ReusableInclude<
  Resources extends readonly ResourceDefinition[],
  Options extends InPropsDefinition<Resources>,
> = {
  resources?: true | Selector<LayoutResourcesAccessor<Resources>>;
} & (keyof OptionDefinitions<Resources, Options> extends never
  ? {}
  : {
      options?:
        | true
        | Selector<
            ResolvedBuiltPropShape<OptionDefinitions<Resources, Options>>
          >
        | ReusableOptionSelection<OptionDefinitions<Resources, Options>>;
    });

type SelectedOptionValue<
  Definition extends AnyBuiltPropDefinition,
  Selection,
> = Selection extends true
  ? ExtractDefinitionValue<Definition>
  : Selection extends (...args: any[]) => infer Result
  ? Result
  : Definition extends { properties: infer Shape extends InPropsObject }
  ? SelectedOptionProps<Shape, Selection>
  : never;

type SelectedOptionProps<Props extends InPropsObject, Selection> = {
  [Key in keyof Props & keyof Selection as Selection[Key] extends Selector<any>
    ? Key
    : Props[Key]['visibility'] extends 'required'
    ? Key
    : never]: SelectedOptionValue<Props[Key], Selection[Key]>;
} & {
  [Key in keyof Props & keyof Selection as Selection[Key] extends Selector<any>
    ? never
    : Props[Key]['visibility'] extends 'optional'
    ? Key
    : never]?: SelectedOptionValue<Props[Key], Selection[Key]>;
};

/** Options are flattened one level, so `options: { meta: true }` supplies `meta`. */
export type ReusableProps<
  Resources extends readonly ResourceDefinition[],
  Options extends InPropsDefinition<Resources>,
  Include,
  Custom extends InPropsObject,
> = (Include extends { resources: true }
  ? { resources: ResourceEnum<Resources>[number][] }
  : Include extends { resources: (...args: any[]) => infer Result }
  ? { resources: Result }
  : {}) &
  (Include extends { options: infer Selection }
    ? Selection extends (...args: any[]) => infer Result
      ? { options: Result }
      : Selection extends true
      ? ResolvedBuiltPropShape<OptionDefinitions<Resources, Options>>
      : SelectedOptionProps<OptionDefinitions<Resources, Options>, Selection>
    : {}) &
  ResolvedBuiltPropShape<Custom>;

/** Data selected for the reusable's single callback argument. */
export type ReusableSelected<
  Resources extends readonly ResourceDefinition[],
  Options extends InPropsDefinition<Resources>,
  Selection,
> = (Selection extends { resources: infer Value }
  ? {
      resources: Value extends (...args: any[]) => infer Result
        ? Result
        : LayoutResourcesAccessor<Resources>;
    }
  : {}) &
  (Selection extends { options: infer Value }
    ? Value extends (...args: any[]) => infer Result
      ? { options: Result }
      : SelectedValues<OptionDefinitions<Resources, Options>, Value>
    : {});

export type ReusableOverlap = 'preferProps' | 'preferSelect';

type SelectionShape<
  Props extends InPropsObject,
  Selection,
> = Selection extends Selector<any>
  ? 'value'
  : {
      [Key in keyof Props &
        (Selection extends true ? keyof Props : keyof Selection)]: SelectionAt<
        Selection,
        Key
      > extends Selector<any>
        ? 'value'
        : Props[Key] extends { properties: infer Shape extends InPropsObject }
        ? SelectionShape<Shape, SelectionAt<Selection, Key>>
        : 'value';
    };
type ContractShape<
  Props extends InPropsObject,
  Contract,
  Custom,
> = (Contract extends { resources: unknown } ? { resources: 'value' } : {}) &
  (Contract extends { options: infer Selection }
    ? Selection extends Selector<any>
      ? { options: 'value' }
      : SelectionShape<Props, Selection>
    : {}) & { [Key in keyof Custom]: 'value' };

type MergeValue<Left, Right, Overlap, LeftShape, RightShape> =
  LeftShape extends object
    ? RightShape extends object
      ? MergeValues<
          NonNullable<Left>,
          NonNullable<Right>,
          Overlap,
          LeftShape,
          RightShape
        >
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
type MergeValues<Left, Right, Overlap, LeftShape, RightShape> = Omit<
  Left,
  keyof Right
> &
  Omit<Right, keyof Left> & {
    [Key in Exclude<
      SharedKeys<Left, Right>,
      OptionalSharedKeys<Left, Right, Overlap, LeftShape, RightShape>
    >]: MergeValue<
      Left[Key],
      Right[Key],
      Overlap,
      Key extends keyof LeftShape ? LeftShape[Key] : 'value',
      Key extends keyof RightShape ? RightShape[Key] : 'value'
    >;
  } & {
    [Key in OptionalSharedKeys<
      Left,
      Right,
      Overlap,
      LeftShape,
      RightShape
    >]?: MergeValue<
      Left[Key],
      Right[Key],
      Overlap,
      Key extends keyof LeftShape ? LeftShape[Key] : 'value',
      Key extends keyof RightShape ? RightShape[Key] : 'value'
    >;
  };

export type ReusableResolved<
  Resources extends readonly ResourceDefinition[],
  Options extends InPropsDefinition<Resources>,
  Include,
  Custom extends InPropsObject,
  Select,
  Overlap = undefined,
> = Expanded<
  MergeValues<
    ReusableProps<Resources, Options, Include, Custom>,
    ReusableSelected<Resources, Options, Select>,
    Overlap,
    ContractShape<OptionDefinitions<Resources, Options>, Include, Custom>,
    ContractShape<OptionDefinitions<Resources, Options>, Select, {}>
  >
>;

type SelectedValues<
  Props extends InPropsObject,
  Selection,
> = Selection extends (...args: any[]) => infer Result
  ? Result
  : Selection extends true
  ? ResolvedBuiltPropShape<Props>
  : SelectedOptionProps<Props, Selection>;

/** Sources are derived against the finite definition tree, not arbitrary input keys. */
type SourceValue<
  Definition extends AnyBuiltPropDefinition,
  Selection,
  CallbacksOnly extends boolean,
> = Selection extends Selector<any>
  ? OptionValue<Definition>
  : Selection extends true
  ? CallbacksOnly extends true
    ? never
    : OptionValue<Definition>
  : Definition extends { properties: infer Shape extends InPropsObject }
  ? SourceValues<Shape, Selection, CallbacksOnly>
  : never;

type SourceKeys<
  Props extends InPropsObject,
  Selection,
  CallbacksOnly extends boolean,
> = {
  [Key in keyof Props & keyof Selection]: Selection[Key] extends Selector<any>
    ? Key
    : Selection[Key] extends true
    ? CallbacksOnly extends true
      ? never
      : Key
    : Props[Key] extends { properties: infer Shape extends InPropsObject }
    ? keyof SourceValues<Shape, Selection[Key], CallbacksOnly> extends never
      ? never
      : Key
    : never;
}[keyof Props & keyof Selection];

type SourceValues<
  Props extends InPropsObject,
  Selection,
  CallbacksOnly extends boolean,
> = Selection extends Selector<any>
  ? ResolvedBuiltPropShape<Props>
  : Selection extends true
  ? CallbacksOnly extends true
    ? {}
    : ResolvedBuiltPropShape<Props>
  : {
      [Key in SourceKeys<
        Props,
        Selection,
        CallbacksOnly
      > as Props[Key]['visibility'] extends 'required'
        ? Key
        : never]: SourceValue<Props[Key], Selection[Key], CallbacksOnly>;
    } & {
      [Key in SourceKeys<
        Props,
        Selection,
        CallbacksOnly
      > as Props[Key]['visibility'] extends 'optional'
        ? Key
        : never]?: SourceValue<Props[Key], Selection[Key], CallbacksOnly>;
    };

type OptionSource<
  Props extends InPropsObject,
  Contract,
  CallbacksOnly extends boolean,
> = Contract extends { options: infer Selection }
  ? SourceValues<Props, Selection, CallbacksOnly>
  : {};

/** Expand object intersections for readable public helper signatures. */
type Expanded<Value> = Value extends Promise<infer Result>
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

export type ReusableInput<
  Resources extends readonly ResourceDefinition[],
  Options extends InPropsDefinition<Resources>,
  Include,
  Custom extends InPropsObject,
  Select,
> = Expanded<
  ReusableProps<
    Resources,
    Options,
    CallerContract<Resources, Options, Include, Select>,
    Custom
  > &
    SourceInput<
      OptionSource<OptionDefinitions<Resources, Options>, Include, true> &
        OptionSource<OptionDefinitions<Resources, Options>, Select, false>
    >
>;

type SelectionAt<Selection, Key extends PropertyKey> = Selection extends true
  ? true
  : Key extends keyof Selection
  ? Selection[Key]
  : undefined;

type CallerOptions<Props extends InPropsObject, Include, Select> = {
  [Key in keyof Props as SelectionAt<Include, Key> extends infer Value
    ? Value extends Selector<any> | undefined
      ? never
      : Value extends true
      ? SelectionAt<Select, Key> extends true
        ? never
        : Props[Key] extends { properties: infer Shape extends InPropsObject }
        ? SelectionAt<Select, Key> extends object
          ? keyof CallerOptions<
              Shape,
              true,
              SelectionAt<Select, Key>
            > extends never
            ? never
            : Key
          : Key
        : Key
      : Props[Key] extends { properties: infer Shape extends InPropsObject }
      ? keyof CallerOptions<
          Shape,
          Value,
          SelectionAt<Select, Key>
        > extends never
        ? never
        : Key
      : never
    : never]: Props[Key] extends {
    properties: infer Shape extends InPropsObject;
  }
    ? SelectionAt<Include, Key> extends true
      ? SelectionAt<Select, Key> extends object
        ? CallerOptions<Shape, true, SelectionAt<Select, Key>>
        : true
      : CallerOptions<
          Shape,
          SelectionAt<Include, Key>,
          SelectionAt<Select, Key>
        >
    : true;
};

type CallerContract<
  Resources extends readonly ResourceDefinition[],
  Options extends InPropsDefinition<Resources>,
  Include,
  Select,
> = (Include extends { resources: true } ? { resources: true } : {}) &
  (Include extends { options: infer Value }
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
      ? ExactSelection<
          Selection[Key],
          Exclude<Allowed[Key], true | undefined | Selector<any>>
        >
      : Allowed[Key]
    : never;
};

/** Configuration accepted by the bound reusable factory. */
export type ReusableDefinition<
  Resources extends readonly ResourceDefinition[],
  Options extends InPropsDefinition<Resources>,
  Include extends ReusableInclude<Resources, Options>,
  Custom extends InPropsObject,
  Select extends ReusableInclude<Resources, Options>,
  Result,
  Overlap extends ReusableOverlap | undefined = undefined,
> = {
  props?: PropsContract<
    ReusableInclude<Resources, Options> &
      Include &
      ExactSelection<Include, ReusableInclude<Resources, Options>>,
    Custom
  >;
  select?: ReusableInclude<Resources, Options> &
    Select &
    ExactSelection<Select, ReusableInclude<Resources, Options>>;
  /** Resolve ambiguous leaf collisions explicitly; the default rejects them. */
  overlap?: Overlap;
  fn: (
    props: ReusableResolved<
      Resources,
      Options,
      Include,
      Custom,
      Select,
      Overlap
    >,
  ) => Result;
};

export type ReusableArguments<
  Resources extends readonly ResourceDefinition[],
  Options extends InPropsDefinition<Resources>,
  Include,
  Custom extends InPropsObject,
  Select,
> = {} extends ReusableInput<Resources, Options, Include, Custom, Select>
  ? [props?: ReusableInput<Resources, Options, Include, Custom, Select>]
  : [props: ReusableInput<Resources, Options, Include, Custom, Select>];

export type ReusableFunction<
  Resources extends readonly ResourceDefinition[],
  Options extends InPropsDefinition<Resources>,
  Include,
  Custom extends InPropsObject,
  Select,
  Result,
> = (
  ...args: ReusableArguments<Resources, Options, Include, Custom, Select>
) => Expanded<Result>;

/** Creates a validated function with one merged callback argument. */
export type CreateReusable<
  Resources extends readonly ResourceDefinition[],
  Options extends InPropsDefinition<Resources>,
> = <
  const Include extends ReusableInclude<Resources, Options> = {},
  const Custom extends InPropsObject = {},
  const Select extends ReusableInclude<Resources, Options> = {},
  Result = unknown,
  const Overlap extends ReusableOverlap | undefined = undefined,
>(
  definition: ReusableDefinition<
    Resources,
    Options,
    Include,
    Custom,
    Select,
    Result,
    Overlap
  >,
) => ReusableFunction<Resources, Options, Include, Custom, Select, Result>;

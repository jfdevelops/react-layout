import type { ReactNode, JSX } from 'react';
import type { BaseProp } from './base';

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

export type PropVisibility = 'optional' | 'required';
export type PrimitivePropType = keyof PrimitiveValueTypes;
export type NonEmptyReadonlyArray<Value> = readonly [Value, ...Value[]];
export type PropConfig = Record<string, unknown>;
export type ComponentPropType = 'ReactNode' | 'JSX.Element';
export type ComponentPropTypeMap = {
  ReactNode: ReactNode;
  'JSX.Element': JSX.Element;
};

export type PropType =
  | keyof PrimitiveTypesMap
  | ComponentPropType
  | 'union'
  | 'function'
  | 'record';

export type BasePropOptions<
  Type extends PropType,
  Visibility extends PropVisibility,
  Value = unknown,
> = {
  type: Type;
  visibility: Visibility;
  value?: Value;
};

export type AnyBaseProp = BaseProp<PropType, PropVisibility, unknown>;

export type ExtractPropValue<Prop extends AnyBaseProp> =
  Prop extends BaseProp<any, any, infer V> ? V : never;

export interface AnyBuiltPropDefinition {
  (value: unknown): unknown;
  visibility: PropVisibility;
  _baseProp?: AnyBaseProp;
}

export interface BuiltPropShape {
  [key: string]: AnyBuiltPropDefinition;
}

export type ResolveBuiltPropValue<Definition extends AnyBuiltPropDefinition> =
  ReturnType<Definition>;

export type ExtractDefinitionValue<D extends AnyBuiltPropDefinition> =
  D extends {
    _baseProp: infer P extends AnyBaseProp;
  }
    ? ExtractPropValue<P>
    : ReturnType<D>;

export type ResolvedBuiltPropShape<Shape extends BuiltPropShape> = {
  [Key in keyof Shape as Shape[Key]['visibility'] extends 'required'
    ? Key
    : never]: ExtractDefinitionValue<Shape[Key]>;
} & {
  [Key in keyof Shape as Shape[Key]['visibility'] extends 'required'
    ? never
    : Key]?: ExtractDefinitionValue<Shape[Key]>;
};

type IsJSXElementProp<D extends AnyBuiltPropDefinition> = D extends {
  type: 'JSX.Element';
}
  ? true
  : false;

type ResolvedPropKey<K extends string, D extends AnyBuiltPropDefinition> =
  IsJSXElementProp<D> extends true ? Capitalize<K> : K;

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

type ExtractLayoutMemberValue<P extends AnyBaseProp> = P extends {
  type: 'JSX.Element';
  properties: infer Shape extends Record<string, AnyBuiltPropDefinition>;
}
  ? (props: ResolveProps<Shape>) => JSX.Element
  : P extends { type: 'JSX.Element' }
    ? () => JSX.Element
    : ExtractPropValue<P>;

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

import type { StandardSchemaV1 } from '@standard-schema/spec';

export type PropVisibility = 'optional' | 'required';
export type SafeKeyOf<T extends object> = keyof T & string;

/** A prop definition: any synchronous Standard Schema v1 schema. */
export type PropDefinition = StandardSchemaV1;

/** Prop definitions keyed by prop name. */
export interface PropDefinitions {
  [key: string]: PropDefinition;
}

/** A prop is optional when its schema output admits `undefined`. */
export type DefinitionVisibility<Definition extends PropDefinition> =
  undefined extends StandardSchemaV1.InferOutput<Definition> ? 'optional' : 'required';

/**
 * Splits a value map into required keys and optional keys, where a key is
 * optional when its value admits `undefined`.
 */
type OptionalByUndefined<Values> = {
  [Key in keyof Values as undefined extends Values[Key] ? never : Key]: Values[Key];
} & {
  [Key in keyof Values as undefined extends Values[Key] ? Key : never]?: Values[Key];
};

/**
 * Marks a definition as a component slot: a prop that holds a component and is
 * therefore exposed under its capitalized name, so it can be rendered as JSX.
 */
export const componentSlotSymbol: unique symbol = Symbol.for(
  '@jfdevelops/react-layout/component-slot',
) as never;

/** The brand carried by a component-slot definition. */
export interface ComponentSlotBrand<Shape extends PropDefinitions = PropDefinitions> {
  /**
   * The props the slot's component accepts.
   */
  readonly [componentSlotSymbol]: Shape;
}

/** Whether a value is a component-slot definition. */
export function isComponentSlot(value: unknown): value is PropDefinition & ComponentSlotBrand {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    componentSlotSymbol in value
  );
}

/** A component slot is exposed as `Actions` when it is declared as `actions`. */
type SlotKey<Key extends string, Definition> =
  Definition extends ComponentSlotBrand<any> ? Capitalize<Key> : Key;

/**
 * The validated values a render callback receives for a set of definitions.
 * Component slots appear under their capitalized names.
 */
export type ResolveProps<Shape extends PropDefinitions> = OptionalByUndefined<{
  [Key in SafeKeyOf<Shape> as SlotKey<Key, Shape[Key]>]: StandardSchemaV1.InferOutput<Shape[Key]>;
}>;

/** Like {@link ResolveProps}, but every key stays exactly as it was declared. */
export type ResolvePropsAsDefined<Shape extends PropDefinitions> = OptionalByUndefined<{
  [Key in SafeKeyOf<Shape>]: StandardSchemaV1.InferOutput<Shape[Key]>;
}>;

/**
 * The values a caller supplies for a set of definitions. Component slots are
 * supplied under their capitalized names.
 */
export type ResolveInputProps<Shape extends PropDefinitions> = OptionalByUndefined<{
  [Key in SafeKeyOf<Shape> as SlotKey<Key, Shape[Key]>]: StandardSchemaV1.InferInput<Shape[Key]>;
}>;

/** Like {@link ResolveInputProps}, but every key stays exactly as it was declared. */
export type ResolveInputPropsAsDefined<Shape extends PropDefinitions> = OptionalByUndefined<{
  [Key in SafeKeyOf<Shape>]: StandardSchemaV1.InferInput<Shape[Key]>;
}>;

/** Definitions whose output is the caller-facing input of `Shape`. */
export type InputDefinitions<Shape extends PropDefinitions> = {
  [Key in keyof Shape]: StandardSchemaV1<
    StandardSchemaV1.InferInput<Shape[Key]>,
    StandardSchemaV1.InferInput<Shape[Key]>
  >;
};

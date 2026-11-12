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

/** The validated values a render callback receives for a set of definitions. */
export type ResolveProps<Shape extends PropDefinitions> = OptionalByUndefined<{
  [Key in SafeKeyOf<Shape>]: StandardSchemaV1.InferOutput<Shape[Key]>;
}>;

/** The values a caller supplies for a set of definitions. */
export type ResolveInputProps<Shape extends PropDefinitions> = OptionalByUndefined<{
  [Key in SafeKeyOf<Shape>]: StandardSchemaV1.InferInput<Shape[Key]>;
}>;

/** Definitions whose output is the caller-facing input of `Shape`. */
export type InputDefinitions<Shape extends PropDefinitions> = {
  [Key in keyof Shape]: StandardSchemaV1<
    StandardSchemaV1.InferInput<Shape[Key]>,
    StandardSchemaV1.InferInput<Shape[Key]>
  >;
};

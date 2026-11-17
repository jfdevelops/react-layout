import {
  createPropValidator,
  normalizePropDefinitions,
  type PropDefinition,
  type PropValidator,
  type PropValidatorSchema,
} from '@jfdevelops/react-layout-validator';
import type { ReactNode } from 'react';
import { InvalidComposablePropsError } from './errors';

/** Marks the built-in `children` slot as required. */
export type ChildrenRequirement = 'required';

// The shape behind every custom props object; `Definition` is what a prop may be.
type CustomPropsOf<Definition> = Record<
  string,
  Definition | ChildrenRequirement
> & {
  /** Optional React content by default; an explicit schema replaces that default. */
  children?: Definition | ChildrenRequirement;
};

/**
 * Custom props keyed by prop name. This one type defines every `props.custom`
 * in the library: layouts, render states, components, and composables.
 *
 * Elsewhere `props` is `{ include, custom }`, where `include` selects shared
 * layout options. A defined composable has no shared options to select, so
 * its `props` is this object directly, as if it were `custom`.
 */
export type CustomPropsObject = CustomPropsOf<PropDefinition>;

/** String requirements are reserved for the built-in children slot. */
export type CustomPropsInput<Props extends CustomPropsObject> = {
  [Key in keyof Props]: Key extends 'children'
    ? Props[Key]
    : Extract<Props[Key], PropDefinition>;
};

/** One prop of a defined composable: a schema, or an inline validator. */
export type ComposablePropDefinition = PropDefinition | PropValidator;

/**
 * The `props` of a defined composable: the library's custom props object,
 * whose definitions may also be inline validators.
 */
export type ComposableProps = CustomPropsOf<ComposablePropDefinition>;

/** {@link CustomPropsInput} for props that may also be inline validators. */
export type ComposablePropsInput<Props extends ComposableProps> = {
  [Key in keyof Props]: Key extends 'children'
    ? Props[Key]
    : Extract<Props[Key], ComposablePropDefinition>;
};

/** The schema behind the `children: 'required'` shorthand. */
export type RequiredChildren = PropValidatorSchema<
  Exclude<ReactNode, undefined>
>;

const requiredChildren: RequiredChildren = createPropValidator(
  ({ value, error }) => {
    if (value === undefined) {
      throw error('Expected children');
    }

    return value as Exclude<ReactNode, undefined>;
  },
);

/** The prop definitions that a defined composable's `props` resolve to. */
export type NormalizeComposableProps<Props> = {
  [Key in keyof Props]: Props[Key] extends PropDefinition
    ? Props[Key]
    : Props[Key] extends ChildrenRequirement
      ? RequiredChildren
      : Props[Key] extends (...args: never[]) => infer Value
        ? PropValidatorSchema<Value>
        : never;
};

/** Resolves the children shorthand and inline validators to definitions. */
export function normalizeComposableProps<Props extends ComposableProps>(
  props: Props,
) {
  return normalizePropDefinitions(
    Object.fromEntries(
      Object.entries(props).map(([key, definition]) => {
        if (typeof definition !== 'string') {
          return [key, definition];
        }

        if (key !== 'children' || definition !== 'required') {
          throw new InvalidComposablePropsError(
            `Prop "${key}" cannot be a string: only children accepts the required shorthand.`,
          );
        }

        return [key, requiredChildren];
      }),
    ),
  ) as NormalizeComposableProps<Props>;
}

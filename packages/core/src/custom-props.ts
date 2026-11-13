import {
  requiredChildren,
  optionalChildren,
  type RequiredChildren,
  type OptionalChildren,
} from './built-in-props';
import {
  type PropDefinition,
  type PropDefinitions,
  type PropValidationContext,
  isComponentSlot,
  validateProps,
  type ResolveProps,
  type ResolvePropsAsDefined,
  type ResolveInputProps,
  type ResolveInputPropsAsDefined,
} from '@jfdevelops/react-layout-validator';
import type { WithChildren } from '@jfdevelops/react-layout-composables';
import { LayoutConfigurationError } from './errors';
import { capitalize } from '@jfdevelops/react-layout-internals';

export function validateCustomProps<Props extends object>(
  definitions: PropDefinitions,
  props: Props,
  context?: PropValidationContext,
) {
  const suppliedDefinitions = Object.fromEntries(
    Object.entries(definitions).map(([key, definition]) => [
      isComponentSlot(definition) ? capitalize(key) : key,
      definition,
    ]),
  );

  return validateProps(suppliedDefinitions, props, context);
}

export type ChildrenRequirement = 'required';
export type CustomPropsObject = Record<
  string,
  PropDefinition | ChildrenRequirement
> & {
  /** Optional React content by default; an explicit schema replaces that default. */
  children?: PropDefinition | ChildrenRequirement;
};

/** String requirements are reserved for the built-in children slot. */
export type CustomPropsInput<Props extends CustomPropsObject> = {
  [Key in keyof Props]: Key extends 'children'
    ? Props[Key]
    : Extract<Props[Key], PropDefinition>;
};

export type NormalizedCustomProps<Props extends CustomPropsObject> = {
  [Key in keyof Props]: Props[Key] extends PropDefinition
    ? Props[Key]
    : Key extends 'children'
      ? RequiredChildren
      : never;
} & ('children' extends keyof Props ? {} : { children: OptionalChildren });

export type ResolveRenderProps<Props extends CustomPropsObject> = WithChildren<
  ResolveProps<NormalizedCustomProps<Props>>
>;
export type ResolveCallProps<Props extends CustomPropsObject> = WithChildren<
  ResolveInputProps<NormalizedCustomProps<Props>>
>;
export type ResolveCallPropsAsDefined<Props extends CustomPropsObject> =
  WithChildren<ResolveInputPropsAsDefined<NormalizedCustomProps<Props>>>;
export type ResolveRenderPropsAsDefined<Props extends CustomPropsObject> =
  WithChildren<ResolvePropsAsDefined<NormalizedCustomProps<Props>>>;

export function normalizeCustomProps<Props extends CustomPropsObject>(
  props: Props,
) {
  return {
    children: optionalChildren,
    ...Object.fromEntries(
      Object.entries(props).map(([key, definition]) => {
        if (typeof definition !== 'string') {
          return [key, definition];
        }
        if (key !== 'children' || definition !== 'required') {
          throw new LayoutConfigurationError(
            'Only custom.children accepts the required shorthand.',
          );
        }

        return [key, requiredChildren];
      }),
    ),
  } as NormalizedCustomProps<Props>;
}

import {
  createProp,
  type AnyBuiltPropDefinition,
  type ResolveProps,
  type ResolveInputProps,
  type ResolvedInputShape,
  type ResolvedBuiltPropShape,
} from '@jfdevelops/react-layout-validator';
import type { WithChildren } from '@jfdevelops/react-layout-composables';
import { LayoutConfigurationError } from './errors';

export type ChildrenRequirement = 'required';
export type CustomPropsObject = Record<
  string,
  AnyBuiltPropDefinition | ChildrenRequirement
> & {
  children?: AnyBuiltPropDefinition | ChildrenRequirement;
};

/** String requirements are reserved for the built-in children slot. */
export type CustomPropsInput<Props extends CustomPropsObject> = {
  [Key in keyof Props]: Key extends 'children'
    ? Props[Key]
    : Extract<Props[Key], AnyBuiltPropDefinition>;
};

type RequiredChildren = ReturnType<typeof createProp.component<'ReactNode'>>;
export type NormalizedCustomProps<Props extends CustomPropsObject> = {
  [Key in keyof Props]: Props[Key] extends AnyBuiltPropDefinition
    ? Props[Key]
    : Key extends 'children'
    ? RequiredChildren
    : never;
};

export type ResolveRenderProps<Props extends CustomPropsObject> = WithChildren<
  ResolveProps<NormalizedCustomProps<Props>>
>;
export type ResolveCallProps<Props extends CustomPropsObject> = WithChildren<
  ResolveInputProps<NormalizedCustomProps<Props>>
>;
export type ResolveCallPropsAsDefined<Props extends CustomPropsObject> = WithChildren<
  ResolvedInputShape<NormalizedCustomProps<Props>>
>;
export type ResolveRenderPropsAsDefined<Props extends CustomPropsObject> =
  WithChildren<ResolvedBuiltPropShape<NormalizedCustomProps<Props>>>;

export function normalizeCustomProps<Props extends CustomPropsObject>(
  props: Props,
) {
  return Object.fromEntries(
    Object.entries(props).map(([key, definition]) => {
      if (typeof definition !== 'string') return [key, definition];
      if (key !== 'children' || definition !== 'required') {
        throw new LayoutConfigurationError(
          'Only custom.children accepts the required shorthand.',
        );
      }
      const children = createProp.component({ type: 'ReactNode' });
      return [key, children];
    }),
  ) as NormalizedCustomProps<Props>;
}

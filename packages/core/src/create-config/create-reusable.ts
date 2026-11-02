import {
  createProp,
  validateProps,
  type AnyBuiltPropDefinition,
  type ExtractDefinitionValue,
  type ResolvedBuiltPropShape,
} from '@jfdevelops/react-layout-validator';
import type {
  InferredInProps,
  InPropsDefinition,
  InPropsObject,
} from '../props';
import type { ResourceDefinition, ResourceEnum } from '../resource';
import { LayoutConfigurationError } from '../errors';

/** Object definitions can be selected recursively; other definitions are leaves. */
export type ReusableOptionSelection<Props extends InPropsObject> = {
  [Key in keyof Props]?: Props[Key] extends {
    type: 'object';
    properties: infer Shape extends InPropsObject;
  }
    ? true | ReusableOptionSelection<Shape>
    : true;
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
> = { resources?: true } & (keyof OptionDefinitions<
  Resources,
  Options
> extends never
  ? {}
  : {
      options?:
        | true
        | ReusableOptionSelection<OptionDefinitions<Resources, Options>>;
    });

type SelectedOptionValue<
  Definition extends AnyBuiltPropDefinition,
  Selection,
> = Selection extends true
  ? ExtractDefinitionValue<Definition>
  : Definition extends { properties: infer Shape extends InPropsObject }
  ? SelectedOptionProps<Shape, Selection>
  : never;

type SelectedOptionProps<Props extends InPropsObject, Selection> = {
  [Key in keyof Props &
    keyof Selection as Props[Key]['visibility'] extends 'required'
    ? Key
    : never]: SelectedOptionValue<Props[Key], Selection[Key]>;
} & {
  [Key in keyof Props &
    keyof Selection as Props[Key]['visibility'] extends 'optional'
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
  : {}) &
  (Include extends { options: infer Selection }
    ? Selection extends true
      ? ResolvedBuiltPropShape<OptionDefinitions<Resources, Options>>
      : SelectedOptionProps<OptionDefinitions<Resources, Options>, Selection>
    : {}) &
  ResolvedBuiltPropShape<Custom>;

// Generic constraints alone accept extra keys on structurally compatible objects.
type ExactSelection<Selection, Allowed> = {
  [Key in keyof Selection]: Key extends keyof Allowed
    ? Selection[Key] extends object
      ? ExactSelection<Selection[Key], Exclude<Allowed[Key], true | undefined>>
      : Allowed[Key]
    : never;
};

/** Creates a validated ordinary function with the shared configuration's types. */
export type CreateReusable<
  Resources extends readonly ResourceDefinition[],
  Options extends InPropsDefinition<Resources>,
> = <
  const Include extends ReusableInclude<Resources, Options> = {},
  const Custom extends InPropsObject = {},
  Result = unknown,
>(definition: {
  props?: {
    include?: ReusableInclude<Resources, Options> &
      Include &
      ExactSelection<Include, ReusableInclude<Resources, Options>>;
    custom?: Custom;
  };
  fn: (props: ReusableProps<Resources, Options, Include, Custom>) => Result;
}) => (
  ...args: {} extends ReusableProps<Resources, Options, Include, Custom>
    ? [props?: ReusableProps<Resources, Options, Include, Custom>]
    : [props: ReusableProps<Resources, Options, Include, Custom>]
) => Result;

function selectOptions(
  definitions: InPropsObject,
  selection: Record<string, unknown>,
) {
  const selected: InPropsObject = {};
  for (const [key, include] of Object.entries(selection)) {
    const definition = definitions[key];
    if (!Object.hasOwn(definitions, key)) {
      throw new LayoutConfigurationError(`Unknown reusable option "${key}".`);
    }
    if (include === true) {
      selected[key] = definition;
      continue;
    }
    if (
      !include ||
      typeof include !== 'object' ||
      !('properties' in definition) ||
      !('type' in definition) ||
      definition.type !== 'object'
    ) {
      throw new LayoutConfigurationError(
        `Invalid reusable selection for "${key}".`,
      );
    }
    const nested = createProp.object(
      selectOptions(
        definition.properties as InPropsObject,
        include as Record<string, unknown>,
      ),
    );
    selected[key] =
      definition.visibility === 'optional' ? nested.optional() : nested;
  }
  return selected;
}

export function createReusableBuilder<
  const Resources extends readonly ResourceDefinition[],
  Options extends InPropsDefinition<Resources>,
>(resources: Resources, options: Options): CreateReusable<Resources, Options>;
export function createReusableBuilder(
  resources: readonly ResourceDefinition[],
  options: InPropsObject | ((...args: any[]) => InPropsObject),
) {
  const keys = resources.map((entry) =>
    typeof entry === 'string' ? entry : entry.value,
  );
  const resource = createProp.string.enum(keys as [string, ...string[]]);

  function createReusable(definition: {
    props?: { include?: Record<string, unknown>; custom?: InPropsObject };
    fn: (props: Record<string, unknown>) => unknown;
  }) {
    const include = definition.props?.include ?? {};
    for (const key of Object.keys(include)) {
      if (key !== 'resources' && key !== 'options') {
        throw new LayoutConfigurationError(`Unknown reusable source "${key}".`);
      }
    }
    const optionDefinitions =
      typeof options === 'function'
        ? options({ name: createProp.string.literal('Reusable'), resource })
        : options;
    const selected =
      include.options === true
        ? optionDefinitions
        : include.options
        ? selectOptions(
            optionDefinitions,
            include.options as Record<string, unknown>,
          )
        : {};
    const definitions: InPropsObject = { ...selected };
    if (include.resources) {
      if (Object.hasOwn(definitions, 'resources')) {
        throw new LayoutConfigurationError(
          'Reusable prop "resources" is selected more than once.',
        );
      }
      definitions.resources = createProp.array(resource);
    }
    for (const [key, custom] of Object.entries(
      definition.props?.custom ?? {},
    )) {
      if (Object.hasOwn(definitions, key)) {
        throw new LayoutConfigurationError(
          `Reusable prop "${key}" is selected more than once.`,
        );
      }
      definitions[key] = custom;
    }

    return function reusable(props: Record<string, unknown> = {}) {
      validateProps(definitions, props);
      return definition.fn(props);
    };
  }

  return createReusable as unknown;
}

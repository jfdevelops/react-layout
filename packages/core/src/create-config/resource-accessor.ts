import { InvalidResourceError } from '../errors';
import {
  createIsValidResourceFn,
  normalizeResourceDefinitions,
  type ResourceDefinition,
  type ResourceDefinitionValue,
  type LayoutResourceKey,
  type NormalizedResourceDefinitions,
} from '../resource';
import type { Show } from '../utils';

/**
 * A single {@link ResourceDefinition} kept by a `pick`, or `never` when it does
 * not match. Widened definitions (`string`, `{ value: string }`) are always
 * kept — the concrete keys are not known statically, so the runtime filter is
 * the source of truth.
 */
type PickResourceDefinition<
  Definition,
  Keys extends string,
> = Definition extends ResourceDefinition
  ? string extends ResourceDefinitionValue<Definition>
    ? Definition
    : ResourceDefinitionValue<Definition> extends Keys
      ? Definition
      : never
  : never;

type PickResourceDefinitions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Keys extends LayoutResourceKey<Resources>,
> = Array<PickResourceDefinition<Resources[number], Keys>>;

/**
 * A single {@link ResourceDefinition} kept by an `omit`, or `never` when it is
 * one of the omitted keys. Widened definitions are always kept.
 */
type OmitResourceDefinition<
  Definition,
  Keys extends string,
> = Definition extends ResourceDefinition
  ? string extends ResourceDefinitionValue<Definition>
    ? Definition
    : ResourceDefinitionValue<Definition> extends Keys
      ? never
      : Definition
  : never;

type OmitResourceDefinitions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Keys extends LayoutResourceKey<Resources>,
> = Array<OmitResourceDefinition<Resources[number], Keys>>;

/**
 * The result of `resources.pick(...)` / `resources.omit(...)`.
 *
 * - calling it returns the selected resource definitions.
 * - `.isResource(value)` narrows an unknown value to one of the selected keys.
 * - `.parse(value)` returns a selected key or throws `InvalidResourceError`.
 */
export type ResourceSelection<
  Definitions extends ReadonlyArray<ResourceDefinition>,
> = {
  /**
   * Returns the selected resource definitions.
   */
  (): Show<Definitions>;
  /**
   * Narrows an unknown value to one of the selected resource keys.
   *
   * @param value - The value to test.
   */
  isResource(value: unknown): value is LayoutResourceKey<Definitions>;
  /**
   * Validates an unknown value and returns its resource key unchanged.
   *
   * @param value - The value to validate against these top-level resources.
   * @returns The validated resource key.
   * @throws {InvalidResourceError} When the value is not an available resource.
   */
  parse(value: unknown): LayoutResourceKey<Definitions>;
};

/**
 * Accessor for the resources bound to a `defineResourceLayout` definition.
 *
 * - `resources()` returns normalized `{ value, subResources? }` definitions.
 * - `resources.raw()` returns the definitions exactly as declared.
 * - `resources.omit(key, ...rest)` selects every resource except the named ones.
 * - `resources.pick(key, ...rest)` selects only the named resources.
 * - `resources.isResource(value)` narrows an unknown value to a resource key.
 * - `resources.parse(value)` returns a valid key or throws `InvalidResourceError`.
 *
 * `pick` / `omit` return a {@link ResourceSelection} thunk: call it for the
 * definitions, or use its `isResource` guard.
 */
export type LayoutResourcesAccessor<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = {
  /**
   * Returns normalized resources, or the result of an optional selector.
   *
   * @param select - Transforms the normalized tuple without losing its literal
   * resource and sub-resource types.
   */
  <Selected = NormalizedResourceDefinitions<Resources>>(
    select?: (resources: NormalizedResourceDefinitions<Resources>) => Selected,
  ): Selected;
  /**
   * Returns the original resource declarations, or an optionally selected
   * value derived from them.
   *
   * @param select - Transforms the original tuple exactly as it was declared.
   */
  raw<Selected = Resources>(
    select?: (resources: Resources) => Selected,
  ): Selected;
  /**
   * Narrows an unknown value to one of this definition's top-level resource
   * keys.
   *
   * @param value - The value to test.
   */
  isResource(value: unknown): value is LayoutResourceKey<Resources>;
  /**
   * Validates an unknown value and returns its resource key unchanged.
   *
   * @param value - The value to validate against these top-level resources.
   * @returns The validated resource key.
   * @throws {InvalidResourceError} When the value is not an available resource.
   */
  parse(value: unknown): LayoutResourceKey<Resources>;
  /**
   * Selects every declared resource except the named ones. Requires at least
   * one key.
   *
   * @param keys - Top-level resource names to exclude.
   */
  omit: {
    <
      Keys extends [
        LayoutResourceKey<Resources>,
        ...LayoutResourceKey<Resources>[],
      ],
    >(
      ...keys: Keys
    ): ResourceSelection<OmitResourceDefinitions<Resources, Keys[number]>>;
    /**
     * Resource declarations retained for schema adapters.
     */
    readonly resourceSchema: {
      readonly kind: 'omit';
      readonly resources: Resources;
    };
  };
  /**
   * Selects only the named resources. Requires at least one key.
   *
   * @param keys - Top-level resource names to keep.
   */
  pick: {
    <
      Keys extends [
        LayoutResourceKey<Resources>,
        ...LayoutResourceKey<Resources>[],
      ],
    >(
      ...keys: Keys
    ): ResourceSelection<PickResourceDefinitions<Resources, Keys[number]>>;
    /**
     * Resource declarations retained for schema adapters.
     */
    readonly resourceSchema: {
      readonly kind: 'pick';
      readonly resources: Resources;
    };
  };
};

/**
 * Creates a shared resource guard and parser for an accessor or selection.
 *
 * @param resources - The available top-level resource definitions.
 * @returns Validation methods sharing one precomputed resource guard.
 * @internal
 */
export function createResourceValidation<
  Resources extends ReadonlyArray<ResourceDefinition>,
>(resources: Resources) {
  const isResource = createIsValidResourceFn(resources);
  const validResources = resources.map((resource) =>
    typeof resource === 'string' ? resource : resource.value,
  );

  const parse: LayoutResourcesAccessor<Resources>['parse'] = (value) => {
    if (!isResource(value)) {
      throw new InvalidResourceError({
        resource: value,
        validResources: [...validResources],
      });
    }

    return value;
  };

  return {
    isResource,
    parse,
  };
}

function createResourceSelection(
  definitions: ReadonlyArray<ResourceDefinition>,
): ResourceSelection<ReadonlyArray<ResourceDefinition>> {
  const selection: ResourceSelection<ReadonlyArray<ResourceDefinition>> = () =>
    definitions;
  const { isResource, parse } = createResourceValidation(definitions);

  selection.isResource = isResource;
  selection.parse = parse;

  return selection;
}

/**
 * Creates the callable resource accessor shared by global and bound layout
 * definitions.
 *
 * @param resources - Resource definitions to expose and normalize.
 * @returns A callable normalized accessor with raw, selection, and guard APIs.
 * @internal
 */
export function createLayoutResourcesAccessor<
  Resources extends ReadonlyArray<ResourceDefinition>,
>(resources: Resources): LayoutResourcesAccessor<Resources> {
  const normalizedResources = normalizeResourceDefinitions(resources);
  const accessor = ((select?: (value: typeof normalizedResources) => unknown) =>
    select
      ? select(normalizedResources)
      : normalizedResources) as LayoutResourcesAccessor<Resources>;

  accessor.raw = ((select?: (value: Resources) => unknown) =>
    select
      ? select(resources)
      : resources) as LayoutResourcesAccessor<Resources>['raw'];

  Object.assign(accessor, createResourceValidation(resources));

  accessor.omit = ((...keys: string[]) =>
    createResourceSelection(
      resources.filter(
        (resource) =>
          !keys.includes(
            typeof resource === 'string' ? resource : resource.value,
          ),
      ),
    )) as LayoutResourcesAccessor<Resources>['omit'];

  accessor.pick = ((...keys: string[]) =>
    createResourceSelection(
      resources.filter((resource) =>
        keys.includes(typeof resource === 'string' ? resource : resource.value),
      ),
    )) as LayoutResourcesAccessor<Resources>['pick'];

  for (const kind of ['pick', 'omit'] as const) {
    Object.defineProperty(accessor[kind], 'resourceSchema', {
      value: {
        kind,
        resources,
      },
    });
  }

  return accessor;
}

import type { ElementType, ReactNode } from 'react';
import type { NonEmptyReadonlyArray } from '@jfdevelops/react-layout-validator';
import {
  createIsValidResourceFn,
  type LayoutResourceKey,
  type ResourceDefinition,
} from '../resource';
import { LayoutConfigurationError } from '../errors';
import type {
  LayoutRenderResourcesAccessor,
  ResourceSelection,
} from './define-layout';

export type ResourceAnchorLinkFn<Resource extends string> = (
  resource: Resource,
) => string;

export type ResourceLinkHref<Resource extends string> =
  | string
  | ResourceAnchorLinkFn<Resource>;

export type ResourceLinkConfigResource<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = LayoutResourceKey<Resources> | (string & {});

export type ResourceIconFn<Resource = any> = (resource: Resource) => ReactNode;

export type ResourceIcon<Resource = any> = ReactNode | ResourceIconFn<Resource>;

declare const resourceIconInputMarker: unique symbol;
declare const resourceIconComponentInputMarker: unique symbol;

type ResourceIconInputMarker<Value> = {
  readonly [resourceIconInputMarker]: Value;
};

type ResourceIconComponentInputMarker<Icon extends ElementType> = {
  readonly [resourceIconComponentInputMarker]: Icon;
};

export type ResolveResourceIconInput<Definition> =
  Definition extends ResourceIconComponentInputMarker<infer Icon>
    ? Icon
    : Definition extends ResourceIconInputMarker<infer Value>
      ? Value
      : Definition extends ReadonlyArray<unknown>
        ? { [Index in keyof Definition]: ResolveResourceIconInput<Definition[Index]> }
        : Definition extends object
          ? { [Key in keyof Definition]: ResolveResourceIconInput<Definition[Key]> }
          : Definition;

export interface DefineResourceIconInputHelpers<
  Resources extends ReadonlyArray<ResourceDefinition>,
> {
  resource(): ResourceIconInputMarker<LayoutResourceKey<Resources>>;
  icon<Icon extends ElementType = ElementType>(): ResourceIconComponentInputMarker<Icon>;
}

export interface DefineResourceIconInputResult<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Definition,
> {
  render(
    render: (options: {
      resource: LayoutRenderResourcesAccessor<Resources>;
      input: ResolveResourceIconInput<Definition>;
    }) => ReactNode,
  ): (
    input: ResolveResourceIconInput<Definition>,
  ) => ResourceIconFn<LayoutRenderResourcesAccessor<Resources>>;
}

export interface DefineResourceIconFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
> {
  <Icon extends ElementType = ElementType>(
    render: (options: {
      resource: LayoutRenderResourcesAccessor<Resources>;
      Icon: Icon;
    }) => ReactNode,
  ): (Icon: Icon) => ResourceIconFn<LayoutRenderResourcesAccessor<Resources>>;
  input<Definition>(
    defineInput: (
      helpers: DefineResourceIconInputHelpers<Resources>,
    ) => Definition,
  ): DefineResourceIconInputResult<Resources, Definition>;
}
export interface CreateResourceLinkOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends ResourceLinkConfigResource<Resources>,
> {
  /**
   * The label of the link. This is the text that will be displayed in the link.
   */
  label: string;
  /**
   * An optional icon to render when the link is active.
   */
  activeIcon?: ReactNode;
  /**
   * An optional icon to register with the link. This is a headless approach, meaning you have full control
   * over the icon's rendering.
   */
  icon?: ResourceIcon<LayoutRenderResourcesAccessor<Resources>>;
  /**
   * The href of the link. By default, the href will be `"/"`. While you **don't** need to include a hash,
   * if you do, it will override the `hash` property (if provided).
   */
  href?: ResourceLinkHref<Resource>;
  /**
   * The hash of the link. By default, the hash will be the resource name. If you need to customize it, you can provide
   * a string or a function that returns a string.
   *
   * @remarks A `"#"` is not required. The generated href will include it automatically.
   */
  hash?: ResourceLinkHref<Resource>;
}

export type CreateResourceLinkConfig<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends ResourceLinkConfigResource<Resources> = ResourceLinkConfigResource<Resources>,
> = {
  [Key in Resource]?: CreateResourceLinkOptions<
    Resources,
    Key
  >;
};

export type InferHashFromResourceLinkHref<
  Resource extends string,
  Hash extends ResourceLinkHref<Resource>,
> = Hash extends string
  ? Hash
  : Hash extends ResourceAnchorLinkFn<Resource>
    ? ReturnType<Hash>
    : never;

export type CreatedResourceHref = {
  /**
   * The full generated href with the `hash` if provided.
   */
  full: string;
  /**
   * The given href. This is the same value as the `href` property of the config.
   */
  given: string;
};

export type CreatedResourceLinkBase<Resource extends string> = {
  activeIcon?: ReactNode;
  href: CreatedResourceHref;
  label: string;
  resource: Resource;
  icon: ResourceIcon;
};
export type CreateResourceLinkWithHash<
  Resource extends string,
  Hash extends ResourceLinkHref<Resource>,
> = Omit<CreatedResourceLinkBase<Resource>, 'href'> & {
  href: CreatedResourceHref & {
    hash: InferHashFromResourceLinkHref<Resource, Hash>;
  };
};

export type CreatedResourceLink<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
> = {
  [Resource in keyof Config]-?: Resource extends ResourceLinkConfigResource<Resources>
    ? Config[Resource] extends {
        hash: infer hash extends ResourceLinkHref<Resource>;
      }
      ? CreateResourceLinkWithHash<Resource, hash>
      : CreatedResourceLinkBase<Resource>
    : never;
}[keyof Config];

export interface CreateResourceLinksFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
> {
  <const Resource extends ResourceLinkConfigResource<Resources>>(
    config: CreateResourceLinkConfig<Resources, Resource>,
  ): Array<
    CreatedResourceLink<
      Resources,
      CreateResourceLinkConfig<Resources, Resource>
    >
  >;
  createResourceMap: CreateResourceMapFn<Resources>;
  defineIcon: DefineResourceIconFn<Resources>;
  withGroups: CreateResourceLinksWithGroupsFn<Resources>;
}

export interface CreateResourceLinkGroupOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Links extends object =
    CreateResourceLinkConfig<Resources>,
> {
  /**
   * An optional, caller-provided identity for the group. Provide this when you
   * combine groups from more than one `withGroups()` call into one list (e.g.
   * a module-owned nav section alongside a feature-owned one) — without it,
   * the id is derived from the group's `label` and its link resources, which
   * is enough to keep groups from a single call apart but can't distinguish
   * two independently-defined groups that happen to look identical.
   */
  id?: string;
  /**
   * The label of the group. This is the text that will be displayed for the group.
   */
  label?: string;
  /**
   * An optional icon to render when the group is active.
   */
  activeIcon?: ReactNode;
  /**
   * An optional icon to register with the group. This is a headless approach, meaning you have full control
   * over the icon's rendering.
   */
  icon?: ResourceIcon<LayoutRenderResourcesAccessor<Resources>>;
  /**
   * The resource links in this group.
   */
  links: Links;
}

export type CreateResourceLinkGroupInput<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends ResourceLinkConfigResource<Resources> = ResourceLinkConfigResource<Resources>,
> = CreateResourceLinkGroupOptions<
  Resources,
  CreateResourceLinkConfig<Resources, Resource>
>;

export type AnyCreatedResourceLink<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = {
  [Resource in LayoutResourceKey<Resources>]:
    | CreatedResourceLinkBase<Resource>
    | CreateResourceLinkWithHash<Resource, string>;
}[LayoutResourceKey<Resources>];

export type CreateResourceLinksWithGroups<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = {
  activeIcon?: ReactNode;
  id: string;
  label: string | null;
  icon: ResourceIcon<LayoutRenderResourcesAccessor<Resources>>;
  links: Array<AnyCreatedResourceLink<Resources>>;
};

export type ResolvedResourceLinksWithGroups<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = Omit<CreateResourceLinksWithGroups<Resources>, 'icon' | 'links'> & {
  icon: ReactNode;
  links: Array<
    Omit<AnyCreatedResourceLink<Resources>, 'icon'> & { icon: ReactNode }
  >;
};

export type CreateResourceMap<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Value,
> = Partial<Record<LayoutResourceKey<Resources>, Value>>;

export type ValidateResource<
  Resource extends string,
  Map extends object,
> = Resource extends Extract<keyof Map, string> ? Resource : never;

export type CreatedResourceMap<Map extends object> = Map & {
  isValidResource(value: unknown): value is Extract<keyof Map, string>;
  get<const Resource extends string>(
    resource: ValidateResource<Resource, Map>,
  ): Map[typeof resource];
};

export interface CreateResourceMapFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
> {
  /**
   * Creates a resource map for this layout.
   *
   * @param map Values keyed by this layout's resources. An unknown resource,
   * or a key that collides with a map helper, is rejected.
   */
  <const Map extends CreateResourceMap<Resources, unknown>>(
    map: Map,
  ): CreatedResourceMap<Map>;
}

export interface CreateResourceLinksWithGroupsFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
> {
  /**
   * Groups resource links into sections.
   *
   * @param groups The sections to create. At least one is required. The link
   * keys in those sections are the resources `findResource` can resolve.
   */
  <const Resource extends ResourceLinkConfigResource<Resources>>(
    groups: NonEmptyReadonlyArray<
      CreateResourceLinkGroupInput<Resources, Resource>
    >,
  ): CreateResourceLinksWithGroupsResult<Resources, Resource>;
}

export type CreateResourceLinksWithGroupsResult<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends ResourceLinkConfigResource<Resources> = ResourceLinkConfigResource<Resources>,
> = Array<CreateResourceLinksWithGroups<Resources>> & {
  /**
   * Resolves each group's icon and its link icons for the active resource.
   *
   * Functional icons receive the resources accessor for `resource`. Read the
   * groups value directly when you do not need to resolve icons.
   *
   * @param resource The active resource key.
   */
  (
    resource: LayoutResourceKey<Resources>,
  ): Array<ResolvedResourceLinksWithGroups<Resources>>;
  /**
   * Creates a resource map for this layout. Same helper as
   * `createResourceLinks.createResourceMap`.
   *
   * @param map Values keyed by this layout's resources. An unknown resource,
   * or a key that collides with a map helper, is rejected.
   */
  createResourceMap: CreateResourceMapFn<Resources>;
  /**
   * Returns the group whose links include `resource`.
   *
   * The result is `undefined` when that resource was not configured in any
   * group. A resource outside this layout is rejected by the type.
   *
   * @param resource The resource whose group should be returned.
   */
  findResource<
    const RequestedResource extends LayoutResourceKey<Resources> | Resource,
  >(
    resource: RequestedResource,
  ): FindResourceGroupResult<Resources, Resource, RequestedResource>;
};

export type FindResourceGroupResult<
  Resources extends ReadonlyArray<ResourceDefinition>,
  IncludedResource extends string,
  RequestedResource extends string,
> = RequestedResource extends unknown
  ? RequestedResource extends IncludedResource
    ? CreateResourceLinksWithGroups<Resources>
    : undefined
  : never;

function resolveResourceLinkHref<Resource extends string>(
  value: ResourceLinkHref<Resource> | undefined,
  resource: Resource,
  fallback: string,
) {
  return typeof value === 'function' ? value(resource) : (value ?? fallback);
}

function normalizeResourceLinkHash(hash: string) {
  return hash.replace(/^#+/, '');
}

function createFullResourceLinkHref(href: string, hash: string) {
  if (href.includes('#')) {
    return href;
  }

  return `${href}#${normalizeResourceLinkHash(hash)}`;
}

function createResourceLinksFromConfig<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends ResourceLinkConfigResource<Resources>,
>(config: CreateResourceLinkConfig<Resources, Resource>) {
  return Object.entries(config).map(([resource, config]) => {
    if (!config) {
      throw new LayoutConfigurationError(
        `[createResourceLinks]: "config" is required for the ${resource} resource.`,
      );
    }

    if (typeof config !== 'object') {
      throw new LayoutConfigurationError(
        `[createResourceLinks]: "config" must be an object for the ${resource} resource. Received ${typeof config}`,
      );
    }

    if (!('label' in config)) {
      throw new LayoutConfigurationError(
        `[createResourceLinks]: "label" is required for the ${resource} resource.`,
      );
    }

    if (typeof config.label !== 'string') {
      throw new LayoutConfigurationError(
        `[createResourceLinks]: "label" must be a string for the ${resource} resource. Received ${typeof config.label}`,
      );
    }

    const linkConfig = config as CreateResourceLinkOptions<
      Resources,
      typeof resource
    >;

    if (
      'href' in linkConfig &&
      linkConfig.href !== undefined &&
      typeof linkConfig.href !== 'string' &&
      typeof linkConfig.href !== 'function'
    ) {
      throw new LayoutConfigurationError(
        `[createResourceLinks]: "href" must be a string or function for the ${resource} resource. Received ${typeof linkConfig.href}`,
      );
    }

    if (
      'hash' in linkConfig &&
      linkConfig.hash !== undefined &&
      typeof linkConfig.hash !== 'string' &&
      typeof linkConfig.hash !== 'function'
    ) {
      throw new LayoutConfigurationError(
        `[createResourceLinks]: "hash" must be a string or function for the ${resource} resource. Received ${typeof linkConfig.hash}`,
      );
    }

    const givenHref = resolveResourceLinkHref(linkConfig.href, resource, '/');
    const givenHash = resolveResourceLinkHref(
      linkConfig.hash,
      resource,
      resource,
    );
    const href = {
      given: givenHref,
      full: createFullResourceLinkHref(givenHref, givenHash),
      ...(linkConfig.hash !== undefined && !givenHref.includes('#')
        ? { hash: normalizeResourceLinkHash(givenHash) }
        : {}),
    };

    return {
      ...(linkConfig.activeIcon !== undefined
        ? { activeIcon: linkConfig.activeIcon }
        : {}),
      href,
      label: config.label,
      resource,
      icon: 'icon' in config ? config.icon : null,
    };
  });
}

/**
 * Deterministic, not random: a random id (the previous implementation used
 * `crypto.randomUUID()` / `Math.random()`) would make `withGroups()` unsafe to
 * call from module scope — some runtimes (e.g. Cloudflare Workers) disallow
 * generating random values outside a request handler, and config arrays like
 * this are routinely defined as top-level constants.
 *
 * Falls back to the group's own shape — its `label` and its link resource
 * keys — rather than just the array index, so groups from *separate*
 * `withGroups()` calls that get concatenated into one list (a module-owned nav
 * section next to a feature-owned one, say) don't collide just because they're
 * both first in their own call. Two groups that are genuinely identical in
 * shape will still collide; pass an explicit `id` on the group to rule that
 * out entirely.
 */
function createResourceLinkGroupId(
  group: { id?: unknown; label?: unknown; links: object },
  index: number,
) {
  if (typeof group.id === 'string' && group.id.length > 0) {
    return group.id;
  }

  const label = typeof group.label === 'string' ? group.label : '';
  const linkKeys = Object.keys(group.links).join(',');
  return `group-${index}-${label}-${linkKeys}`;
}

function readResourceValue(resource: ResourceDefinition) {
  return typeof resource === 'string' ? resource : resource.value;
}

function createResourceSelection(
  definitions: ReadonlyArray<ResourceDefinition>,
): ResourceSelection<ReadonlyArray<ResourceDefinition>> {
  const selection = (() => definitions) as ResourceSelection<
    ReadonlyArray<ResourceDefinition>
  >;

  selection.isResource = createIsValidResourceFn(definitions);

  return selection;
}

function createRenderResourcesAccessor<
  Resources extends ReadonlyArray<ResourceDefinition>,
>(resources: Resources, current: LayoutResourceKey<Resources>) {
  const accessor = Object.assign(() => resources, {
    current,
  }) as LayoutRenderResourcesAccessor<Resources>;

  accessor.isResource = createIsValidResourceFn(resources);
  accessor.omit = ((...keys: string[]) =>
    createResourceSelection(
      resources.filter((resource) => !keys.includes(readResourceValue(resource))),
    )) as LayoutRenderResourcesAccessor<Resources>['omit'];
  accessor.pick = ((...keys: string[]) =>
    createResourceSelection(
      resources.filter((resource) => keys.includes(readResourceValue(resource))),
    )) as LayoutRenderResourcesAccessor<Resources>['pick'];

  return accessor;
}

function createResourceMapFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
>(resources: Resources): CreateResourceMapFn<Resources> {
  const helperNames = new Set(['get', 'isValidResource']);
  const resourceKeys = new Set(
    resources.map((resource) =>
      typeof resource === 'string' ? resource : resource.value,
    ),
  );

  return function createResourceMap<
    const Map extends CreateResourceMap<Resources, unknown>,
  >(map: Map) {
    const configuredResources = Object.keys(map);

    for (const resource of configuredResources) {
      if (!resourceKeys.has(resource)) {
        throw new LayoutConfigurationError(
          `[createResourceLinks.createResourceMap]: unknown resource "${resource}".`,
        );
      }

      if (helperNames.has(resource)) {
        throw new LayoutConfigurationError(
          `[createResourceLinks.createResourceMap]: resource "${resource}" conflicts with a map helper.`,
        );
      }
    }

    const configuredResourceKeys = new Set(configuredResources);
    const resourceValues = new Map(
      configuredResources.map((resource) => [
        resource,
        (map as Record<string, unknown>)[resource],
      ]),
    );

    Object.defineProperties(map, {
      get: {
        value(resource: string) {
          return resourceValues.get(resource);
        },
      },
      isValidResource: {
        value(value: unknown): value is Extract<keyof Map, string> {
          return (
            typeof value === 'string' && configuredResourceKeys.has(value)
          );
        },
      },
    });

    return map as CreatedResourceMap<Map>;
  };
}

function createResourceLinksWithGroups<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends ResourceLinkConfigResource<Resources>,
>(
  resources: Resources,
  createResourceMap: CreateResourceMapFn<Resources>,
  groups: ReadonlyArray<CreateResourceLinkGroupInput<Resources, Resource>>,
): CreateResourceLinksWithGroupsResult<Resources, Resource> {
  if (!Array.isArray(groups)) {
    throw new LayoutConfigurationError(
      '[createResourceLinks.withGroups]: "groups" must be an array.',
    );
  }

  if (groups.length === 0) {
    throw new LayoutConfigurationError(
      '[createResourceLinks.withGroups]: "groups" must include at least one group.',
    );
  }

  const createdGroups = groups.map((group, index) => {
    if (!group) {
      throw new LayoutConfigurationError(
        `[createResourceLinks.withGroups]: group at index ${index} is required.`,
      );
    }

    if (typeof group !== 'object') {
      throw new LayoutConfigurationError(
        `[createResourceLinks.withGroups]: group at index ${index} must be an object. Received ${typeof group}`,
      );
    }

    if (
      'label' in group &&
      group.label !== undefined &&
      typeof group.label !== 'string'
    ) {
      throw new LayoutConfigurationError(
        `[createResourceLinks.withGroups]: "label" must be a string for group at index ${index}. Received ${typeof group.label}`,
      );
    }

    if ('id' in group && group.id !== undefined && typeof group.id !== 'string') {
      throw new LayoutConfigurationError(
        `[createResourceLinks.withGroups]: "id" must be a string for group at index ${index}. Received ${typeof group.id}`,
      );
    }

    if (!('links' in group)) {
      throw new LayoutConfigurationError(
        `[createResourceLinks.withGroups]: "links" is required for group at index ${index}.`,
      );
    }

    if (
      typeof group.links !== 'object' ||
      group.links === null ||
      Array.isArray(group.links)
    ) {
      throw new LayoutConfigurationError(
        `[createResourceLinks.withGroups]: "links" must be an object for group at index ${index}. Received ${Array.isArray(group.links) ? 'array' : typeof group.links}`,
      );
    }

    return {
      ...(group.activeIcon !== undefined
        ? { activeIcon: group.activeIcon }
        : {}),
      id: createResourceLinkGroupId(group, index),
      label: 'label' in group ? (group.label ?? null) : null,
      icon: 'icon' in group ? group.icon : null,
      links: createResourceLinksFromConfig(group.links),
    };
  }) as Array<CreateResourceLinksWithGroups<Resources>>;

  function resolveGroups(resource?: LayoutResourceKey<Resources>) {
    if (resource === undefined) {
      throw new LayoutConfigurationError(
        '[createResourceLinks.withGroups]: "resource" is required.',
      );
    }

    const currentResources = createRenderResourcesAccessor(resources, resource);

    return createdGroups.map((group) => ({
      ...group,
      icon:
        typeof group.icon === 'function'
          ? group.icon(currentResources)
          : group.icon,
      links: group.links.map((link) => ({
        ...link,
        icon:
          typeof link.icon === 'function'
            ? link.icon(currentResources)
            : link.icon,
      })),
    }));
  }

  const callableGroups = new Proxy(resolveGroups, {
    get(target, property, receiver) {
      if (property === 'createResourceMap') {
        return createResourceMap;
      }

      if (property === Symbol.iterator) {
        return createdGroups[Symbol.iterator].bind(createdGroups);
      }

      if (property === 'toJSON') {
        return () => createdGroups;
      }

      if (property in createdGroups) {
        const value = Reflect.get(createdGroups, property);
        return typeof value === 'function' ? value.bind(createdGroups) : value;
      }

      return Reflect.get(target, property, receiver);
    },
    getOwnPropertyDescriptor(target, property) {
      return (
        Reflect.getOwnPropertyDescriptor(createdGroups, property) ??
        Reflect.getOwnPropertyDescriptor(target, property)
      );
    },
    getPrototypeOf() {
      return Array.prototype;
    },
    ownKeys(target) {
      return [
        ...new Set([
          ...Reflect.ownKeys(target),
          ...Reflect.ownKeys(createdGroups),
        ]),
      ];
    },
    set(target, property, value, receiver) {
      if (property in createdGroups || /^\d+$/.test(String(property))) {
        return Reflect.set(createdGroups, property, value);
      }

      return Reflect.set(target, property, value, receiver);
    },
  });
  Object.defineProperty(createdGroups, 'findResource', {
    value(resource: ResourceLinkConfigResource<Resources>) {
      return createdGroups.find((group) =>
        group.links.some((link) => link.resource === resource),
      );
    },
  });

  return callableGroups as CreateResourceLinksWithGroupsResult<
    Resources,
    Resource
  >;
}

function createDefineIcon<
  Resources extends ReadonlyArray<ResourceDefinition>,
>(): DefineResourceIconFn<Resources> {
  function defineIcon<Icon extends ElementType = ElementType>(
    render: (options: {
      resource: LayoutRenderResourcesAccessor<Resources>;
      Icon: Icon;
    }) => ReactNode,
  ) {
    return function createIcon(Icon: Icon) {
      return function renderIcon(
        resource: LayoutRenderResourcesAccessor<Resources>,
      ) {
        return render({ resource, Icon });
      };
    };
  }

  defineIcon.input = function defineIconInput<Definition>(
    defineInput: (
      helpers: DefineResourceIconInputHelpers<Resources>,
    ) => Definition,
  ): DefineResourceIconInputResult<Resources, Definition> {
    const resourceMarker = {} as ResourceIconInputMarker<never>;
    const componentMarker = {} as ResourceIconComponentInputMarker<ElementType>;

    defineInput({
      resource() {
        return resourceMarker;
      },
      icon<Icon extends ElementType = ElementType>() {
        return componentMarker as ResourceIconComponentInputMarker<Icon>;
      },
    });

    return {
      render(
        render: (options: {
          resource: LayoutRenderResourcesAccessor<Resources>;
          input: ResolveResourceIconInput<Definition>;
        }) => ReactNode,
      ) {
        return function createIcon(
          input: ResolveResourceIconInput<Definition>,
        ) {
          return function renderIcon(
            resource: LayoutRenderResourcesAccessor<Resources>,
          ) {
            return render({ resource, input });
          };
        };
      },
    };
  };

  return defineIcon;
}

export function createResourceLinksFn<
  const Resources extends ReadonlyArray<ResourceDefinition>,
>(_resources: Resources): CreateResourceLinksFn<Resources> {
  const createResourceMap = createResourceMapFn(_resources);
  const defineIcon = createDefineIcon<Resources>();

  function createResourceLinks<
    const Resource extends ResourceLinkConfigResource<Resources>,
  >(config: CreateResourceLinkConfig<Resources, Resource>) {
    return createResourceLinksFromConfig(config);
  }

  function withGroups<
    const Resource extends ResourceLinkConfigResource<Resources>,
  >(
    groups: NonEmptyReadonlyArray<
      CreateResourceLinkGroupInput<Resources, Resource>
    >,
  ) {
    return createResourceLinksWithGroups(_resources, createResourceMap, groups);
  }

  return Object.assign(createResourceLinks, {
    createResourceMap,
    defineIcon,
    withGroups,
  }) as CreateResourceLinksFn<Resources>;
}

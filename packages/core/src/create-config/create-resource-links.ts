import { ReactNode } from 'react';
import {
  type LayoutResourceKey,
  type ResourceDefinition,
} from '../resource';

export type ResourceAnchorLinkFn<Resource extends string> = (
  resource: Resource,
) => string;

export type ResourceLinkHref<Resource extends string> =
  | string
  | ResourceAnchorLinkFn<Resource>;

export type ResourceLinkConfigResource<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = LayoutResourceKey<Resources> | (string & {});
export interface CreateResourceLinkOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends ResourceLinkConfigResource<Resources>,
> {
  /**
   * The label of the link. This is the text that will be displayed in the link.
   */
  label: string;
  /**
   * An optional icon to register with the link. This is a headless approach, meaning you have full control
   * over the icon's rendering.
   */
  icon?: ReactNode;
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
  href: CreatedResourceHref;
  label: string;
  resource: Resource;
  icon: ReactNode;
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
   * An optional icon to register with the group. This is a headless approach, meaning you have full control
   * over the icon's rendering.
   */
  icon?: ReactNode;
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
  id: string;
  label: string | null;
  icon: ReactNode;
  links: Array<AnyCreatedResourceLink<Resources>>;
};

export type CreateResourceLinksWithGroupsFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = <const Resource extends ResourceLinkConfigResource<Resources>>(
  groups: ReadonlyArray<CreateResourceLinkGroupInput<Resources, Resource>>,
) => Array<CreateResourceLinksWithGroups<Resources>>;

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
      throw new Error(
        `[createResourceLinks]: "config" is required for the ${resource} resource.`,
      );
    }

    if (typeof config !== 'object') {
      throw new Error(
        `[createResourceLinks]: "config" must be an object for the ${resource} resource. Received ${typeof config}`,
      );
    }

    if (!('label' in config)) {
      throw new Error(
        `[createResourceLinks]: "label" is required for the ${resource} resource.`,
      );
    }

    if (typeof config.label !== 'string') {
      throw new Error(
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
      throw new Error(
        `[createResourceLinks]: "href" must be a string or function for the ${resource} resource. Received ${typeof linkConfig.href}`,
      );
    }

    if (
      'hash' in linkConfig &&
      linkConfig.hash !== undefined &&
      typeof linkConfig.hash !== 'string' &&
      typeof linkConfig.hash !== 'function'
    ) {
      throw new Error(
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

function createResourceLinksWithGroups<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends ResourceLinkConfigResource<Resources>,
>(
  groups: ReadonlyArray<CreateResourceLinkGroupInput<Resources, Resource>>,
): Array<CreateResourceLinksWithGroups<Resources>> {
  if (!Array.isArray(groups)) {
    throw new Error(
      '[createResourceLinks.withGroups]: "groups" must be an array.',
    );
  }

  return groups.map((group, index) => {
    if (!group) {
      throw new Error(
        `[createResourceLinks.withGroups]: group at index ${index} is required.`,
      );
    }

    if (typeof group !== 'object') {
      throw new Error(
        `[createResourceLinks.withGroups]: group at index ${index} must be an object. Received ${typeof group}`,
      );
    }

    if (
      'label' in group &&
      group.label !== undefined &&
      typeof group.label !== 'string'
    ) {
      throw new Error(
        `[createResourceLinks.withGroups]: "label" must be a string for group at index ${index}. Received ${typeof group.label}`,
      );
    }

    if ('id' in group && group.id !== undefined && typeof group.id !== 'string') {
      throw new Error(
        `[createResourceLinks.withGroups]: "id" must be a string for group at index ${index}. Received ${typeof group.id}`,
      );
    }

    if (!('links' in group)) {
      throw new Error(
        `[createResourceLinks.withGroups]: "links" is required for group at index ${index}.`,
      );
    }

    if (
      typeof group.links !== 'object' ||
      group.links === null ||
      Array.isArray(group.links)
    ) {
      throw new Error(
        `[createResourceLinks.withGroups]: "links" must be an object for group at index ${index}. Received ${Array.isArray(group.links) ? 'array' : typeof group.links}`,
      );
    }

    return {
      id: createResourceLinkGroupId(group, index),
      label: 'label' in group ? (group.label ?? null) : null,
      icon: 'icon' in group ? group.icon : null,
      links: createResourceLinksFromConfig(group.links),
    };
  }) as Array<CreateResourceLinksWithGroups<Resources>>;
}

export function createResourceLinksFn<
  const Resources extends ReadonlyArray<ResourceDefinition>,
>(_resources: Resources): CreateResourceLinksFn<Resources> {
  function createResourceLinks<
    const Resource extends ResourceLinkConfigResource<Resources>,
  >(config: CreateResourceLinkConfig<Resources, Resource>) {
    return createResourceLinksFromConfig(config);
  }

  function withGroups<
    const Resource extends ResourceLinkConfigResource<Resources>,
  >(
    groups: ReadonlyArray<CreateResourceLinkGroupInput<Resources, Resource>>,
  ) {
    return createResourceLinksWithGroups(groups);
  }

  return Object.assign(createResourceLinks, {
    withGroups,
  }) as CreateResourceLinksFn<Resources>;
}

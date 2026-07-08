import { ReactNode } from 'react';
import {
  createIsValidResourceFn,
  type LayoutResourceKey,
  type ResourceDefinition,
} from '../resource';

export type ResourceAnchorLinkFn<Resource extends string> = (
  resource: Resource,
) => string;

export type ResourceLinkHref<Resource extends string> =
  | string
  | ResourceAnchorLinkFn<Resource>;

export interface CreateResourceLinkOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends LayoutResourceKey<Resources>,
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
> = {
  [resource in LayoutResourceKey<Resources>]?: CreateResourceLinkOptions<
    Resources,
    resource
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
  icon: ReactNode
};
export type CreateResourceLinkWithHash<
  Resource extends string,
  Hash extends ResourceLinkHref<Resource>,
> = Pick<CreatedResourceLinkBase<Resource>, 'label'> & {
  href: CreatedResourceHref & {
    hash: InferHashFromResourceLinkHref<Resource, Hash>;
  };
};

export type CreatedResourceLink<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config extends CreateResourceLinkConfig<Resources>,
> = {
  [Resource in keyof Config]: Resource extends LayoutResourceKey<Resources>
    ? Config[Resource] extends {
        hash: infer hash extends ResourceLinkHref<Resource>;
      }
      ? CreateResourceLinkWithHash<Resource, hash>
      : CreatedResourceLinkBase<Resource>
    : never;
}[keyof Config];

export type CreateResourceLinksFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = <const Config extends CreateResourceLinkConfig<Resources>>(
  Config: Config,
) => Array<CreatedResourceLink<Resources, Config>>;

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

export function createResourceLinksFn<
  const Resources extends ReadonlyArray<ResourceDefinition>,
>(resources: Resources): CreateResourceLinksFn<Resources> {
  const isValidResource = createIsValidResourceFn(resources);

  return ((config) => {
    return Object.entries(config).map(([resource, config]) => {
      if (!isValidResource(resource)) {
        throw new Error(`[createResourceLinks]: Invalid resource: ${resource}`);
      }

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
  }) as CreateResourceLinksFn<Resources>;
}

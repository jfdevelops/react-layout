import type { ComposableComponents } from '@jfdevelops/react-layout-composables';
import type { CustomPropsObject } from '../custom-props';
import { LayoutConfigurationError } from '../errors';
import type { InPropsDefinition } from '../props';
import { normalizeResourceDefinitions, type LayoutResourceKey } from '../resource';
import {
  createDefinedResourceLayout,
  type CreateDefinedResourceLayoutOptions,
  type CreateDefinedResourceLayoutResult,
  type NonEmptyResources,
} from './create-defined-resource-layout';
import type { LayoutIncludeProps } from './define-layout';
import type { LayoutNameInput } from './layout-name';
import type { SurfaceResources } from './surface-host';

export type SurfaceHost<Resources extends NonEmptyResources> = {
  resources: '*' | readonly LayoutResourceKey<Resources>[];
};

type SelectedHost<Resources extends NonEmptyResources, Host> = Host extends {
  resources: '*';
}
  ? LayoutResourceKey<Resources>
  : Host extends { resources: readonly (infer Resource)[] }
    ? Resource
    : undefined;

export type DefineResourceSurface<Parent extends NonEmptyResources> = <
  const Resources extends NonEmptyResources,
  const Options extends InPropsDefinition<Resources> = {},
  Composables extends ComposableComponents = {},
  Namespace extends boolean = false,
  const IncludeProps extends LayoutIncludeProps<Resources, Options, Composables> = {},
  const CustomProps extends CustomPropsObject = {},
  const Naming extends LayoutNameInput<LayoutResourceKey<Resources>> | undefined = undefined,
  const Host extends SurfaceHost<Parent> | undefined = undefined,
>(
  configuration: CreateDefinedResourceLayoutOptions<
    Resources,
    Options,
    Composables,
    Namespace,
    IncludeProps,
    CustomProps,
    Naming
  > & {
    host?: Host & { surface?: never };
  },
) => CreateDefinedResourceLayoutResult<
  SurfaceResources<Resources, SelectedHost<Parent, Host>>,
  Options,
  Composables,
  Namespace,
  IncludeProps,
  CustomProps,
  Naming
>;

/** Binds the host resource union without sharing the host's prop contract. */
export function createResourceSurface<Parent extends NonEmptyResources>(
  parent: Parent,
): DefineResourceSurface<Parent> {
  const available = new Set(normalizeResourceDefinitions(parent).map((resource) => resource.value));

  function defineSurface(
    configuration: Parameters<typeof createDefinedResourceLayout>[0] & {
      host?: SurfaceHost<Parent>;
    },
  ) {
    const host = configuration.host;
    const selected = host?.resources === '*' ? available : new Set(host?.resources);

    for (const resource of selected) {
      if (!available.has(resource)) {
        throw new LayoutConfigurationError(`Unknown host resource "${resource}".`);
      }
    }

    const result = createDefinedResourceLayout(configuration);
    const defineLayout = result.defineResourceLayout;

    function defineHostedLayout(layout: Parameters<typeof defineLayout>[0]) {
      const definition = defineLayout(layout);

      if (host) {
        definition.createResourceLayout = bindHostedFactory(
          definition.createResourceLayout,
          selected,
        );
      }

      return Object.assign(definition, {
        host,
      });
    }

    Object.assign(defineHostedLayout, {
      lazy: defineLayout.lazy,
    });

    return Object.assign(result, {
      defineResourceLayout: defineHostedLayout,
    });
  }

  return defineSurface as unknown as DefineResourceSurface<Parent>;
}

/** Consumes relationship fields before forwarding to the existing factories. */
export function bindHostedFactory<Factory extends Function>(
  factory: Factory,
  hosts: ReadonlySet<string>,
): Factory {
  return new Proxy(factory, {
    apply(target, thisArgument, argumentsList: unknown[]) {
      const options = argumentsList[0];

      if (
        !options ||
        typeof options !== 'object' ||
        !('hostedBy' in options) ||
        typeof options.hostedBy !== 'string' ||
        !hosts.has(options.hostedBy)
      ) {
        throw new LayoutConfigurationError(
          'A valid "hostedBy" resource is required for this surface.',
        );
      }

      const { hostedBy, ...input } = options;

      return Reflect.apply(target, thisArgument, [input]);
    },
    get(target, key, receiver) {
      const value: unknown = Reflect.get(target, key, receiver);

      if (
        (key === 'forResource' || key === 'forResources' || key === 'makeComposable') &&
        typeof value === 'function'
      ) {
        return bindHostedFactory(value, hosts);
      }

      return value;
    },
  });
}

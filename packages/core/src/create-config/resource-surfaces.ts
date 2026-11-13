import type { ComposableComponents } from '@jfdevelops/react-layout-composables';
import type { CustomPropsObject } from '../custom-props';
import { LayoutConfigurationError } from '../errors';
import type { InPropsDefinition } from '../props';
import {
  normalizeResourceDefinitions,
  type LayoutResourceKey,
} from '../resource';
import {
  createDefinedResourceLayout,
  type NonEmptyResources,
} from './create-defined-resource-layout';
import {
  defineResourceLayout,
  type DefinedResourceLayout,
  type DefinedResourceLayoutFromStates,
  type LayoutIncludeProps,
  type CreateViewMapRenderStatesOptions,
  type CreateViewMapFunctionRenderOptions,
  type ResourceLayoutShellComponent,
  type ShellLayoutDefinition,
} from './define-layout';
import { bindHostedFactory } from './resource-surface';
import type { LayoutNameInput } from './layout-name';
import type { LayoutComposablesDefinition } from './render-state';
import type { SurfaceResources } from './surface-host';

/** The bag uses sibling keys only to identify the host definition. */
type SurfaceInput = {
  resources: NonEmptyResources;
  host?: { surface: string; resources: '*' | readonly string[] };
  options?: InPropsDefinition<NonEmptyResources>;
  composables?: unknown;
  props?: { include?: object; custom?: CustomPropsObject };
  render?: unknown;
  shell?: Record<string, unknown>;
  namespace?: boolean;
  name?: LayoutNameInput<LayoutResourceKey<NonEmptyResources>>;
};

type ResourcesOf<Entry> = Entry extends {
  resources: infer Resources extends NonEmptyResources;
}
  ? Resources
  : never;
type OptionsOf<Entry> = Entry extends {
  options: infer Options extends InPropsDefinition<ResourcesOf<Entry>>;
}
  ? Options
  : {};
type ComposablesOf<Entry> = Entry extends {
  composables: (
    ...args: never[]
  ) => infer Composables extends ComposableComponents;
}
  ? Composables
  : {};
type IncludeOf<Entry> = Entry extends {
  props: {
    include: infer Include extends LayoutIncludeProps<
      ResourcesOf<Entry>,
      OptionsOf<Entry>,
      ComposablesOf<Entry>
    >;
  };
}
  ? Include
  : {};
type CustomOf<Entry> = Entry extends {
  props: { custom: infer Custom extends CustomPropsObject };
}
  ? Custom
  : {};
type NamespaceOf<Entry> = Entry extends {
  namespace: infer Namespace extends boolean;
}
  ? Namespace
  : false;
type NameOf<Entry> = Entry extends {
  name: infer Name extends LayoutNameInput<
    LayoutResourceKey<ResourcesOf<Entry>>
  >;
}
  ? Name
  : undefined;
type HostOf<Bag, Entry> = Entry extends {
  host: { surface: infer Key extends keyof Bag; resources: infer Selection };
}
  ? Selection extends '*'
    ? LayoutResourceKey<ResourcesOf<Bag[Key]>>
    : Selection extends readonly (infer Resource)[]
      ? Resource
      : never
  : undefined;
type BoundResources<Bag, Entry> = SurfaceResources<
  ResourcesOf<Entry>,
  HostOf<Bag, Entry>
>;

type SurfaceLayoutResult<Bag, Entry> = Entry extends {
  createResourceLayout: unknown;
}
  ? Entry
  : Entry extends { render: infer Render extends { default: unknown } }
    ? DefinedResourceLayoutFromStates<
        BoundResources<Bag, Entry>,
        OptionsOf<Entry>,
        ComposablesOf<Entry>,
        Render,
        NamespaceOf<Entry>,
        IncludeOf<Entry>,
        CustomOf<Entry>,
        NameOf<Entry>
      >
    : DefinedResourceLayout<
        BoundResources<Bag, Entry>,
        OptionsOf<Entry>,
        ComposablesOf<Entry>,
        IncludeOf<Entry>,
        CustomOf<Entry>,
        {},
        NamespaceOf<Entry>,
        NameOf<Entry>
      >;

type ShellOf<Entry> = Entry extends { shell: infer Shell } ? Shell : never;
type ShellComposables<Entry> = ComposablesOf<ShellOf<Entry>>;
type ShellInclude<Entry> =
  ShellOf<Entry> extends {
    props: {
      include: infer Include extends LayoutIncludeProps<
        ResourcesOf<Entry>,
        OptionsOf<Entry>,
        ShellComposables<Entry>
      >;
    };
  }
    ? Include
    : {};
type ShellCustom<Entry> = CustomOf<ShellOf<Entry>>;
type SurfaceResult<Bag, Entry> = SurfaceLayoutResult<Bag, Entry> &
  (Entry extends { shell: unknown }
    ? {
        Shell: ResourceLayoutShellComponent<
          ResourcesOf<Entry>,
          OptionsOf<Entry>,
          ShellComposables<Entry>,
          ShellInclude<Entry>,
          ShellCustom<Entry>
        >;
      }
    : {});

type ValidateHost<Bag, Entry> = Entry extends {
  host: { surface: infer Key; resources: unknown };
}
  ? Key extends keyof Bag
    ? {
        host: {
          surface: Key;
          resources: '*' | readonly LayoutResourceKey<ResourcesOf<Bag[Key]>>[];
        };
      }
    : { host: never }
  : {};

type SurfaceBag = Record<
  string,
  SurfaceInput | { createResourceLayout: unknown }
>;

type ContextualSurface<Entry extends SurfaceInput> = {
  composables?: LayoutComposablesDefinition<
    ResourcesOf<Entry>,
    ComposablesOf<Entry>
  >;
  render?: Entry extends { render: infer Render extends { default: unknown } }
    ? CreateViewMapRenderStatesOptions<
        ResourcesOf<Entry>,
        OptionsOf<Entry>,
        ComposablesOf<Entry>,
        IncludeOf<Entry>,
        CustomOf<Entry>,
        Render
      >['layout']['render']
    : CreateViewMapFunctionRenderOptions<
        ResourcesOf<Entry>,
        OptionsOf<Entry>,
        ComposablesOf<Entry>,
        IncludeOf<Entry>,
        CustomOf<Entry>
      >['layout']['render'];
  shell?: ShellLayoutDefinition<
    ResourcesOf<Entry>,
    OptionsOf<Entry>,
    ShellComposables<Entry>,
    ShellInclude<Entry>,
    ShellCustom<Entry>
  >;
};

/** Defines independent families or registers completed layouts without changing them. */
export function defineResourceSurfaces<
  const Bag extends Record<string, { createResourceLayout: unknown }>,
>(surfaces: Bag): Bag;
export function defineResourceSurfaces<
  const Options extends Record<string, InPropsDefinition<NonEmptyResources>>,
  const Includes extends Record<keyof Options, object>,
  const Bag extends Record<string, SurfaceInput>,
>(
  surfaces: Bag & { [Key in keyof Bag]: ValidateHost<Bag, Bag[Key]> } & {
    [Key in keyof Options]: SurfaceInput & {
      options?: Options[Key];
      render?:
        | CreateViewMapFunctionRenderOptions<
            NonEmptyResources,
            Options[Key],
            {},
            Includes[Key],
            {}
          >['layout']['render']
        | { default: unknown };
      shell?: ShellLayoutDefinition<
        NonEmptyResources,
        Options[Key],
        {},
        {},
        {}
      >;
    };
  } & {
    [Key in keyof Includes]: SurfaceInput & {
      props?: { include?: Includes[Key] };
    };
  },
): { [Key in keyof Bag]: SurfaceResult<Bag, Bag[Key]> };
export function defineResourceSurfaces<
  const Bag extends Record<string, SurfaceInput>,
>(
  surfaces: Bag & {
    [Key in keyof Bag]: ValidateHost<Bag, Bag[Key]> &
      ContextualSurface<Bag[Key]>;
  },
): { [Key in keyof Bag]: SurfaceResult<Bag, Bag[Key]> };
export function defineResourceSurfaces(
  surfaces: SurfaceBag,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(surfaces)) {
    if ('createResourceLayout' in entry) {
      result[key] = entry;
      continue;
    }

    const { host, shell, render, ...configuration } = entry;
    const definition = shell
      ? defineResourceLayout.withLayout({
          ...configuration,
          shell,
          layout: {
            props: configuration.props,
            composables: configuration.composables,
            render,
          },
        } as never)
      : createDefinedResourceLayout(
          configuration as never,
        ).defineResourceLayout({
          render,
        } as never);

    if (host) {
      const parent = surfaces[host.surface];

      if (
        !parent ||
        !('resources' in parent) ||
        !Array.isArray(parent.resources)
      ) {
        throw new LayoutConfigurationError(
          `Unknown host surface "${host.surface}".`,
        );
      }

      const available = new Set(
        normalizeResourceDefinitions(parent.resources).map(
          (resource) => resource.value,
        ),
      );
      const selected =
        host.resources === '*' ? available : new Set(host.resources);

      for (const resource of selected) {
        if (!available.has(resource)) {
          throw new LayoutConfigurationError(
            `Unknown host resource "${resource}".`,
          );
        }
      }

      definition.createResourceLayout = bindHostedFactory(
        definition.createResourceLayout,
        selected,
      );
    }

    result[key] = definition;
  }

  return result;
}

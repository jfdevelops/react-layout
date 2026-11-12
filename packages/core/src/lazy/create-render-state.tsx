import type { CustomPropsObject, ResolveCallProps } from '../custom-props';
import { createElement, type ComponentType, type ReactNode } from 'react';
import type { ComposableComponents } from '@jfdevelops/react-layout-composables';
import { LayoutConfigurationError } from '../errors';
import type { ResourceDefinition, ResourcePath } from '../resource';
import type {
  ResolvedIncludedComponentProps,
  InPropsDefinition,
  MergedLayoutInProps,
  LayoutIncludeProps,
  PropsContract,
  RenderDefinition,
  TypedPropsContract,
} from '../props';
import { defineResourceLayout } from '../create-config/define-layout';
import type {
  LayoutComposablesDefinition,
  RenderStateContext,
  RenderStateProps,
  OptionalStateChildren,
} from '../create-config/render-state';

import type { LazyResourceErrorProps, LazyErrorHandlers } from './types';

export type LazyDefaultState = 'Loading' | 'Error';
type BuiltinProps<State extends LazyDefaultState, Resource> = State extends 'Error'
  ? LazyResourceErrorProps<Resource>
  : { resource: Resource };

/** Shorthand includes are direct props; explicit supply sources retain their contract. */
type LazyDefaultIncludes<IncludeProps> = {
  [Key in keyof IncludeProps]: IncludeProps[Key] extends true
    ? { required: true; suppliedVia: 'component' }
    : IncludeProps[Key];
};

type LazyRender<State extends LazyDefaultState, Resource, Props, Context> =
  | ((props: Props & BuiltinProps<State, Resource>, context: Context) => ReactNode)
  | (State extends 'Error' ? LazyErrorHandlers<Resource, Props & object, Context> : never);

/** Creates validated, composable-aware fallback components for one factory. */
export type CreateLazyRenderState<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
> = <
  const State extends LazyDefaultState,
  const CustomProps extends CustomPropsObject = {},
  const IncludeProps extends LayoutIncludeProps<Resources, Options, Composables> = {},
>(definition: {
  state: State;
  props?: TypedPropsContract<IncludeProps, CustomProps>;
  render: LazyRender<
    State,
    ResourcePath<Resources>,
    RenderStateProps<Resources, Options, Composables, IncludeProps, CustomProps>,
    RenderStateContext<Resources, Composables, State>
  >;
}) => ComponentType<
  OptionalStateChildren<
    ResolveCallProps<CustomProps> &
      ResolvedIncludedComponentProps<
        MergedLayoutInProps<Resources, Options, Composables>,
        LazyDefaultIncludes<IncludeProps>
      >,
    CustomProps
  > &
    BuiltinProps<State, ResourcePath<Resources>>
>;

interface RuntimeDefinition extends Omit<
  RenderDefinition<
    PropsContract<Record<string, unknown>, CustomPropsObject>,
    never,
    ((props: any, context: any) => ReactNode) | LazyErrorHandlers<string, object, any>
  >,
  'composables'
> {
  state: LazyDefaultState;
}

export function createLazyRenderStateBuilder<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
>(configuration: {
  resources: Resources;
  options: Options;
  composables?: LayoutComposablesDefinition<Resources, Composables>;
}): CreateLazyRenderState<Resources, Options, Composables> {
  function createRenderState(definition: RuntimeDefinition) {
    if (definition.state !== 'Loading' && definition.state !== 'Error') {
      throw new LayoutConfigurationError(`Unknown lazy default state "${definition.state}"`);
    }
    // Lazy defaults have no create-time configuration call. Included values are
    // supplied by their component caller unless an explicit config source is selected.
    const include = Object.fromEntries(
      Object.entries(definition.props?.include ?? {}).map(([key, behavior]) => [
        key,
        behavior === true
          ? {
              required: true,
              suppliedVia: 'component',
            }
          : behavior,
      ]),
    );
    function RenderLazyDefault({ props, context }: { props: any; context: any }) {
      if (typeof definition.render === 'function') {
        return definition.render(props, context);
      }
      const errorProps = props as LazyResourceErrorProps;
      const handler = definition.render[errorProps.error.code] ?? definition.render.fallback;
      if (!handler) {
        throw errorProps.error;
      }

      return handler(props as never, context);
    }
    const layout = defineResourceLayout({
      resources: configuration.resources,
      options: configuration.options,
      layout: {
        render: {
          default: () => null,
          [definition.state]: {
            composables: configuration.composables,
            props: {
              include,
              custom: definition.props?.custom,
            },
            render: (props: any, context: any) =>
              createElement(RenderLazyDefault, {
                props,
                context,
              }),
          },
        },
      },
    } as never);
    const components = new Map<string, ComponentType<any>>();
    function LazyDefault(props: { resource: string }) {
      // Nested lazy paths use the factory's top-level resource definitions for
      // option resolution. The callback still receives the complete path.
      const resource = props.resource.split('.')[0]!;
      let Component = components.get(resource);
      if (!Component) {
        const Root = layout.createResourceLayout({
          resource,
          name: 'LazyDefault',
          namespace: false,
        } as never) as unknown as Record<LazyDefaultState, ComponentType<any>>;
        Component = Root[definition.state];
        components.set(resource, Component);
      }

      return createElement(Component, props);
    }

    return LazyDefault;
  }

  return createRenderState as CreateLazyRenderState<Resources, Options, Composables>;
}

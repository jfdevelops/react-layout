import type { JSX } from 'react';
import {
  createPrimitivePropBuilder,
  createProp,
  EnumWrappedProp,
  type AnyBuiltPropDefinition,
} from './create-value';
import {
  normalizeResources,
  ResourceEnum,
  toResourceEnum,
  type NormalizeResources,
  type ResourceDefinition,
} from './resource';

type DefinedResourceLayout<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = {
  views: NormalizeResources<Resources>;
};

type InPropsObject = Record<string, AnyBuiltPropDefinition>;
type InPropsFunction<Resources extends ReadonlyArray<ResourceDefinition>> =
  (props: {
    resource: EnumWrappedProp<ResourceEnum<Resources>, 'string', 'required'>;
  }) => InPropsObject;
type InPropsDefinition<Resources extends ReadonlyArray<ResourceDefinition>> =
  | InPropsObject
  | InPropsFunction<Resources>;
type LayoutProps<CustomProps extends InPropsObject = {}> = {
  include?: {}; // map of created props from `options` with a `true` value to include in the layout
  /**
   * Custom props that the layout will receive.
   */
  custom?: CustomProps;
};
type CreateLayoutOptions = {};
type CreateViewMapOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
> = {
  /**
   * An array of valid resource names to support.
   */
  resources: Resources;
  /**
   * The options that are passed into the created resource layout.
   */
  options: Options;
  render: () => JSX.Element;
};

const createResourceLayout = defineResourceLayout({
  resources: [
    {
      value: 'users',
      subResources: ['admins', 'managers'],
    },
    'groups',
    'roles',
  ],
  options: (props) => ({
    resource: props.resource,
    name: createProp.string(),
    title: createProp
      .component({ type: 'ReactNode' })
      .or(
        createProp
          .component({ type: 'JSX.Element' })
          .withChildren({ visibility: 'required' }),
      ),
  }),
  render: () => <div>Hello, world!</div>,
});
createResourceLayout({
  resource: 'groups',
  name: 'GroupsLayout',
  props: {
    segment: createProp.string(),
  },
});

export function defineResourceLayout<
  const Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
>(options: CreateViewMapOptions<Resources, InProps>) {
  const { options: inProps, resources } = options;
  const normalizedResources = normalizeResources(resources);
  const resourceProp = createPrimitivePropBuilder('string').enum(
    toResourceEnum(normalizedResources),
  );
  const resolvedOptions =
    typeof inProps === 'function'
      ? inProps({ resource: resourceProp })
      : inProps;

  return <
    Name extends string,
    Resource extends keyof NormalizeResources<Resources>,
    Props extends InPropsDefinition<Resources> = {},
  >(options: {
    name: Name;
    resource: Resource;
    props?: Props;
  }) => {};
}

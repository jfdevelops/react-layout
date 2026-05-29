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
type InferredInProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
> = Options extends InPropsFunction<Resources> ? ReturnType<Options> : Options;
type IncludedProps<T> = {
  [_ in keyof T]?: true;
};
type LayoutProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  IncludeProps extends IncludedProps<InferredInProps<Resources, Options>> = {},
  CustomProps extends InPropsObject = {},
> = {
  include?: IncludeProps; // map of created props from `options` with a `true` value to include in the layout
  /**
   * Custom props that the layout will receive.
   */
  custom?: CustomProps;
};
type CreateLayoutOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  IncludeProps extends IncludedProps<InferredInProps<Resources, Options>> = {},
  CustomProps extends InPropsObject = {},
> = {
  props?: LayoutProps<Resources, Options, IncludeProps, CustomProps>;
  render: (
    props: CustomProps &
      Pick<InferredInProps<Resources, Options>, keyof IncludeProps & string>,
  ) => JSX.Element;
};
type CreateViewMapOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  IncludeProps extends IncludedProps<InferredInProps<Resources, Options>> = {},
  CustomProps extends InPropsObject = {},
> = {
  /**
   * An array of valid resource names to support.
   */
  resources: Resources;
  /**
   * The options that are passed into the created resource layout.
   */
  options: Options;
  layout: CreateLayoutOptions<Resources, Options, IncludeProps, CustomProps>;
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
  layout: {
    props: {
      include: {
        name: true,
      },
      custom: {
        includeCreateButton: createProp.boolean().literal(true).optional(),
        addNewIcon: createProp.component({ type: 'ReactNode' }).optional(),
        children: createProp.component({ type: 'ReactNode' }),
        className: createProp.string().optional(),
      },
    },
    render: ({}) => <></>,
  },
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
  IncludeProps extends IncludedProps<InferredInProps<Resources, InProps>> = {},
  CustomProps extends InPropsObject = {},
>(
  options: CreateViewMapOptions<Resources, InProps, IncludeProps, CustomProps>,
) {
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

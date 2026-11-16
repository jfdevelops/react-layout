import type { ReactElement, ReactNode } from 'react';
import type {
  PropDefinitions,
  ResolveInputPropsAsDefined,
  ResolvePropsAsDefined,
} from '@jfdevelops/react-layout-validator';
import type { ResourceDefinition } from '../resource';
import type {
  ParameterizedResourcePath,
  PathVariables,
  ResolveParameterizedPathValue,
} from './paths';
import type {
  GetComponentForPathApi,
  PathVariableGuards,
  ResolvedPathValue,
} from './for-paths/get-component-for-path';
import type { KeysOfUnion, ValueOfKeyInUnion } from '../utils';
import type { PropsRenderDefinition } from '../props';
import type {
  PathParamPick,
  SelectedPaths,
  SelectedPathConfig,
} from './for-paths/selection';
import type {
  ForPathsRenderContext,
  RenderedPathComponent,
  ValueOrFunction,
} from './for-paths/builder';
import type {
  CheckedPathParams,
  PathParamInput as Input,
  PathParamOutput as Output,
  PathParamsOptions,
} from './for-paths/params';

type Resolved<
  Resources extends readonly ResourceDefinition[],
  Config,
  Path extends string,
> = Path extends unknown
  ? ResolveParameterizedPathValue<
      Resources,
      Config,
      Path,
      PathVariables<Resources, Config, Path>
    >
  : never;

type ConfiguredPaths<
  Resources extends readonly ResourceDefinition[],
  Config,
  Path = ParameterizedResourcePath<Resources>,
> = Path extends string
  ? [Resolved<Resources, Config, Path>] extends [never]
    ? never
    : Resolved<Resources, Config, Path> extends ReactElement
      ? never
      : Path
  : never;

type RendererNode<Value> = ResolvedPathValue<{
  [Key in KeysOfUnion<Value>]: ValueOfKeyInUnion<Value, Key, undefined>;
}>;

type RendererGetter<
  Resources extends readonly ResourceDefinition[],
  Config,
  Path extends string,
> = GetComponentForPathApi<Resources, Config, Path> &
  PathVariableGuards<Resources, Config, Path> & {
    (): RendererNode<Resolved<Resources, Config, Path>>;
    (
      variables: PathVariables<Resources, Config, Path>,
    ): RendererNode<Resolved<Resources, Config, Path>>;
  };

/** Rendering context for a reusable definition or scoped override. */
export type ResourceRendererContext<
  Resources extends readonly ResourceDefinition[],
  Config,
  Path extends string,
  Options extends PathParamsOptions,
> = Omit<
  ForPathsRenderContext<
    Resources,
    Config,
    readonly [Path],
    Output<Resources, Config, Path, Options>
  >,
  'getComponentForPath'
> & {
  path: SelectedPaths<Resources, Config, Path, Options>;
  getComponentForPath: <
    const Selected extends SelectedPaths<Resources, Config, Path, Options>,
  >(
    path: Selected,
  ) => RendererGetter<Resources, SelectedPathConfig<Config, Options>, Selected>;
};

type Render<
  Resources extends readonly ResourceDefinition[],
  Config,
  Path extends string,
  Options extends PathParamsOptions,
> = (
  context: ResourceRendererContext<Resources, Config, Path, Options>,
) => ReactNode;

/** A configured component; render overrides create a separate component. */
export type ResourceRendererBuilder<
  Resources extends readonly ResourceDefinition[],
  Config,
  Path extends string,
  Options extends PathParamsOptions,
> = RenderedPathComponent<Input<Resources, Config, Path, Options>> & {
  render(
    renderer: Render<Resources, Config, Path, Options>,
  ): ResourceRendererBuilder<Resources, Config, Path, Options>;
};

type FactoryArgs<Params, Props> = {} extends Props
  ? {} extends Params
    ? [params?: Params, props?: Props]
    : [params: Params, props?: Props]
  : [params: Params, props: Props];

type FactoryCall<Params, Props, Return> = {
  (...args: FactoryArgs<Params, Props>): Return;
} & (keyof Params extends 'componentKey'
  ? 'componentKey' extends keyof Params
    ? (
        ...args: FactoryArgs<Params['componentKey' & keyof Params], Props>
      ) => Return
    : {}
  : {});

type Join<Prefix extends string, Path extends string> = Prefix extends ''
  ? Path
  : `${Prefix}.${Path}`;
type Remaining<Paths extends string, Prefix extends string> = Prefix extends ''
  ? Paths
  : Paths extends `${Prefix}.${infer Rest}`
    ? Rest
    : never;
type Prefixes<Path extends string> = Path extends `${infer Head}.${infer Rest}`
  ? Head | `${Head}.${Prefixes<Rest>}`
  : Path;

type Selection<
  Resources extends readonly ResourceDefinition[],
  Config,
  Options extends PathParamsOptions,
  Props extends PropDefinitions,
  Return,
  HasFactory extends boolean,
  Path extends string,
> = HasFactory extends true
  ? FactoryCall<
      Input<Resources, Config, Path, Options>,
      ResolveInputPropsAsDefined<Props>,
      Return
    >
  : ResourceRendererBuilder<Resources, Config, Path, Options>;

/** Callable path selector. Use `forPath` to explicitly keep a page/parent scoped. */
export interface ResourceRenderer<
  Resources extends readonly ResourceDefinition[],
  Config,
  Options extends PathParamsOptions,
  Props extends PropDefinitions = {},
  Return = ResourceRendererBuilder<Resources, Config, string, Options>,
  HasFactory extends boolean = false,
  Prefix extends string = '',
  Allowed extends string = ConfiguredPaths<Resources, Config>,
> {
  <const Path extends Prefixes<Remaining<Allowed, Prefix>>>(
    path: Path,
  ): Join<Prefix, Path> extends Allowed
    ? Selection<
        Resources,
        Config,
        Options,
        Props,
        Return,
        HasFactory,
        Join<Prefix, Path>
      >
    : ResourceRenderer<
        Resources,
        Config,
        Options,
        Props,
        Return,
        HasFactory,
        Join<Prefix, Path>,
        Allowed
      >;
  /**
   * Selects a scope without evaluating its factory, even when that path is a page.
   */
  forPath<const Path extends Prefixes<Remaining<Allowed, Prefix>>>(
    path: Path,
  ): ResourceRenderer<
    Resources,
    Config,
    Options,
    Props,
    Return,
    HasFactory,
    Join<Prefix, Path>,
    Allowed
  >;
  /**
   * Creates an independent rendering override before factory evaluation.
   */
  render(
    renderer: Render<
      Resources,
      Config,
      Prefix extends ''
        ? Allowed
        : Extract<Allowed, Prefix | `${Prefix}.${string}`>,
      Options
    >,
  ): ResourceRenderer<
    Resources,
    Config,
    Options,
    Props,
    Return,
    HasFactory,
    Prefix,
    Allowed
  >;
  /**
   * Resolves the current scope explicitly, including a parent without its own component.
   */
  build(): Selection<
    Resources,
    Config,
    Options,
    Props,
    Return,
    HasFactory,
    Prefix
  >;
}

/** Shared definition for public inference and runtime renderer configuration. */
export type RendererDefinition<Context, Params = PathParamsOptions> = {
  params?: Params;
  render: (context: Context) => ReactNode;
  displayName?: ValueOrFunction<string, Context>;
};

/** Factory definitions follow the same props/render contract as resource components. */
type RendererFactory<
  Resources extends readonly ResourceDefinition[],
  Config,
  Path extends string,
  Options extends PathParamsOptions,
  Props extends PropDefinitions,
  Return,
> = PropsRenderDefinition<
  Props,
  ResolvePropsAsDefined<Props>,
  Return,
  {
    context: Output<Resources, Config, Path, Options> & {
      Component: ResourceRendererBuilder<Resources, Config, Path, Options>;
    };
  }
>;

/** Object-based reusable renderer definition on a resource config. */
export interface CreateResourceRenderer<
  in out Resources extends readonly ResourceDefinition[],
  in out Config,
> {
  <
    const Options extends PathParamsOptions = {},
    const Props extends PropDefinitions = {},
    RenderPath extends string = ConfiguredPaths<Resources, Config>,
    Return = ResourceRendererBuilder<Resources, Config, RenderPath, Options>,
    Definition extends object = {},
  >(
    options: Definition &
      RendererDefinition<
        ResourceRendererContext<Resources, Config, RenderPath, Options>,
        CheckedPathParams<Options, PathParamPick<Resources, Config, RenderPath>>
      > & {
        factory?: RendererFactory<
          Resources,
          Config,
          RenderPath,
          Options,
          Props,
          Return
        >;
      },
  ): ResourceRenderer<
    Resources,
    Config,
    Options,
    Props,
    Return,
    'factory' extends keyof Definition
      ? Definition['factory'] extends undefined
        ? false
        : undefined extends Definition['factory']
          ? boolean
          : true
      : false,
    '',
    SelectedPaths<Resources, Config, RenderPath, Options>
  >;
}

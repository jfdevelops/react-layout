import type { ReactElement, ReactNode } from 'react';
import type {
  CapitalizeFn,
  CapitalizeJoinContext,
  createString,
  CheckedPath,
  StringSelection,
  StringSelectionResult,
} from '@jfdevelops/react-layout-internals';
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
  getComponentForPath: <const Selected extends string>(
    path: CheckedPath<
      SelectedPaths<Resources, Config, Path, Options>,
      Selected
    >,
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
} & RendererChildren<
    Resources,
    Config,
    Options,
    {},
    unknown,
    false,
    Path,
    SelectedPaths<
      Resources,
      Config,
      ConfiguredPaths<Resources, Config>,
      Options
    >
  >;

type FactoryKey<Params> = 'componentKey' extends keyof Params
  ? StringSelection<Extract<Params['componentKey'], string>>
  : never;

type FactoryResult<Params, Selected, Return> = [Selected] extends [never]
  ? Return
  : StringSelectionResult<
      {
        [Key in Extract<Params['componentKey' & keyof Params], string>]: Return;
      },
      Selected
    >;

type FactoryOptions<Params, Props, Selected> =
  ('componentKey' extends keyof Params
    ? {} extends Pick<Params, 'componentKey' & keyof Params>
      ? { component?: Selected }
      : { component: Selected }
    : { component?: never }) &
    (keyof Omit<Params, 'componentKey'> extends never
      ? { params?: never }
      : {} extends Omit<Params, 'componentKey'>
        ? { params?: Omit<Params, 'componentKey'> }
        : { params: Omit<Params, 'componentKey'> }) &
    ({} extends Props ? { props?: Props } : { props: Props });

type FactoryCall<Params, Props, Return> = {} extends Params & Props
  ? <const Selected extends FactoryKey<Params> = never>(
      options?: FactoryOptions<Params, Props, Selected>,
    ) => FactoryResult<Params, Selected, Return>
  : <const Selected extends FactoryKey<Params> = never>(
      options: FactoryOptions<Params, Props, Selected>,
    ) => FactoryResult<Params, Selected, Return>;

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

type RendererChildren<
  Resources extends readonly ResourceDefinition[],
  Config,
  Options extends PathParamsOptions,
  Props extends PropDefinitions,
  Return,
  HasFactory extends boolean,
  Prefix extends string,
  Allowed extends string,
> = [Remaining<Allowed, Prefix>] extends [never]
  ? {}
  : {
      /**
       * Selects a descendant relative to this path, preserving its renderer and factory.
       * Available only when the selected path has configured descendants.
       *
       * @example
       * ```ts
       * const renderUsers = renderPage('users');
       * const renderDetail = renderUsers.forResource('detail');
       * ```
       */
      forResource<const Path extends string>(
        path: CheckedPath<Prefixes<Remaining<Allowed, Prefix>>, Path>,
      ): [Extract<Join<Prefix, Path>, Allowed>] extends [never]
        ? ResourceRenderer<
            Resources,
            Config,
            Options,
            Props,
            Return,
            HasFactory,
            Join<Prefix, Path>,
            Allowed
          >
        : Selection<
            Resources,
            Config,
            Options,
            Props,
            Return,
            HasFactory,
            Extract<Join<Prefix, Path>, Allowed>,
            Allowed
          >;
    };

type Selection<
  Resources extends readonly ResourceDefinition[],
  Config,
  Options extends PathParamsOptions,
  Props extends PropDefinitions,
  Return,
  HasFactory extends boolean,
  Path extends string,
  Allowed extends string,
> = HasFactory extends true
  ? FactoryCall<
      Input<Resources, Config, Path, Options>,
      ResolveInputPropsAsDefined<Props>,
      Return
    > &
      RendererChildren<
        Resources,
        Config,
        Options,
        Props,
        Return,
        HasFactory,
        Path,
        Allowed
      >
  : ResourceRendererBuilder<Resources, Config, Path, Options>;

/** Callable path selector. Use `forPath` to explicitly keep a page/parent scoped. */
export type ResourceRenderer<
  Resources extends readonly ResourceDefinition[],
  Config,
  Options extends PathParamsOptions,
  Props extends PropDefinitions = {},
  Return = ResourceRendererBuilder<Resources, Config, string, Options>,
  HasFactory extends boolean = false,
  Prefix extends string = '',
  Allowed extends string = ConfiguredPaths<Resources, Config>,
> = ResourceRendererSelector<
  Resources,
  Config,
  Options,
  Props,
  Return,
  HasFactory,
  Prefix,
  Allowed
> &
  RendererChildren<
    Resources,
    Config,
    Options,
    Props,
    Return,
    HasFactory,
    Prefix,
    Allowed
  >;

interface ResourceRendererSelector<
  Resources extends readonly ResourceDefinition[],
  Config,
  Options extends PathParamsOptions,
  Props extends PropDefinitions = {},
  Return = ResourceRendererBuilder<Resources, Config, string, Options>,
  HasFactory extends boolean = false,
  Prefix extends string = '',
  Allowed extends string = ConfiguredPaths<Resources, Config>,
> {
  <const Path extends string>(
    path: CheckedPath<Prefixes<Remaining<Allowed, Prefix>>, Path>,
  ): Join<Prefix, Path> extends Allowed
    ? Selection<
        Resources,
        Config,
        Options,
        Props,
        Return,
        HasFactory,
        Join<Prefix, Path>,
        Allowed
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
  forPath<const Path extends string>(
    path: CheckedPath<Prefixes<Remaining<Allowed, Prefix>>, Path>,
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
    Prefix,
    Allowed
  >;
}

type PathSegments<Path extends string> =
  Path extends `${infer Head}.${infer Tail}` ? Head | PathSegments<Tail> : Path;

type DisplayNameSegments<Path extends string> = Path extends unknown
  ? {
      readonly [
        Segment in PathSegments<Path>
      ]: RendererDisplayNamePath<Segment>;
    }
  : never;

/** A display-name path with guards for exact paths and their descendants. */
export interface RendererDisplayNamePath<
  Path extends string,
  Allowed extends string = Path,
> {
  readonly value: Path;
  /** Individual path segments, each exposing the display-name path helpers. */
  readonly segments: DisplayNameSegments<Path>;
  /** Concatenates parts and preserves their literal types without `as const`. */
  create: typeof createString;
  /**
   * Matches an exact path or any descendant separated by a dot, narrowing
   * `path.value` to the matching paths. Suggestions follow the current segment.
   * For example, `author` matches `author.address.city`, but not `authorId`.
   *
   * @example
   * ```ts
   * if (path.is('author.address')) {
   *   // path.value is 'author.address' | 'author.address.city'.
   *   return path.capitalize();
   * }
   * ```
   */
  is<const Prefix extends string>(
    prefix: CheckedPath<Prefixes<Path>, Prefix>,
  ): this is RendererDisplayNamePath<
    Extract<Path, Prefix | `${Prefix}.${string}`>,
    Allowed
  >;
  capitalize: CapitalizeFn<
    Prefixes<Allowed>,
    CapitalizeJoinContext<this['segments']>
  >;
  toString(): Path;
}

type RendererDisplayNameContext<Context> = Context extends {
  path: infer Path extends string;
}
  ? Omit<Context, 'path'> & {
      path: RendererDisplayNamePath<Path>;
      capitalize: CapitalizeFn;
    }
  : Context;

type DisplayNameMapping<Context> = Context extends {
  path: infer Path extends string;
}
  ? {
      [Prefix in StringSelection<Prefixes<Path>>]?: ValueOrFunction<
        string,
        RendererDisplayNameContext<
          Omit<Context, 'path'> & {
            path: Prefix extends '*'
              ? Path
              : Extract<Path, Prefix | `${Prefix}.${string}`>;
          }
        >
      >;
    }
  : never;

/** Shared definition for public inference and runtime renderer configuration. */
export type RendererDefinition<Context, Params = PathParamsOptions> = {
  params?: Params;
  render: (context: Context) => ReactNode;
  displayName?:
    | ValueOrFunction<string, RendererDisplayNameContext<Context>>
    | DisplayNameMapping<Context>;
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
      (Definition extends { displayName: infer Names extends object }
        ? Names extends (...args: never[]) => unknown
          ? unknown
          : {
              displayName: Record<
                Exclude<
                  keyof Names,
                  | Prefixes<
                      SelectedPaths<Resources, Config, RenderPath, Options>
                    >
                  | '*'
                >,
                never
              >;
            }
        : unknown) &
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

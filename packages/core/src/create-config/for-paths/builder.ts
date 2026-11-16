import type { JSX, ReactNode } from 'react';
import type { WithChildren } from '@jfdevelops/react-layout-composables';
import { InvalidPathError } from '../../errors';
import type { ResourceDefinition } from '../../resource';
import type { IsUnion, Show } from '../../utils';
import { createPathParams, validatePathParamsOptions } from './params';
import type {
  CheckedPathParams,
  IncludedPathParams,
  PathParamInput,
  PathParamOutput,
  PickedPathParams,
  PathParamsOptions,
} from './params';
import { generateResourceConfigPaths } from '../paths';
import type { PathParamPick, SelectedPathConfig } from './selection';
import type { PathVariables } from '../paths';
import {
  createScopedGetComponentForPath,
  type CreateGetComponentForPath,
} from './get-component-for-path';

type PathVariablesForPaths<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Paths extends ReadonlyArray<string>,
> = Paths[number] extends infer Path
  ? Path extends string
    ? PathVariables<Resources, Config, Path>
    : never
  : never;

export type ValueOrFunction<Value, Input> = Value | ((input: Input) => Value);

/** Context handed to `render` and to `setDisplayName`. */
export type ForPathsRenderContext<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Paths extends ReadonlyArray<string>,
  Params,
> = {
  children?: ReactNode;
  /**
   * Declared params merged with the props the component was called with.
   */
  params: Params;
  /**
   * Creates a getter for any of the paths this component was built for.
   */
  getComponentForPath: CreateGetComponentForPath<
    Resources,
    Config,
    Paths[number]
  >;
};

type HOFArgSelection<Params> = {
  [Key in keyof Params]?: true;
};

/**
 * Value closed over by `asHOF`. Selecting a single arg closes over that value directly;
 * selecting several closes over an object.
 */
type HOFClosureValue<Params, Args> = [keyof Args] extends [never]
  ? {}
  : IsUnion<keyof Args> extends false
    ? Params[keyof Args & keyof Params]
    : Show<Pick<Params, keyof Args & keyof Params>>;

export interface RenderedPathComponentHOF<Params, Args> {
  (
    closure: HOFClosureValue<Params, Args>,
  ): RenderedPathComponent<Show<Omit<Params, keyof Args>>>;
  /**
   * Type-only view of the value this HOF closes over. At runtime this is `undefined`.
   */
  _args: HOFClosureValue<Params, Args>;
}

export interface RenderedPathComponent<
  Params,
  DisplayName extends string = string,
> {
  (props: WithChildren<Params>): JSX.Element;
  displayName: DisplayName;
  /**
   * Type-only view of the props this component accepts.
   */
  _args: Params;
  /**
   * Splits the props into a closure and the remaining props, so shared params can be
   * bound once and the component reused. Chained `asHOF` calls keep prior closures.
   */
  asHOF<Args extends HOFArgSelection<Params> = {}>(options?: {
    /**
     * Params to close over. Anything omitted stays a prop.
     */
    args: Args;
  }): RenderedPathComponentHOF<Params, Args>;
}

type WithComponentKeyParam<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Paths extends ReadonlyArray<string>,
  Optional extends boolean,
> = IncludedPathParams<
  Resources,
  Config,
  Paths[number],
  { include: { keys: { optional: Optional } } }
>;

export type TargetPathBuilder<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Paths extends ReadonlyArray<string>,
  Params extends Record<string, unknown> = {},
  Used extends 'addComponentKeyParams' | 'addPathParams' | 'addParams' = never,
  Output extends Record<string, unknown> = Params,
> = {
  render: (
    renderer: (
      context: ForPathsRenderContext<Resources, Config, Paths, Output>,
    ) => JSX.Element,
  ) => RenderedPathComponent<Params> & {
    /**
     * Names the component, either statically or from the render context.
     */
    setDisplayName<Name extends string>(
      name: ValueOrFunction<
        Name,
        ForPathsRenderContext<Resources, Config, Paths, Output>
      >,
    ): RenderedPathComponent<Params, Name>;
  };
} & ('addComponentKeyParams' extends Used
  ? {}
  : {
      /**
       * @deprecated Use `.addParams({ include: { keys: true } })`.
       * Adds a `componentKey` prop narrowed to the component slots configured for these
       * paths. Call it before `render` when building a reusable component.
       */
      addComponentKeyParams<Optional extends boolean = false>(options?: {
        /**
         * Whether the caller may omit `componentKey`.
         */
        optional?: Optional;
      }): TargetPathBuilder<
        Resources,
        Config,
        Paths,
        Show<
          Params & WithComponentKeyParam<Resources, Config, Paths, Optional>
        >,
        Used | 'addComponentKeyParams',
        Show<Output & WithComponentKeyParam<Resources, Config, Paths, Optional>>
      >;
    }) &
  ('addPathParams' extends Used
    ? {}
    : {
        /**
         * @deprecated Use `.addParams({ include: { path: true } })`.
         * Turns the variables these paths leave open into props. Without `pick`, every
         * variable becomes a prop.
         */
        addPathParams<
          Variables extends PathVariablesForPaths<Resources, Config, Paths>,
          Picked extends { [Key in keyof Variables]?: true } = {},
        >(options?: {
          /**
           * Variables to expose as props. Defaults to all of them.
           */
          pick?: Picked;
        }): TargetPathBuilder<
          Resources,
          Config,
          Paths,
          Show<Params & PickedPathParams<Variables, Picked>>,
          Used | 'addPathParams',
          Show<Output & PickedPathParams<Variables, Picked>>
        >;
      }) &
  ('addParams' extends Used
    ? {}
    : {
        /**
         * Adds included path variables, component keys, and custom Standard Schema parameters.
         */
        addParams<
          const Options extends PathParamsOptions<
            PathParamPick<Resources, Config, Paths[number]>
          >,
        >(
          options: CheckedPathParams<
            Options,
            PathParamPick<Resources, Config, Paths[number]>
          >,
        ): TargetPathBuilder<
          Resources,
          SelectedPathConfig<Config, Options>,
          Paths,
          Show<
            Params & PathParamInput<Resources, Config, Paths[number], Options>
          >,
          Used | 'addParams',
          Show<
            Output & PathParamOutput<Resources, Config, Paths[number], Options>
          >
        >;
        /**
         * @deprecated Pass schema definitions through `{ custom }` instead.
         * Retains legacy default-value parameters for compatibility.
         */
        addParams<NewParams extends Record<string, unknown>>(
          params: NewParams & { include?: never; custom?: never },
        ): TargetPathBuilder<
          Resources,
          Config,
          Paths,
          Show<Params & Partial<NewParams>>,
          Used | 'addParams'
        >;
      });

export type ForPaths<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  AllowedPath extends string,
> = <const Paths extends readonly [AllowedPath, ...AllowedPath[]]>(
  ...paths: Paths
) => TargetPathBuilder<Resources, Config, Paths>;

const DEFAULT_DISPLAY_NAME = 'ResourcePathComponent';

type BuilderState = {
  paramDefaults: Record<string, unknown>;
  usedComponentKeyParams: boolean;
  usedPathParams: boolean;
  usedParams: boolean;
  customParams: PathParamsOptions;
};

function readClosureProps(
  selected: string[],
  closure: unknown,
): Record<string, unknown> {
  if (selected.length === 0) {
    return {};
  }

  const [only] = selected;

  if (selected.length === 1 && only !== undefined) {
    return {
      [only]: closure,
    };
  }

  if (
    typeof closure === 'object' &&
    closure !== null &&
    !Array.isArray(closure)
  ) {
    return {
      ...(closure as Record<string, unknown>),
    };
  }

  return {};
}

function createRenderedComponent(
  runRenderer: (props: Record<string, unknown>) => JSX.Element,
  paramTemplate: Record<string, unknown> | undefined,
  resolveDisplayName?: (props: Record<string, unknown>) => string,
  boundProps: Record<string, unknown> = {},
) {
  function RenderedPathView(props: Record<string, unknown>): JSX.Element {
    const merged = {
      ...boundProps,
      ...props,
    };

    if (resolveDisplayName) {
      RenderedPathView.displayName = resolveDisplayName(merged);
    }

    return runRenderer(merged);
  }

  RenderedPathView.displayName = DEFAULT_DISPLAY_NAME;

  function asHOF(options?: { args?: Record<string, true> }) {
    const selected = Object.entries(options?.args ?? {})
      .filter(([, enabled]) => enabled === true)
      .map(([key]) => key);

    function hof(closure: unknown) {
      const bound = createRenderedComponent(
        runRenderer,
        undefined,
        resolveDisplayName,
        {
          ...boundProps,
          ...readClosureProps(selected, closure),
        },
      );

      bound.displayName = RenderedPathView.displayName;

      return bound;
    }

    return Object.assign(hof, {
      _args: undefined as never,
    });
  }

  return Object.assign(RenderedPathView, {
    _args: paramTemplate as never,
    asHOF,
  });
}

export function createTargetPathBuilder<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config extends Record<string, unknown>,
  Paths extends ReadonlyArray<string>,
>(config: Config, paths: Paths): TargetPathBuilder<Resources, Config, Paths> {
  type RenderContext = ForPathsRenderContext<
    Resources,
    Record<string, unknown>,
    Paths,
    Record<string, unknown>
  >;

  const makeBuilder = (state: BuilderState): Record<string, unknown> => {
    const builder: Record<string, unknown> = {};

    function addParams(
      options: PathParamsOptions,
      used: Partial<BuilderState> = {},
    ) {
      const customParams = {
        include: {
          ...state.customParams.include,
          ...options.include,
        },
        custom: {
          ...state.customParams.custom,
          ...options.custom,
        },
      };
      validatePathParamsOptions(customParams);

      return makeBuilder({
        ...state,
        ...used,
        customParams,
      });
    }

    if (!state.usedComponentKeyParams) {
      builder.addComponentKeyParams = (options?: { optional?: boolean }) =>
        addParams(
          {
            include: {
              keys: options ?? true,
            },
          },
          {
            usedComponentKeyParams: true,
          },
        );
    }

    if (!state.usedPathParams) {
      builder.addPathParams = (options?: { pick?: Record<string, true> }) =>
        addParams(
          {
            include: {
              path: options ?? true,
            },
          },
          {
            usedPathParams: true,
          },
        );
    }

    if (!state.usedParams) {
      builder.addParams = (params: Record<string, unknown>) => {
        if (
          'include' in params ||
          'custom' in params ||
          Object.keys(params).length === 0
        ) {
          return addParams(params as PathParamsOptions, {
            usedParams: true,
          });
        }

        return makeBuilder({
          ...state,
          usedParams: true,
          paramDefaults: {
            ...state.paramDefaults,
            ...params,
          },
        });
      };
    }

    builder.render = (renderer: (context: RenderContext) => JSX.Element) => {
      const pathParams = createPathParams(
        config,
        paths,
        state.customParams,
        state.paramDefaults,
      );

      const buildContext = (props: Record<string, unknown>) => {
        const params = pathParams.resolve(props);

        return {
          children: props.children as ReactNode,
          params,
          getComponentForPath: createScopedGetComponentForPath<
            Resources,
            Record<string, unknown>,
            Paths
          >(pathParams.config, paths),
        };
      };

      const runRenderer = (props: Record<string, unknown>) =>
        renderer(buildContext(props));

      const component = createRenderedComponent(runRenderer, {
        ...state.paramDefaults,
      });

      return Object.assign(component, {
        setDisplayName: (name: ValueOrFunction<string, RenderContext>) => {
          if (typeof name === 'string') {
            const named = createRenderedComponent(runRenderer, {
              ...state.paramDefaults,
            });

            named.displayName = name;

            return named;
          }

          return createRenderedComponent(
            runRenderer,
            {
              ...state.paramDefaults,
            },
            (props) => name(buildContext(props)),
          );
        },
      });
    };

    return builder;
  };

  return makeBuilder({
    paramDefaults: {},
    usedComponentKeyParams: false,
    usedPathParams: false,
    usedParams: false,
    customParams: {},
  }) as unknown as TargetPathBuilder<Resources, Config, Paths>;
}

export function createForPaths<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config extends Record<string, unknown>,
>(config: Config): ForPaths<Resources, Config, string> {
  const validPaths = generateResourceConfigPaths(config);

  return ((...paths: string[]) => {
    if (paths.length === 0) {
      throw new InvalidPathError({
        path: paths,
        validPaths,
        reason: 'At least one path is required',
      });
    }

    for (const path of paths) {
      if (!validPaths.includes(path)) {
        throw new InvalidPathError({
          path,
          validPaths,
        });
      }
    }

    return createTargetPathBuilder(config, paths);
  }) as unknown as ForPaths<Resources, Config, string>;
}

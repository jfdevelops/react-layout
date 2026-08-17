import type { JSX } from 'react';
import {
  InvalidComponentError,
  InvalidPathError,
  InvalidResourceError,
  InvalidSubResourceError,
} from '../../errors';
import type { ResourceDefinition } from '../../resource';
import type { IsUnion, Show } from '../../utils';
import {
  collectPathComponentKeys,
  collectPathResources,
  collectPathSubResourceKeys,
  extractPathVariables,
  flattenSubResourceParam,
  generateResourceConfigPaths,
} from '../paths';
import type {
  PathComponentKeys,
  PathVariables,
  SubResourceParamValue,
} from '../paths';
import {
  createGetComponentForPath,
  type CreateGetComponentForPath,
} from './get-component-for-path';

type UnwrapTargetPaths<Paths> = Paths extends readonly [
  infer First,
  ...infer Rest,
]
  ? (First & string) | UnwrapTargetPaths<Rest>
  : Paths extends readonly (infer Path)[]
    ? Path & string
    : never;

type PathVariablesForPaths<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Paths extends ReadonlyArray<string>,
> =
  UnwrapTargetPaths<Paths> extends infer Path
    ? Path extends string
      ? PathVariables<Resources, Config, Path>
      : never
    : never;

type ComponentKeysForPaths<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Paths extends ReadonlyArray<string>,
> =
  UnwrapTargetPaths<Paths> extends infer Path
    ? Path extends string
      ? PathComponentKeys<Resources, Config, Path>
      : never
    : never;

type ValueOrFunction<Value, Input> = Value | ((input: Input) => Value);

/** Context handed to `render` and to `setDisplayName`. */
export type ForPathsRenderContext<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Paths extends ReadonlyArray<string>,
  Params,
> = {
  /** Declared params merged with the props the component was called with. */
  params: Params;
  /** Creates a getter for any of the paths this component was built for. */
  getComponentForPath: CreateGetComponentForPath<
    Resources,
    Config,
    UnwrapTargetPaths<Paths>
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
  (closure: HOFClosureValue<Params, Args>): RenderedPathComponent<
    Show<Omit<Params, keyof Args>>
  >;
  /** Type-only view of the value this HOF closes over. At runtime this is `undefined`. */
  _args: HOFClosureValue<Params, Args>;
}

export interface RenderedPathComponent<
  Params,
  DisplayName extends string = string,
> {
  (props: Params): JSX.Element;
  displayName: DisplayName;
  /** Type-only view of the props this component accepts. */
  _args: Params;
  /**
   * Splits the props into a closure and the remaining props, so shared params can be
   * bound once and the component reused.
   */
  asHOF<Args extends HOFArgSelection<Params> = {}>(options?: {
    /** Params to close over. Anything omitted stays a prop. */
    args: Args;
  }): RenderedPathComponentHOF<Params, Args>;
}

type WithComponentKeyParam<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Paths extends ReadonlyArray<string>,
  Optional extends boolean,
> = Optional extends true
  ? { componentKey?: ComponentKeysForPaths<Resources, Config, Paths> }
  : { componentKey: ComponentKeysForPaths<Resources, Config, Paths> };

type PickedPathParams<
  Variables,
  Picked,
> = [keyof Picked] extends [never]
  ? Variables
  : Pick<Variables, keyof Picked & keyof Variables>;

export type TargetPathBuilder<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Paths extends ReadonlyArray<string>,
  Params extends Record<string, unknown> = {},
  Used extends
    | 'addComponentKeyParams'
    | 'addPathParams'
    | 'addParams' = never,
> = {
  render: (
    renderer: (
      context: ForPathsRenderContext<Resources, Config, Paths, Params>,
    ) => JSX.Element,
  ) => RenderedPathComponent<Params> & {
    /** Names the component, either statically or from the render context. */
    setDisplayName<Name extends string>(
      name: ValueOrFunction<
        Name,
        ForPathsRenderContext<Resources, Config, Paths, Params>
      >,
    ): RenderedPathComponent<Params, Name>;
  };
} & ('addComponentKeyParams' extends Used
  ? {}
  : {
      /**
       * Adds a `componentKey` prop narrowed to the component slots configured for these
       * paths. Call it before `render` when building a reusable component.
       */
      addComponentKeyParams<Optional extends boolean = false>(options?: {
        /** Whether the caller may omit `componentKey`. */
        optional?: Optional;
      }): TargetPathBuilder<
        Resources,
        Config,
        Paths,
        Show<
          Params & WithComponentKeyParam<Resources, Config, Paths, Optional>
        >,
        Used | 'addComponentKeyParams'
      >;
    }) &
  ('addPathParams' extends Used
    ? {}
    : {
        /**
         * Turns the variables these paths leave open into props. Without `pick`, every
         * variable becomes a prop.
         */
        addPathParams<
          Variables extends PathVariablesForPaths<Resources, Config, Paths>,
          Picked extends { [Key in keyof Variables]?: true } = {},
        >(options?: {
          /** Variables to expose as props. Defaults to all of them. */
          pick?: Picked;
        }): TargetPathBuilder<
          Resources,
          Config,
          Paths,
          Show<Params & PickedPathParams<Variables, Picked>>,
          Used | 'addPathParams'
        >;
      }) &
  ('addParams' extends Used
    ? {}
    : {
        /**
         * Adds custom params with the given values as defaults. Defaults are
         * optional at the call site and filled in before `render` runs.
         */
        addParams<NewParams extends Record<string, unknown>>(
          params: NewParams,
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
  paths: readonly string[];
  paramDefaults: Record<string, unknown>;
  declaredPathParams: readonly string[];
  componentKeyDeclared: boolean;
  componentKeyOptional: boolean;
  usedComponentKeyParams: boolean;
  usedPathParams: boolean;
  usedParams: boolean;
};

type ValidationSets = {
  resources: readonly string[];
  subResources: readonly string[];
  components: readonly string[];
};

function collectValidationSets(
  config: Record<string, unknown>,
  paths: readonly string[],
): ValidationSets {
  const resources = new Set<string>();
  const subResources = new Set<string>();
  const components = new Set<string>();

  for (const path of paths) {
    for (const resource of collectPathResources(config, path)) {
      resources.add(resource);
    }

    for (const subResource of collectPathSubResourceKeys(config, path)) {
      subResources.add(subResource);
    }

    for (const component of collectPathComponentKeys(config, path)) {
      components.add(component);
    }
  }

  return {
    resources: [...resources],
    subResources: [...subResources],
    components: [...components],
  };
}

/**
 * Validates the params a caller passed before the renderer runs, so a bad resource or
 * slot fails with a typed error naming what is available.
 */
function validateParams(
  params: Record<string, unknown>,
  state: BuilderState,
  sets: ValidationSets,
): void {
  const { resource, subResource, component, componentKey } = params as {
    resource?: unknown;
    subResource?: unknown;
    component?: unknown;
    componentKey?: unknown;
  };

  if (state.declaredPathParams.includes('resource') && resource !== undefined) {
    if (typeof resource !== 'string' || !sets.resources.includes(resource)) {
      throw new InvalidResourceError({
        resource,
        validResources: sets.resources,
      });
    }
  }

  if (
    state.declaredPathParams.includes('subResource') &&
    subResource !== undefined
  ) {
    const slugs = flattenSubResourceParam(subResource as SubResourceParamValue);

    for (const slug of slugs) {
      if (!sets.subResources.includes(slug)) {
        throw new InvalidSubResourceError({
          subResource: slug,
          resource: typeof resource === 'string' ? resource : undefined,
          validSubResources: sets.subResources,
        });
      }
    }
  }

  if (
    state.declaredPathParams.includes('component') &&
    component !== undefined
  ) {
    if (typeof component !== 'string' || !sets.components.includes(component)) {
      throw new InvalidComponentError({
        component,
        validComponents: sets.components,
      });
    }
  }

  if (!state.componentKeyDeclared) {
    return;
  }

  if (componentKey === undefined) {
    if (!state.componentKeyOptional) {
      throw new InvalidComponentError({
        component: componentKey,
        validComponents: sets.components,
        reason: 'A "componentKey" prop is required for this component',
      });
    }

    return;
  }

  if (
    typeof componentKey !== 'string' ||
    !sets.components.includes(componentKey)
  ) {
    throw new InvalidComponentError({
      component: componentKey,
      validComponents: sets.components,
    });
  }
}

function createRenderedComponent(
  runRenderer: (props: Record<string, unknown>) => JSX.Element,
  paramTemplate: Record<string, unknown>,
  resolveDisplayName?: (props: Record<string, unknown>) => string,
) {
  function RenderedPathView(props: Record<string, unknown>): JSX.Element {
    if (resolveDisplayName) {
      RenderedPathView.displayName = resolveDisplayName(props);
    }

    return runRenderer(props);
  }

  RenderedPathView.displayName = DEFAULT_DISPLAY_NAME;

  function asHOF(options?: { args?: Record<string, true> }) {
    const selected = Object.entries(options?.args ?? {})
      .filter(([, enabled]) => enabled === true)
      .map(([key]) => key);

    function hof(closure: unknown) {
      const closureProps: Record<string, unknown> = (() => {
        if (selected.length === 0) {
          return {};
        }

        const [only] = selected;

        if (selected.length === 1 && only !== undefined) {
          return { [only]: closure };
        }

        return typeof closure === 'object' &&
          closure !== null &&
          !Array.isArray(closure)
          ? { ...(closure as Record<string, unknown>) }
          : {};
      })();

      function BoundPathView(props: Record<string, unknown>): JSX.Element {
        const merged = { ...closureProps, ...props };

        if (resolveDisplayName) {
          BoundPathView.displayName = resolveDisplayName(merged);
        }

        return runRenderer(merged);
      }

      BoundPathView.displayName = RenderedPathView.displayName;

      return Object.assign(BoundPathView, {
        _args: undefined as never,
        asHOF,
      });
    }

    return Object.assign(hof, { _args: undefined as never });
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
  const validationSets = collectValidationSets(config, paths);

  const makeBuilder = (state: BuilderState): Record<string, unknown> => {
    const builder: Record<string, unknown> = {};

    if (!state.usedComponentKeyParams) {
      builder.addComponentKeyParams = (options?: { optional?: boolean }) =>
        makeBuilder({
          ...state,
          usedComponentKeyParams: true,
          componentKeyDeclared: true,
          componentKeyOptional: options?.optional === true,
        });
    }

    if (!state.usedPathParams) {
      builder.addPathParams = (options?: { pick?: Record<string, true> }) => {
        const available = new Set<string>();

        for (const path of state.paths) {
          for (const name of extractPathVariables(path)) {
            available.add(name);
          }
        }

        const picked = Object.entries(options?.pick ?? {})
          .filter(([, enabled]) => enabled === true)
          .map(([key]) => key);
        const declared =
          picked.length === 0
            ? [...available]
            : picked.filter((name) => available.has(name));

        return makeBuilder({
          ...state,
          usedPathParams: true,
          declaredPathParams: [...state.declaredPathParams, ...declared],
        });
      };
    }

    if (!state.usedParams) {
      builder.addParams = (params: Record<string, unknown>) =>
        makeBuilder({
          ...state,
          usedParams: true,
          paramDefaults: { ...state.paramDefaults, ...params },
        });
    }

    builder.render = (
      renderer: (context: {
        params: Record<string, unknown>;
        getComponentForPath: unknown;
      }) => JSX.Element,
    ) => {
      const buildContext = (props: Record<string, unknown>) => {
        const params = { ...state.paramDefaults, ...props };

        validateParams(params, state, validationSets);

        return {
          params,
          getComponentForPath: (path: string) => {
            if (!state.paths.includes(path)) {
              throw new InvalidPathError({
                path,
                validPaths: state.paths,
                reason: 'This component was not built for that path',
              });
            }

            return createGetComponentForPath(config, path);
          },
        };
      };

      const runRenderer = (props: Record<string, unknown>) =>
        renderer(buildContext(props));

      const component = createRenderedComponent(runRenderer, {
        ...state.paramDefaults,
      });

      return Object.assign(component, {
        setDisplayName: (
          name:
            | string
            | ((context: {
                params: Record<string, unknown>;
                getComponentForPath: unknown;
              }) => string),
        ) => {
          if (typeof name === 'string') {
            const named = createRenderedComponent(runRenderer, {
              ...state.paramDefaults,
            });

            named.displayName = name;

            return named;
          }

          return createRenderedComponent(
            runRenderer,
            { ...state.paramDefaults },
            (props) => name(buildContext(props)),
          );
        },
      });
    };

    return builder;
  };

  return makeBuilder({
    paths,
    paramDefaults: {},
    declaredPathParams: [],
    componentKeyDeclared: false,
    componentKeyOptional: false,
    usedComponentKeyParams: false,
    usedPathParams: false,
    usedParams: false,
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
        throw new InvalidPathError({ path, validPaths });
      }
    }

    return createTargetPathBuilder(config, paths);
  }) as unknown as ForPaths<Resources, Config, string>;
}

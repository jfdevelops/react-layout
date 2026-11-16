import type {
  PropDefinitions,
  ResolveInputPropsAsDefined,
  ResolvePropsAsDefined,
} from '@jfdevelops/react-layout-validator';
import { validateProps } from '@jfdevelops/react-layout-validator';
import type { ResourceDefinition } from '../../resource';
import type { PathComponentKeys } from '../paths';
import { extractPathVariables, resolveParameterizedPath } from '../paths';
import {
  InvalidComponentError,
  InvalidResourceError,
  InvalidSubResourceError,
  MissingPathVariableError,
} from '../../errors';
import type { PropsContract } from '../../props';
import type {
  PathPick,
  CheckedPathPick,
  SelectedPathConfig,
  SelectedVariableValue,
  PathParamVariables,
} from './selection';
import { selectPathConfig } from './selection';
import { collectPathValidationSets } from '../paths/introspect';

/** Parameters shared by path builders and reusable renderers. */
export type PathParamsOptions<Pick extends object = PathPick> = PropsContract<
  {
    path?: boolean | { optional?: boolean; pick?: Pick };
    keys?: boolean | { optional?: boolean };
  },
  PropDefinitions
>;

type Included<Value, Flag> = Flag extends false | undefined
  ? {}
  : Flag extends { optional: true }
    ? Partial<Value>
    : Value;

/** Selected path variables; an empty selection retains the existing all-variables behavior. */
export type PickedPathParams<Variables, Picked> = [keyof Picked] extends [never]
  ? Variables
  : Pick<Variables, keyof Picked & keyof Variables>;

type SelectedVariables<Variables, Flag> = Flag extends { pick: infer Picked }
  ? keyof Picked extends never
    ? Variables
    : {
        [Key in keyof Variables & keyof Picked]: SelectedVariableValue<
          Variables[Key],
          Picked[Key],
          Key
        >;
      }
  : Variables;

/** Inferred included parameters, narrowed to the selected path. */
export type IncludedPathParams<
  Resources extends readonly ResourceDefinition[],
  Config,
  Path extends string,
  Options extends PathParamsOptions,
> = Options extends { include: infer Include }
  ? (Include extends { path: infer Flag }
      ? Included<
          SelectedVariables<
            PathParamVariables<
              Resources,
              SelectedPathConfig<Config, Options>,
              Path
            >,
            Flag
          >,
          Flag
        >
      : {}) &
      (Include extends { keys: infer Flag }
        ? Included<
            {
              componentKey: PathComponentKeys<
                Resources,
                SelectedPathConfig<Config, Options>,
                Path
              >;
            },
            Flag
          >
        : {})
  : {};

/** Caller-facing custom parameters, before schema transformations. */
export type CustomParamInput<Options> = Options extends {
  custom: infer Shape extends PropDefinitions;
}
  ? ResolveInputPropsAsDefined<Shape>
  : {};

/** Validated custom parameters passed to callbacks. */
export type CustomParamOutput<Options> = Options extends {
  custom: infer Shape extends PropDefinitions;
}
  ? ResolvePropsAsDefined<Shape>
  : {};

/** Complete caller-facing parameter contract shared by path builders and renderers. */
export type PathParamInput<
  Resources extends readonly ResourceDefinition[],
  Config,
  Path extends string,
  Options extends PathParamsOptions,
> = IncludedPathParams<Resources, Config, Path, Options> &
  CustomParamInput<Options>;

/** Complete validated parameter contract shared by path builders and renderers. */
export type PathParamOutput<
  Resources extends readonly ResourceDefinition[],
  Config,
  Path extends string,
  Options extends PathParamsOptions,
> = IncludedPathParams<Resources, Config, Path, Options> &
  CustomParamOutput<Options>;

/** Rejects custom names that overlap included parameters or framework context. */
export type CheckedPathParams<
  Options extends PathParamsOptions,
  Pick extends object = PathPick,
> = PathParamsOptions<Pick> &
  (Options extends { include: { path: { pick: infer Picked } } }
    ? {
        include: {
          path: {
            pick: CheckedPathPick<Picked, Pick>;
          };
        };
      }
    : {}) &
  Options & {
    custom?: Options['custom'] &
      Partial<
        Record<
          | 'Component'
          | 'children'
          | 'context'
          | 'path'
          | 'params'
          | 'getComponentForPath'
          | (Options extends { include: { keys: true | object } }
              ? 'componentKey'
              : never)
          | (Options extends { include: { path: true | object } }
              ? 'resource' | 'subResource' | 'component'
              : never),
          never
        >
      >;
  };

/** Checks collisions consistently for JS callers and schema-backed builders. */
export function validatePathParamsOptions(options: PathParamsOptions) {
  const reserved = new Set([
    'Component',
    'children',
    'context',
    'path',
    'params',
    'getComponentForPath',
  ]);

  if (options.include?.keys) {
    reserved.add('componentKey');
  }

  if (options.include?.path) {
    reserved.add('resource');
    reserved.add('subResource');
    reserved.add('component');
  }

  for (const key of Object.keys(options.custom ?? {})) {
    if (reserved.has(key)) {
      throw new TypeError(
        `Custom parameter "${key}" conflicts with a reserved or included name.`,
      );
    }
  }
}

type PathParamSelection = {
  declaredPathParams: readonly string[];
  componentKeyDeclared: boolean;
  componentKeyOptional: boolean;
};

type ValidationSets = {
  resources: ReadonlySet<string>;
  subResources: ReadonlySet<string>;
  components: ReadonlySet<string>;
};
type ToMutable<T> = {
  -readonly [K in keyof T]: T[K] extends ReadonlySet<infer U> ? Set<U> : T[K];
};

function isSubResourceParamBranch(
  value: unknown,
): value is { value: string; subResource: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    typeof value.value === 'string' &&
    'subResource' in value
  );
}

function collectValidationSets(
  config: Record<string, unknown>,
  paths: readonly string[],
  selection: PathParamSelection,
): ValidationSets {
  const resources = new Set<string>();
  const subResources = new Set<string>();
  const components = new Set<string>();
  const { declaredPathParams, componentKeyDeclared } = selection;
  let targets: Partial<ToMutable<ValidationSets>> = {};

  if (declaredPathParams.includes('resource')) {
    targets.resources = resources;
  }

  if (declaredPathParams.includes('subResource')) {
    targets.subResources = subResources;
  }

  if (componentKeyDeclared || declaredPathParams.includes('component')) {
    targets.components = components;
  }

  if (targets.resources || targets.subResources || targets.components) {
    for (const path of new Set(paths)) {
      collectPathValidationSets(config, path, targets);
    }
  }

  return {
    resources,
    subResources,
    components,
  };
}

/**
 * Validates the params a caller passed before the renderer runs, so a bad resource or
 * slot fails with a typed error naming what is available.
 */
function validateParams(
  params: Record<string, unknown>,
  state: PathParamSelection,
  sets: ValidationSets,
) {
  const { resource, subResource, component, componentKey } = params;

  /*
   * ----------------------------------------------------------------
   * All invariants that have a function as their `input` are intentional and are to
   * defer error details until validation fails so successful checks avoid building diagnostics.
   * ----------------------------------------------------------------
   */

  InvalidResourceError.invariant(
    !state.declaredPathParams.includes('resource') ||
      resource === undefined ||
      (typeof resource === 'string' && sets.resources.has(resource)),
    () => ({
      resource,
      validResources: [...sets.resources],
      reason:
        'The "resource" parameter must name a resource available to this component.',
    }),
  );

  if (
    state.declaredPathParams.includes('subResource') &&
    subResource !== undefined
  ) {
    let cursor: unknown = subResource;
    let invalidSlug: string | undefined;
    const invalidShapeContext = () => ({
      subResource,
      resource: typeof resource === 'string' ? resource : undefined,
      validSubResources: [...sets.subResources],
      reason:
        'The "subResource" parameter must be a slug or a nested { value, subResource } object.',
    });

    while (true) {
      const current: unknown = cursor;
      const isTerminal = typeof current === 'string';
      const isBranch = isSubResourceParamBranch(current);

      InvalidSubResourceError.invariant(
        isTerminal ? current.length > 0 : isBranch,
        invalidShapeContext,
      );

      if (isTerminal) {
        if (invalidSlug === undefined && !sets.subResources.has(current)) {
          invalidSlug = current;
        }

        break;
      }

      if (isBranch) {
        if (
          invalidSlug === undefined &&
          !sets.subResources.has(current.value)
        ) {
          invalidSlug = current.value;
        }

        cursor = current.subResource;
      }
    }

    // Validate the full shape before reporting an unavailable slug, preserving error precedence.
    InvalidSubResourceError.invariant(invalidSlug === undefined, () => ({
      subResource: invalidSlug,
      resource: typeof resource === 'string' ? resource : undefined,
      validSubResources: [...sets.subResources],
      reason:
        'The "subResource" parameter contains a sub-resource unavailable to this component.',
    }));
  }

  InvalidComponentError.invariant(
    !state.declaredPathParams.includes('component') ||
      component === undefined ||
      (typeof component === 'string' && sets.components.has(component)),
    () => ({
      component,
      validComponents: [...sets.components],
      reason: `The "component" parameter "${String(component)}" must name a component slot available to this component.`,
    }),
  );

  InvalidComponentError.invariant(
    !state.componentKeyDeclared ||
      (componentKey === undefined
        ? state.componentKeyOptional
        : typeof componentKey === 'string' &&
          sets.components.has(componentKey)),
    () => ({
      component: componentKey,
      validComponents: [...sets.components],
      reason:
        componentKey === undefined
          ? 'A "componentKey" prop is required for this component.'
          : `The "componentKey" prop "${String(componentKey)}" must name a component slot available to this component.`,
    }),
  );
}

/** Compiles the parameter configuration shared by components and renderer factories. */
export function createPathParams(
  config: Record<string, unknown>,
  paths: readonly string[],
  options: PathParamsOptions,
  defaults: Record<string, unknown> = {},
) {
  const path = options.include?.path;
  const keys = options.include?.keys;
  const variables = [...new Set(paths.flatMap(extractPathVariables))];
  const picked = typeof path === 'object' ? Object.keys(path.pick ?? {}) : [];
  const selection = {
    declaredPathParams: path
      ? variables.filter((key) => picked.length === 0 || picked.includes(key))
      : [],
    componentKeyDeclared: !!keys,
    componentKeyOptional: typeof keys === 'object' && keys.optional === true,
  };
  const pick = typeof path === 'object' ? path.pick : undefined;
  const selectedConfig = selectPathConfig(config, pick);
  const sets = collectValidationSets(selectedConfig, paths, selection);
  const optionalPath = typeof path === 'object' && path.optional === true;
  const canUseKeyShorthand =
    !!keys &&
    Object.keys(options.custom ?? {}).length === 0 &&
    selection.declaredPathParams.length === 0;

  function resolve(props: Record<string, unknown>, requirePathParams = false) {
    const params = validateProps(options.custom ?? {}, {
      ...defaults,
      ...props,
    });
    validateParams(params, selection, sets);

    if (requirePathParams) {
      for (const key of selection.declaredPathParams) {
        if (!optionalPath && params[key] === undefined) {
          throw new MissingPathVariableError({
            variable: key,
            path: paths[0],
            providedVariables: Object.keys(params),
          });
        }
      }

      const [onlyPath] = paths;

      if (
        path &&
        onlyPath !== undefined &&
        paths.length === 1 &&
        variables.every((key) => params[key] !== undefined)
      ) {
        resolveParameterizedPath(selectedConfig, onlyPath, params);
      }
    }

    return params;
  }

  return {
    resolve,
    canUseKeyShorthand,
    config: selectedConfig,
  };
}

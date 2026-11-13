import {
  validateProps,
  isStandardSchema,
  type PropDefinition,
} from '@jfdevelops/react-layout-validator';
import type { InPropsDefinition, InPropsObject, PropsContract } from '../props';
import type { ResourceDefinition } from '../resource';
import { LayoutConfigurationError } from '../errors';
import { createLayoutResourcesAccessor } from './define-layout';
import {
  schemaOptionDefinitions,
  validateOptionSchema,
  type OptionSchema,
} from '../option-schema';
import type { CreateReusable, ReusableOverlap } from './reusable-types';
import { type } from 'arktype';
import { fieldDefinitions } from '../schema-fields';
import {
  acceptsUndefined,
  objectDefinition,
  optionalDefinition,
  resolveOptionDefinitions,
} from '../built-in-props';
export type * from './reusable-types';
import {
  singleResourceInput,
  isSingleResourceInput,
  getResourcePaths,
} from './reusable-resource-input';

type RuntimeSelection = Record<string, unknown>;
type PlanLocation = { from: 'props' | 'options' | 'resources'; path: string[] };
type ValuePlan = PlanLocation & {
  kind: 'value';
  // Optional ancestors remain tied to the value's original source after merging.
  guards?: PlanLocation[];
  source: 'option' | 'resource' | 'custom';
  selector?: (value: any) => unknown;
  definition?: PropDefinition;
};
type ResourceSelector = NonNullable<ValuePlan['selector']>;
type ResourceSelections = Map<ResourceSelector, unknown>;

type ObjectPlan = {
  kind: 'object';
  children: Record<string, Plan>;
  optional: boolean;
  guards: PlanLocation[][];
};
type Plan = ValuePlan | ObjectPlan;

function objectPlan(
  children: Record<string, Plan>,
  optional = false,
  guards: PlanLocation[][] = [[]],
): ObjectPlan {
  return {
    kind: 'object',
    children,
    optional,
    guards,
  };
}

function optionPlan(
  definitions: InPropsObject,
  selection: unknown,
  from: 'props' | 'options',
  path: string[] = [],
  optionalPaths: string[][] = [],
): ObjectPlan {
  const entries =
    selection === true
      ? Object.fromEntries(Object.keys(definitions).map((key) => [key, true]))
      : (selection as RuntimeSelection);
  const children: Record<string, Plan> = {};
  for (const [key, value] of Object.entries(entries ?? {})) {
    if (!Object.hasOwn(definitions, key)) {
      throw new LayoutConfigurationError(`Unknown reusable option "${key}".`);
    }
    const definition = definitions[key];
    const location: PlanLocation = {
      from,
      path: [...path, key],
    };
    if (typeof value === 'function') {
      children[key] = {
        ...location,
        from: 'options',
        guards: optionalPaths.map((path) => ({
          from: 'options',
          path,
        })),
        kind: 'value',
        source: 'option',
        selector: value as ValuePlan['selector'],
        definition,
      };
    } else if (
      (value === true && fieldDefinitions(definition)) ||
      (value && typeof value === 'object')
    ) {
      // Fields come from the schema library when it exposes them. Otherwise the
      // selected keys become unvalidated parts of a value its schema validates.
      const fields =
        fieldDefinitions(definition) ??
        schemaOptionDefinitions(
          definition as OptionSchema,
          Object.keys(value as object),
        );
      const optional = acceptsUndefined(definition);
      const nested = optionPlan(
        fields,
        value,
        from,
        location.path,
        optional ? [...optionalPaths, location.path] : optionalPaths,
      );
      children[key] = {
        ...nested,
        optional,
      };
    } else if (value === true) {
      children[key] = {
        ...location,
        guards: optionalPaths.map((path) => ({
          from,
          path,
        })),
        kind: 'value',
        source: 'option',
        definition,
      };
    } else {
      throw new LayoutConfigurationError(
        `Invalid reusable selection for "${key}".`,
      );
    }
  }
  const origins = new Set<PlanLocation['from']>();
  function collectOrigins(node: Plan) {
    if (node.kind === 'value') {
      origins.add(node.from);
    } else {
      Object.values(node.children).forEach(collectOrigins);
    }
  }
  Object.values(children).forEach(collectOrigins);
  if (!origins.size) {
    origins.add(from);
  }

  return objectPlan(
    children,
    false,
    [...origins].map((origin) =>
      optionalPaths.map((path) => ({
        from: origin,
        path,
      })),
    ),
  );
}

function sameSelection(left: ValuePlan, right: ValuePlan) {
  return (
    left.source === right.source &&
    left.selector === right.selector &&
    left.path.join('.') === right.path.join('.') &&
    (left.source === 'option' || left.from === right.from)
  );
}

function mergePlans(
  left: ObjectPlan,
  right: ObjectPlan,
  overlap?: ReusableOverlap,
  path: string[] = [],
): ObjectPlan {
  const children = {
    ...left.children,
  };
  for (const [key, other] of Object.entries(right.children)) {
    const current = children[key];
    if (!current) {
      children[key] = other;
      continue;
    }
    if (current.kind === 'object' && other.kind === 'object') {
      children[key] = mergePlans(current, other, overlap, [...path, key]);
    } else if (
      current.kind === 'value' &&
      other.kind === 'value' &&
      sameSelection(current, other)
    ) {
      // A shared option selection uses one source value and executes only once.
      children[key] = other.from === 'options' ? other : current;
    } else if (overlap) {
      children[key] = overlap === 'preferProps' ? current : other;
    } else {
      throw new LayoutConfigurationError(
        `Ambiguous reusable property "${[...path, key].join(
          '.',
        )}". Rename one result or set overlap to "preferProps" or "preferSelect".`,
      );
    }
  }

  return {
    kind: 'object',
    children,
    optional: left.optional && right.optional,
    guards: [...left.guards, ...right.guards],
  };
}

function withoutSharedCallerValues(
  left: ObjectPlan,
  right: ObjectPlan,
): ObjectPlan {
  const children = {
    ...left.children,
  };
  for (const [key, other] of Object.entries(right.children)) {
    const current = children[key];
    if (current?.kind === 'object' && other.kind === 'object') {
      children[key] = withoutSharedCallerValues(current, other);
    } else if (
      current?.kind === 'value' &&
      other.kind === 'value' &&
      sameSelection(current, other) &&
      other.from === 'options'
    ) {
      delete children[key];
    }
  }

  return {
    ...left,
    children,
  };
}

function planDefinitions(
  plan: ObjectPlan,
  from: 'props' | 'options',
): InPropsObject {
  const definitions: InPropsObject = {};
  for (const [key, value] of Object.entries(plan.children)) {
    if (value.kind === 'value') {
      if (value.from === from && value.definition) {
        definitions[key] = value.definition;
      }
    } else {
      const nested = planDefinitions(value, from);
      if (Object.keys(nested).length) {
        const definition = objectDefinition(nested);
        definitions[key] = value.optional
          ? optionalDefinition(definition)
          : definition;
      }
    }
  }

  return definitions;
}

function sourceSelection(
  selection: unknown,
  callbacksOnly: boolean,
): true | RuntimeSelection {
  if (typeof selection === 'function') {
    return true;
  }
  if (selection === true) {
    return callbacksOnly ? {} : true;
  }
  const source: RuntimeSelection = {};
  for (const [key, value] of Object.entries(
    (selection ?? {}) as RuntimeSelection,
  )) {
    const nested = sourceSelection(value, callbacksOnly);
    if (nested === true || Object.keys(nested).length) {
      source[key] = nested;
    }
  }

  return source;
}

function mergeSelections(
  left: true | RuntimeSelection,
  right: true | RuntimeSelection,
): true | RuntimeSelection {
  if (left === true || right === true) {
    return true;
  }
  const merged = {
    ...left,
  };
  for (const [key, value] of Object.entries(right)) {
    merged[key] = Object.hasOwn(left, key)
      ? mergeSelections(
          left[key] as true | RuntimeSelection,
          value as true | RuntimeSelection,
        )
      : value;
  }

  return merged;
}

function readLocation(
  location: PlanLocation,
  props: Record<string, unknown>,
  options: Record<string, unknown>,
  resources: unknown,
) {
  let value: any =
    location.from === 'props'
      ? props
      : location.from === 'options'
        ? options
        : resources;
  for (const key of location.path) {
    value = value?.[key];
  }

  return value;
}

function resolvePlan(
  plan: ObjectPlan,
  props: Record<string, unknown>,
  options: Record<string, unknown>,
  resources: unknown,
  resourceSelections: ResourceSelections,
) {
  const result: Record<string, unknown> = {};
  for (const [key, node] of Object.entries(plan.children)) {
    if (node.kind === 'object') {
      if (
        node.guards.some((group) =>
          group.every(
            (location) =>
              readLocation(location, props, options, resources) !== undefined,
          ),
        )
      ) {
        result[key] = resolvePlan(
          node,
          props,
          options,
          resources,
          resourceSelections,
        );
      }
    } else {
      if (
        node.guards?.some(
          (location) =>
            readLocation(location, props, options, resources) === undefined,
        )
      ) {
        continue;
      }
      const value = readLocation(node, props, options, resources);
      if (node.selector) {
        const selected =
          node.source === 'resource'
            ? resourceSelections.get(node.selector)
            : node.selector(value);
        result[key] =
          node.source === 'resource' && isSingleResourceInput(selected)
            ? props.resources
            : selected;
      } else if (
        value !== undefined ||
        !(node.definition && acceptsUndefined(node.definition))
      ) {
        result[key] = value;
      }
    }
  }

  return result;
}

export function createReusableBuilder<
  const Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
>(resources: Resources, options: Options): CreateReusable<Resources, Options>;
export function createReusableBuilder(
  resources: ReadonlyArray<ResourceDefinition>,
  options: InPropsObject | OptionSchema | ((...args: any[]) => InPropsObject),
) {
  if (isStandardSchema(options)) {
    return function createSchemaReusable(definition: {
      props?: PropsContract<RuntimeSelection, InPropsObject>;
      select?: RuntimeSelection;
      overlap?: ReusableOverlap;
      fn: (props: Record<string, unknown>) => unknown;
    }) {
      return function schemaReusable(props: Record<string, unknown> = {}) {
        const selection = definition.props?.include?.options;
        const usesOptions =
          selection !== undefined || definition.select?.options !== undefined;
        if (!usesOptions) {
          return createReusableBuilder(resources, {})(definition as never)(
            props,
          );
        }
        const source = props.options ?? {};
        if (
          source === null ||
          typeof source !== 'object' ||
          Array.isArray(source)
        ) {
          throw new LayoutConfigurationError(
            'Reusable source options must be an object.',
          );
        }
        const callerKeys =
          selection === true
            ? Object.keys(props).filter(
                (key) =>
                  key !== 'options' &&
                  key !== 'resources' &&
                  !Object.hasOwn(definition.props?.custom ?? {}, key),
              )
            : Object.entries((typeof selection === 'object' && selection) || {})
                .filter(([, value]) => value === true)
                .map(([key]) => key);
        const input = {
          ...source,
        };
        for (const key of callerKeys) {
          if (Object.hasOwn(props, key)) {
            (input as Record<string, unknown>)[key] = props[key];
          }
        }
        const values = validateOptionSchema(options as OptionSchema, input);
        const definitions = schemaOptionDefinitions(
          options as OptionSchema,
          Object.keys(values),
        );
        const reusable = createReusableBuilder(
          resources,
          definitions,
        )(definition as never);
        const callerValues = Object.fromEntries(
          Object.entries(values).filter(
            ([key]) => selection === true || callerKeys.includes(key),
          ),
        );

        return reusable({
          ...props,
          ...callerValues,
          options: values,
        });
      };
    } as unknown;
  }
  const keys = resources.map((entry) =>
    typeof entry === 'string' ? entry : entry.value,
  );
  const selectedResources = type.enumerated(...keys).array();
  const singleResource = type.enumerated(...getResourcePaths(resources));
  const resourcesAccessor = Object.assign(
    createLayoutResourcesAccessor(resources),
    {
      single() {
        return {
          [singleResourceInput]: resources,
        };
      },
    },
  );

  function createReusable(definition: {
    props?: PropsContract<RuntimeSelection, InPropsObject>;
    select?: RuntimeSelection;
    overlap?: ReusableOverlap;
    fn: (props: Record<string, unknown>) => unknown;
  }) {
    const include = definition.props?.include ?? {};
    const select = definition.select ?? {};
    if (
      definition.overlap !== undefined &&
      definition.overlap !== 'preferProps' &&
      definition.overlap !== 'preferSelect'
    ) {
      throw new LayoutConfigurationError('Unknown reusable overlap policy.');
    }
    const optionDefinitions = resolveOptionDefinitions(
      options,
      keys,
      'Reusable',
    ) as InPropsObject;

    function compile(selection: RuntimeSelection, from: 'props' | 'options') {
      let plan = objectPlan({});
      for (const [key, value] of Object.entries(selection)) {
        let next: ObjectPlan;
        if (key === 'options') {
          if (
            value !== true &&
            typeof value !== 'function' &&
            (!value || typeof value !== 'object' || Array.isArray(value))
          ) {
            throw new LayoutConfigurationError(
              'Invalid reusable options selection.',
            );
          }
          next =
            typeof value === 'function'
              ? objectPlan({
                  options: {
                    kind: 'value',
                    source: 'option',
                    from: 'options',
                    path: [],
                    selector: value as ValuePlan['selector'],
                  },
                })
              : optionPlan(optionDefinitions, value, from);
        } else if (
          key === 'resources' &&
          (value === true || typeof value === 'function')
        ) {
          next = objectPlan({
            resources: {
              kind: 'value',
              source: 'resource',
              from: value === true && from === 'props' ? 'props' : 'resources',
              path: value === true && from === 'props' ? ['resources'] : [],
              selector:
                typeof value === 'function'
                  ? (value as ValuePlan['selector'])
                  : undefined,
              definition:
                value === true && from === 'props'
                  ? selectedResources
                  : undefined,
            },
          });
        } else {
          throw new LayoutConfigurationError(
            `Invalid reusable source "${key}".`,
          );
        }
        plan = mergePlans(plan, next);
      }

      return plan;
    }

    let included = compile(include, 'props');
    const custom = objectPlan(
      Object.fromEntries(
        Object.entries(definition.props?.custom ?? {}).map(([key, value]) => [
          key,
          {
            kind: 'value',
            source: 'custom',
            from: 'props',
            path: [key],
            definition: value,
          } as ValuePlan,
        ]),
      ),
    );
    included = mergePlans(included, custom);
    const selected = compile(select, 'options');
    const plan = mergePlans(included, selected, definition.overlap);
    const callerDefinitions = planDefinitions(
      withoutSharedCallerValues(included, selected),
      'props',
    );
    // Identical true selections supplied by select are removed from the caller props contract.
    const effectiveCallerDefinitions = planDefinitions(plan, 'props');
    const sources = mergeSelections(
      sourceSelection(include.options, true),
      sourceSelection(select.options, false),
    );
    const sourceDefinitions =
      sources === true
        ? optionDefinitions
        : planDefinitions(
            optionPlan(optionDefinitions, sources, 'options'),
            'options',
          );
    const resourceSelectors = new Set(
      [include.resources, select.resources].filter(
        (selector): selector is ResourceSelector =>
          typeof selector === 'function',
      ),
    );
    const needsOptions = Object.keys(sourceDefinitions).length > 0;
    if (needsOptions && Object.hasOwn(callerDefinitions, 'options')) {
      throw new LayoutConfigurationError(
        'Reusable prop "options" is reserved for source values.',
      );
    }

    return function reusable(props: Record<string, unknown> = {}) {
      // Validate configured caller props too when an explicit overlap policy discards their output.
      const definitions = definition.overlap
        ? callerDefinitions
        : effectiveCallerDefinitions;
      props = validateProps(definitions, props);
      if (
        needsOptions &&
        props.options !== undefined &&
        (props.options === null ||
          typeof props.options !== 'object' ||
          Array.isArray(props.options))
      ) {
        throw new LayoutConfigurationError(
          'Reusable source options must be an object.',
        );
      }
      const values = validateProps(
        sourceDefinitions,
        (props.options ?? {}) as Record<string, unknown>,
      );
      // Resource callbacks also declare caller inputs, independently of overlap precedence.
      const resourceSelections: ResourceSelections = new Map();
      for (const selector of resourceSelectors) {
        const selected = selector(resourcesAccessor);
        if (isSingleResourceInput(selected)) {
          validateProps(
            {
              resources: singleResource,
            },
            props,
          );
        }
        resourceSelections.set(selector, selected);
      }

      return definition.fn(
        resolvePlan(plan, props, values, resourcesAccessor, resourceSelections),
      );
    };
  }

  return createReusable as unknown;
}

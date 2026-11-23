/** A resource declaration accepted by resource schema adapters. */
export type SchemaResource =
  | string
  | {
      readonly value: string;
      readonly subResources?: readonly SchemaResource[];
    };

/** Resource accessors, definitions, or functions producing resource selections. */
export type ResourceSchemaInput<Resources extends readonly SchemaResource[]> =
  | { raw(): Resources }
  | ((...args: never[]) => unknown)
  | Resources;

type FunctionDefinitions<
  Arguments extends readonly unknown[],
  Result,
> = Arguments extends []
  ? ResourceSchemaDefinitions<Result>
  : NonNullable<Arguments[0]> extends (resources: infer Resources) => unknown
    ? Extract<Resources, readonly SchemaResource[]>
    : ResourceSchemaDefinitions<Result>;

/** Recovers declarations while preserving generic accessor and selector types. */
export type ResourceSchemaDefinitions<
  Input,
  Args extends readonly unknown[] = [],
> = Input extends {
  readonly resourceSchema: {
    readonly kind: infer Kind;
    readonly resources: infer Resources extends readonly SchemaResource[];
  };
}
  ? ReadonlyArray<
      Resources[number] extends infer Resource
        ? Resource extends SchemaResource
          ? Kind extends 'pick'
            ? ResourceKey<Resource> extends Args[number]
              ? Resource
              : never
            : ResourceKey<Resource> extends Args[number]
              ? never
              : Resource
          : never
        : never
    >
  : Input extends { raw: (...args: infer Arguments) => infer Result }
    ? FunctionDefinitions<Arguments, Result>
    : Input extends (...args: infer Arguments) => infer Result
      ? Args[0] extends (...args: never[]) => infer Selected
        ? ResourceSchemaDefinitions<Selected>
        : FunctionDefinitions<Arguments, Result>
      : Extract<Input, readonly SchemaResource[]>;

/** Arguments accepted by an input function. Required parameters remain required. */
export type ResourceSchemaArguments<Input> = Input extends { raw: unknown }
  ? { args?: never }
  : Input extends (...args: infer Args) => unknown
    ? [] extends Args
      ? { args?: Readonly<Args> }
      : { args: Readonly<Args> }
    : { args?: never };

/** Shape of the schema returned by an adapter. */
export type ResourceSchemaFormat = 'union' | 'array';

/** How nested resource names are included in the schema. */
export type ResourceSchemaNested = 'exclude' | 'names' | 'paths';

/** Controls schema shape independently of nested resource handling. */
export type ResourceSchemaOptions<
  Format extends ResourceSchemaFormat = ResourceSchemaFormat,
  Nested extends ResourceSchemaNested = ResourceSchemaNested,
> = {
  format?: Format;
  nested?: Nested;
};

/** Literal values selected by an input and its complete configuration. */
export type ResourceSchemaOptionValue<Input, Options> = ResourceSchemaValue<
  ResourceSchemaDefinitions<
    Input,
    Options extends { args: infer Args extends readonly unknown[] } ? Args : []
  >,
  'nested' extends keyof Options
    ?
        | Extract<Options['nested'], ResourceSchemaNested>
        | (undefined extends Options['nested'] ? 'exclude' : never)
    : 'exclude'
>;

/** Selects a native schema type from the configured output shape. */
export type ResourceSchemaResult<Format, Union, Array> = Format extends 'array'
  ? Array
  : Union;

type ResourceKey<Resource> = Resource extends string
  ? Resource
  : Resource extends { readonly value: infer Value extends string }
    ? Value
    : never;

type ResourcePath<Resource> =
  string extends ResourceKey<Resource>
    ? string
    : Resource extends string
      ? Resource
      : Resource extends { readonly value: infer Value extends string }
        ? Resource extends {
            readonly subResources: infer Children extends
              readonly SchemaResource[];
          }
          ? Value | `${Value}.${ResourcePath<Children[number]>}`
          : Value
        : never;

type ResourceName<Resource> =
  string extends ResourceKey<Resource>
    ? string
    : Resource extends {
          readonly subResources: infer Children extends
            readonly SchemaResource[];
        }
      ? ResourceKey<Resource> | ResourceName<Children[number]>
      : ResourceKey<Resource>;

/** Literal values accepted by a resource schema. */
export type ResourceSchemaValue<
  Resources extends readonly SchemaResource[],
  Nested extends ResourceSchemaNested = 'exclude',
> = Nested extends 'paths'
  ? ResourcePath<Resources[number]>
  : Nested extends 'names'
    ? ResourceName<Resources[number]>
    : ResourceKey<Resources[number]>;

/** Extracts unique literal values without parsing resource names as schema syntax. */
export function getResourceSchemaValues<
  const Input extends ResourceSchemaInput<readonly SchemaResource[]>,
  const Nested extends ResourceSchemaNested = 'exclude',
  const Args extends readonly unknown[] = [],
>(
  input: Input,
  options?: ResourceSchemaOptions<ResourceSchemaFormat, Nested> & {
    args?: Args;
  },
) {
  const source: ResourceSchemaInput<readonly SchemaResource[]> = input;
  let result: unknown = 'raw' in source ? source.raw() : source;

  if (typeof source === 'function' && !('raw' in source)) {
    result = Reflect.apply(source, undefined, options?.args ?? []);
  }

  if (typeof result === 'function') {
    result = result();
  }

  if (!Array.isArray(result)) {
    throw new TypeError(
      'Resource schema input must produce resource definitions.',
    );
  }

  const resources: readonly SchemaResource[] = result;
  const values = new Set<string>();

  function collect(definitions: readonly SchemaResource[], prefix = '') {
    for (const definition of definitions) {
      const value =
        typeof definition === 'string' ? definition : definition.value;
      const path = `${prefix}${value}`;
      values.add(path);

      if (
        options?.nested !== undefined &&
        options.nested !== 'exclude' &&
        typeof definition !== 'string' &&
        definition.subResources
      ) {
        collect(
          definition.subResources,
          options.nested === 'paths' ? `${path}.` : '',
        );
      }
    }
  }

  collect(resources);

  // Each collected value is a declared key, or a recursively joined declared path.
  return [...values] as ResourceSchemaValue<
    ResourceSchemaDefinitions<Input, Args>,
    Nested
  >[];
}

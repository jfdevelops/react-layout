/** A resource declaration accepted by resource schema adapters. */
export type SchemaResource =
  | string
  | {
      readonly value: string;
      readonly subResources?: readonly SchemaResource[];
    };

/** Accepts layout resource accessors, selections, or resource definitions. */
export type ResourceSchemaInput<Resources extends readonly SchemaResource[]> =
  | { raw(): Resources }
  | (() => Resources)
  | Resources;

/** Recovers declarations from accessor selectors without widening generic return types. */
export type ResourceSchemaDefinitions<Input> = Input extends {
  raw: (...args: infer Arguments) => infer Result;
}
  ? Arguments extends []
    ? Extract<Result, readonly SchemaResource[]>
    : NonNullable<Arguments[0]> extends (resources: infer Resources) => unknown
      ? Extract<Resources, readonly SchemaResource[]>
      : Extract<Result, readonly SchemaResource[]>
  : Input extends () => infer Resources
    ? Extract<Resources, readonly SchemaResource[]>
    : Extract<Input, readonly SchemaResource[]>;

/** Select top-level resource names or every dotted resource path. */
export type ResourceSchemaFormat = 'keys' | 'paths';

/** Controls which declared resource names the schema accepts. */
export type ResourceSchemaOptions<
  Format extends ResourceSchemaFormat = ResourceSchemaFormat,
> = {
  format?: Format;
};

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

/** Literal values accepted by a resource schema. */
export type ResourceSchemaValue<
  Resources extends readonly SchemaResource[],
  Format extends ResourceSchemaFormat = 'keys',
> = Format extends 'paths'
  ? ResourcePath<Resources[number]>
  : ResourceKey<Resources[number]>;

/** Extracts unique literal values without parsing resource names as schema syntax. */
export function getResourceSchemaValues<
  const Input extends ResourceSchemaInput<readonly SchemaResource[]>,
  const Format extends ResourceSchemaFormat = 'keys',
>(input: Input, options?: ResourceSchemaOptions<Format>) {
  const source: ResourceSchemaInput<readonly SchemaResource[]> = input;
  const resources =
    'raw' in source
      ? source.raw()
      : typeof source === 'function'
        ? source()
        : source;
  const values = new Set<string>();

  function collect(definitions: readonly SchemaResource[], prefix = '') {
    for (const definition of definitions) {
      const value =
        typeof definition === 'string' ? definition : definition.value;
      const path = `${prefix}${value}`;
      values.add(path);

      if (
        options?.format === 'paths' &&
        typeof definition !== 'string' &&
        definition.subResources
      ) {
        collect(definition.subResources, `${path}.`);
      }
    }
  }

  collect(resources);

  // Each collected value is a declared key, or a recursively joined declared path.
  return [...values] as ResourceSchemaValue<
    ResourceSchemaDefinitions<Input>,
    Format
  >[];
}

import { capitalize } from '../utils/capitalize';
/**
 * Each slot has a distinct type identity, so ordinary text cannot become a slot.
 */
declare const layoutNamePlaceholder: unique symbol;
type NamePlaceholder<
  Key extends string,
  Value extends string | number = string
> = Value & {
  readonly [layoutNamePlaceholder]: Key;
};
type PatternNameContext = Omit<
  LayoutNameContext<NamePlaceholder<'resource'>>,
  'capitalize'
> & {
  capitalize: <T extends string>(
    value: T
  ) => T extends NamePlaceholder<'resource'>
    ? NamePlaceholder<'capitalizedResource'>
    : Capitalize<T>;
};
export interface LayoutNameContext<
  Resource extends string = string,
  State extends string = string
> {
  resource: Resource;
  states: readonly State[];
  capitalize: typeof capitalize;
}
export interface LayoutNameParts {
  prefix?: string;
  beforeSuffix?: string;
  append?: string;
}
/**
 * Value kinds accepted by a declared naming part.
 */
export type LayoutNamePartType = 'string' | 'number';

/**
 * Declares each naming part and the value kind accepted at call sites.
 */
export type LayoutNamePartDefinitions = Readonly<
  Record<string, LayoutNamePartType>
>;

type PartValue<Type extends LayoutNamePartType> = Type extends 'number'
  ? number
  : string;

/**
 * Optional values for declared naming parts. Omitted slots render as empty text.
 */
export type LayoutNamePartValues<
  Definitions extends LayoutNamePartDefinitions
> = {
  [Key in keyof Definitions]?: PartValue<Definitions[Key]>;
};

type PatternParts<Definitions extends LayoutNamePartDefinitions> = {
  [Key in keyof Definitions & string]: NamePlaceholder<
    `part:${Key}`,
    PartValue<Definitions[Key]> | ''
  >;
};
type PartText<Value> = Value extends string | number ? `${Value}` : '';
type Part<Parts, Key extends keyof Parts> = PartText<Parts[Key]>;
type ResourcePlaceholderValues<Resource extends string> = {
  resource: Resource;
  capitalizedResource: Capitalize<Resource>;
};
type PlaceholderValues<
  Resource extends string,
  Parts
> = ResourcePlaceholderValues<Resource> & {
  [Key in keyof Parts & string as `part:${Key}`]: ResolvePattern<
    Part<Parts, Key>,
    ResourcePlaceholderValues<Resource>
  >;
};
type MatchPlaceholder<Pattern extends string, Values> = {
  [Key in keyof Values & string]: Pattern extends
    | NamePlaceholder<Key>
    | `${NamePlaceholder<Key>}`
    | `${NamePlaceholder<Key, number>}`
    ? [Extract<Values[Key], string>, '']
    : Pattern extends `${NamePlaceholder<Key>}${infer Rest}`
    ? [Extract<Values[Key], string>, Rest]
    : Pattern extends `${NamePlaceholder<Key, number>}${infer Rest}`
    ? [Extract<Values[Key], string>, Rest]
    : never;
}[keyof Values & string];
type ResolvePattern<
  Pattern extends string,
  Values,
  Result extends string = ''
> = [MatchPlaceholder<Pattern, Values>] extends [never]
  ? Pattern extends `${infer First}${infer Rest}`
    ? ResolvePattern<Rest, Values, `${Result}${First}`>
    : `${Result}${Pattern}`
  : MatchPlaceholder<Pattern, Values> extends [
      infer Value extends string,
      infer Rest extends string
    ]
  ? ResolvePattern<Rest, Values, `${Result}${Value}`>
  : never;
export type ResolveNamePattern<
  Pattern extends string,
  Resource extends string,
  Parts = {}
> = ResolvePattern<Pattern, PlaceholderValues<Resource, Parts>>;
export const layoutNamePattern: unique symbol = Symbol(
  'layoutNamePattern'
);
export interface LayoutNameResolver<
  Pattern extends string = string,
  Parts = {}
> {
  (context: LayoutNameContext): string;
  readonly [layoutNamePattern]: { pattern: Pattern; parts: Parts };
}
/**
 * Computes a layout name from its resource and available render states.
 */
export type LayoutNameCallback<
  Resource extends string = string,
  States extends string = string,
  Name extends string = string
> = (context: LayoutNameContext<Resource, States>) => Name;

export type LayoutNameInput<
  Resource extends string = string,
  States extends string = string,
  Name extends string = string
> = Name | LayoutNameCallback<Resource, States, Name>;
export type ResolvedLayoutName<Naming, Resource extends string> = [
  Naming
] extends [undefined]
  ? `${Capitalize<Resource>}Layout`
  : Naming extends LayoutNameResolver<infer Pattern, infer Parts>
  ? ResolveNamePattern<Pattern, Resource, Parts>
  : Naming extends (...args: any[]) => infer Result
  ? Extract<Result, string>
  : Naming extends string
  ? Naming
  : `${Capitalize<Resource>}Layout`;
type NamingPartsInput<
  Definitions extends LayoutNamePartDefinitions,
  Parts extends LayoutNamePartValues<Definitions>
> = {
  [Key in keyof (LayoutNamePartValues<Definitions> &
    Parts)]: Key extends keyof Definitions
    ? (LayoutNamePartValues<Definitions> & Parts)[Key]
    : never;
};

type NamingPartsCallback<
  Definitions extends LayoutNamePartDefinitions,
  Parts extends LayoutNamePartValues<Definitions>
> = (context: PatternNameContext) => NamingPartsInput<Definitions, Parts>;

type ResolvedParts<
  Definitions extends LayoutNamePartDefinitions,
  Parts
> = {
  [Key in keyof Definitions]: Key extends keyof Parts ? Parts[Key] : '';
};

type NamingPattern<
  Definitions extends LayoutNamePartDefinitions,
  Pattern extends string
> = (
  context: PatternNameContext,
  parts: PatternParts<Definitions>
) => Pattern;

/**
 * Supplies optional part values while preserving their literal types in names.
 */
export interface LayoutNameFactory<
  Definitions extends LayoutNamePartDefinitions,
  Pattern extends string
> {
  <const Parts extends LayoutNamePartValues<Definitions> = {}>(
    parts?:
      | NamingPartsInput<Definitions, Parts>
      | NamingPartsCallback<Definitions, Parts>
  ): LayoutNameResolver<Pattern, ResolvedParts<Definitions, Parts>>;
}

interface DefinedLayoutNameParts<
  Definitions extends LayoutNamePartDefinitions
> {
  /**
   * Defines the naming pattern using only the declared part placeholders.
   */
  namingFn<const Pattern extends string>(
    pattern: NamingPattern<Definitions, Pattern>
  ): LayoutNameFactory<Definitions, Pattern>;
}

const defaultPartDefinitions = {
  prefix: 'string',
  beforeSuffix: 'string',
  append: 'string'
} satisfies { [Key in keyof LayoutNameParts]-?: 'string' };

function createNamingFactory<
  Definitions extends LayoutNamePartDefinitions,
  const Pattern extends string
>(
  definitions: Definitions,
  pattern: NamingPattern<Definitions, Pattern>
): LayoutNameFactory<Definitions, Pattern> {
  const defaults = Object.fromEntries(
    Object.keys(definitions).map((key) => [key, ''])
  );
  function name<
    const Parts extends LayoutNamePartValues<Definitions> = {}
  >(
    parts?:
      | NamingPartsInput<Definitions, Parts>
      | NamingPartsCallback<Definitions, Parts>
  ): LayoutNameResolver<Pattern, ResolvedParts<Definitions, Parts>> {
    const resolver = ((context: LayoutNameContext) => {
      const values =
        typeof parts === 'function'
          ? parts(context as unknown as PatternNameContext)
          : parts;
      const supplied = Object.fromEntries(
        Object.entries(values ?? {}).filter(
          ([, value]) => value !== undefined
        )
      );
      return pattern(
        context as unknown as PatternNameContext,
        {
          ...defaults,
          ...supplied
        } as PatternParts<Definitions>
      );
    }) as unknown as LayoutNameResolver<
      Pattern,
      ResolvedParts<Definitions, Parts>
    >;
    Object.defineProperty(resolver, layoutNamePattern, { value: {} });
    return resolver;
  }
  return name;
}

/**
 * Defines a reusable layout naming convention that preserves resource-specific
 * literal names in TypeScript. Define the pattern once, then supply optional
 * part values wherever the convention is used.
 *
 * Omit `name` entirely when the generated name, such as `UsersLayout`, is enough.
 * Use this helper when several layouts share a naming rule or need variations
 * while retaining exact component `displayName` types.
 *
 * Choose the form that matches the values your convention needs:
 *
 * - `defineLayoutName(pattern)` provides the string parts `prefix`,
 *   `beforeSuffix`, and `append` for common naming variations.
 * - `defineLayoutName.defineParts(...names).namingFn(pattern)` provides custom
 *   string parts when domain-specific names make the pattern clearer.
 * - `defineLayoutName.defineParts(schema).namingFn(pattern)` declares each
 *   part as `'string'` or `'number'` when supplied values need different types.
 *
 * The pattern controls where parts appear; their names do not impose an order.
 * Part values are optional and omitted values render as empty text. Supply an
 * object for fixed values, or a callback when values depend on the resource.
 * Numeric placeholders can also be empty text inside the pattern. Narrow them
 * with `typeof value === 'number'` before using number-only methods.
 * Each returned naming resolver can be passed to a factory, definition, or
 * component creation call through its `name` option.
 *
 * @param pattern - Combines the resource, capitalization helper, and part
 * placeholders into the shared name structure.
 * @returns A function accepting optional part values or a context callback.
 * Calling it with no arguments leaves every part empty.
 *
 * @example
 * Use the default string parts for a shared convention with occasional variants.
 * ```tsx
 * const layoutName = defineLayoutName(({ resource, capitalize }, parts) =>
 *   `${parts.prefix}${capitalize(resource)}${parts.beforeSuffix}Layout${parts.append}`,
 * );
 * const factory = createDefinedResourceLayout({
 *   resources: ['users'],
 *   name: layoutName(),
 * });
 * const { createResourceLayout } = factory.defineResourceLayout({
 *   render: () => <div />,
 * });
 * const Users = createResourceLayout({ resource: 'users' });
 * // Users.displayName is typed as 'UsersLayout'.
 * const AdminUsers = createResourceLayout({
 *   resource: 'users',
 *   name: layoutName({ prefix: 'Admin', beforeSuffix: 'Detail' }),
 * });
 * // AdminUsers.displayName is typed as 'AdminUsersDetailLayout'.
 * ```
 *
 * @example
 * Declare custom string parts when their names describe your application's
 * conventions more clearly than prefix, beforeSuffix, and append.
 * ```ts
 * const pageName = defineLayoutName
 *   .defineParts('section', 'variant')
 *   .namingFn(({ resource, capitalize }, parts) =>
 *     `${parts.section}${capitalize(resource)}${parts.variant}Page`,
 *   );
 * const adminPage = pageName({ section: 'Admin', variant: 'Detail' });
 * // Used for 'users', this produces 'AdminUsersDetailPage'.
 * const resourcePage = pageName(({ resource }) => ({
 *   section: resource === 'users' ? 'Admin' : 'Public',
 * }));
 * // Used for 'users', this produces 'AdminUsersPage'.
 * // Other resources receive the 'Public' section instead.
 * ```
 *
 * @example
 * Use a schema when a part should accept a number instead of a string.
 * Supplied keys are suggested by the editor and checked against the schema.
 * ```ts
 * const versionedName = defineLayoutName
 *   .defineParts({ section: 'string', version: 'number' })
 *   .namingFn(({ resource, capitalize }, parts) =>
 *     `${parts.section}${capitalize(resource)}V${parts.version}`,
 *   );
 * const adminV2 = versionedName({ section: 'Admin', version: 2 });
 * // Used for 'users', this produces 'AdminUsersV2'.
 * // versionedName({ version: '2' }) is rejected: version must be a number.
 * ```
 *
 * @example
 * Guard optional numeric values before formatting them with number methods.
 * Plain interpolation, as above, already handles empty values.
 * ```ts
 * const formattedName = defineLayoutName
 *   .defineParts({ version: 'number' })
 *   .namingFn(({ resource, capitalize }, parts) => {
 *     const version = typeof parts.version === 'number'
 *       ? parts.version.toFixed(0)
 *       : '';
 *     return `${capitalize(resource)}V${version}`;
 *   });
 * ```
 */
export function defineLayoutName<const Pattern extends string>(
  pattern: NamingPattern<typeof defaultPartDefinitions, Pattern>
): LayoutNameFactory<typeof defaultPartDefinitions, Pattern> {
  return createNamingFactory(defaultPartDefinitions, pattern);
}

/**
 * Declares string placeholders from their names.
 * Call namingFn on the result to define how those slots form a layout name.
 */
function defineParts<const Keys extends readonly string[]>(
  ...keys: Keys
): DefinedLayoutNameParts<{ [Key in Keys[number]]: 'string' }>;
/**
 * Declares placeholders with string or number values from a part schema.
 * Call namingFn on the result to define how those slots form a layout name.
 */
function defineParts<const Definitions extends LayoutNamePartDefinitions>(
  definitions: Definitions
): DefinedLayoutNameParts<Definitions>;
function defineParts(
  ...input: string[] | [LayoutNamePartDefinitions]
): DefinedLayoutNameParts<LayoutNamePartDefinitions> {
  const definitions =
    typeof input[0] === 'object'
      ? input[0]
      : Object.fromEntries(input.map((key) => [key, 'string']));
  return {
    namingFn(pattern) {
      return createNamingFactory(definitions, pattern);
    }
  };
}

defineLayoutName.defineParts = defineParts;

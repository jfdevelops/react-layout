import { capitalize } from '../utils/capitalize';
/** Literal placeholders allow a naming convention to retain resource-specific names. */
declare const resourceNameToken: unique symbol;
type ResourceToken = string & { readonly [resourceNameToken]: true };
type CapitalizedToken = 'LayoutCapitalizedResourceToken';
type PatternNameContext = Omit<
  LayoutNameContext<ResourceToken>,
  'capitalize'
> & {
  capitalize: <T extends string>(
    value: T
  ) => T extends ResourceToken ? CapitalizedToken : Capitalize<T>;
};
type PrefixToken = '__layout_prefix__';
type BeforeToken = '__layout_before_suffix__';
type AppendToken = '__layout_append__';
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
type PatternParts = {
  prefix: PrefixToken;
  beforeSuffix: BeforeToken;
  append: AppendToken;
};
type Replace<
  S extends string,
  From extends string,
  To extends string
> = S extends `${infer A}${From}${infer B}`
  ? `${A}${To}${Replace<B, From, To>}`
  : S;
type ReplaceResource<
  S extends string,
  Resource extends string
> = S extends `${ResourceToken}${infer Rest}`
  ? `${Resource}${ReplaceResource<Rest, Resource>}`
  : S extends `${infer First}${infer Rest}`
  ? `${First}${ReplaceResource<Rest, Resource>}`
  : S;
type Part<P, K extends keyof LayoutNameParts> = K extends keyof P
  ? Extract<P[K], string>
  : '';
export type ResolveNamePattern<
  Pattern extends string,
  Resource extends string,
  Parts = {}
> = ReplaceResource<
  Replace<
    Replace<
      Replace<
        Replace<Pattern, PrefixToken, Part<Parts, 'prefix'>>,
        BeforeToken,
        Part<Parts, 'beforeSuffix'>
      >,
      AppendToken,
      Part<Parts, 'append'>
    >,
    CapitalizedToken,
    Capitalize<Resource>
  >,
  Resource
>;
export const layoutNamePattern: unique symbol = Symbol('layoutNamePattern');
export interface LayoutNameResolver<
  Pattern extends string = string,
  Parts = {}
> {
  (context: LayoutNameContext): string;
  readonly [layoutNamePattern]: { pattern: Pattern; parts: Parts };
}
export type LayoutNameInput<
  Resource extends string = string,
  States extends string = string,
  Name extends string = string
> = Name | ((context: LayoutNameContext<Resource, States>) => Name);
export type ResolvedLayoutName<
  Naming,
  Resource extends string
> = Naming extends LayoutNameResolver<infer Pattern, infer Parts>
  ? ResolveNamePattern<Pattern, Resource, Parts>
  : Naming extends (...args: any[]) => infer Result
  ? Extract<Result, string>
  : Naming extends string
  ? Naming
  : string;
/** Define the stable structure once; supply optional variations at each call site. */
export function defineLayoutName<const Pattern extends string>(
  pattern: (context: PatternNameContext, parts: PatternParts) => Pattern
) {
  function name<const Parts extends LayoutNameParts = {}>(
    parts?: Parts | ((context: PatternNameContext) => Parts)
  ): LayoutNameResolver<Pattern, Parts> {
    const resolver = ((context: LayoutNameContext) =>
      pattern(
        context as unknown as PatternNameContext,
        {
          prefix: '',
          beforeSuffix: '',
          append: '',
          ...(typeof parts === 'function'
            ? parts(context as unknown as PatternNameContext)
            : parts),
        } as PatternParts
      )) as unknown as LayoutNameResolver<Pattern, Parts>;
    Object.defineProperty(resolver, layoutNamePattern, { value: {} });
    return resolver;
  }
  return name;
}

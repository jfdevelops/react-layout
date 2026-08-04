import type { LayoutResourceKey, ResourceDefinition } from '../../resource';

export type CapitalizedResource<Resource extends string> = Resource extends Resource
  ? {
      toLowerCase: () => Lowercase<Capitalize<Resource>>;
    } & Capitalize<Resource>
  : never;

export type ResourceLayoutName<
  Resource extends string,
  Name extends string = string,
> = Name | ((resource: CapitalizedResource<Resource>) => Name);

export type ResourceLayoutNames<
  Resource extends string,
  CallbackName extends string = string,
> = {
  [TargetResource in Resource]?:
    | string
    | ((resource: CapitalizedResource<TargetResource>) => CallbackName);
};

export type AtLeastOneResourceLayoutNameKey<Resource extends string> = {
  [TargetResource in Resource]: Record<TargetResource, unknown> &
    Partial<Record<Exclude<Resource, TargetResource>, unknown>>;
}[Resource];

export type SelectedResourceLayoutNames<
  Resource extends string,
  SelectedResource extends Resource,
  CallbackName extends string,
> = {
  [TargetResource in Resource as TargetResource extends SelectedResource
    ? TargetResource
    : never]?:
    | string
    | ((resource: CapitalizedResource<TargetResource>) => CallbackName);
};

export type ResourcesLayoutName<Resource extends string> =
  | Exclude<ResourceLayoutName<Resource>, string>
  | ResourceLayoutNames<Resource>;

export type ResourceLayoutSelection<
  Resources extends ReadonlyArray<ResourceDefinition>,
  CallbackName extends string = string,
> = {
  [Resource in LayoutResourceKey<Resources>]?: {
    name?: string | ((resource: CapitalizedResource<Resource>) => CallbackName);
  };
};

export type AtLeastOneResourceLayoutSelection<
  Resources extends ReadonlyArray<ResourceDefinition>,
  CallbackName extends string,
> = {
  [Resource in LayoutResourceKey<Resources>]: Required<
    Pick<ResourceLayoutSelection<Resources, CallbackName>, Resource>
  > &
    Omit<ResourceLayoutSelection<Resources, CallbackName>, Resource>;
}[LayoutResourceKey<Resources>];

export type SelectedLayoutResources<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Arguments extends ReadonlyArray<unknown>,
> =
  Arguments extends ReadonlyArray<LayoutResourceKey<Resources>>
    ? Arguments[number]
    : Arguments[0] extends {
          resources: ReadonlyArray<infer Resource>;
        }
      ? Resource & LayoutResourceKey<Resources>
      : keyof Arguments[0] & LayoutResourceKey<Resources>;

export type ResolveResourceLayoutName<Name> = Name extends (
  ...args: never[]
) => infer Result
  ? Result & string
  : Name extends string
    ? Name
    : string;

export type NormalizeCapitalizedResourceName<
  Name extends string,
  Resource extends string,
> = Name extends Name
  ? NormalizeCapitalizedResourceNameMatch<Name, Resource> extends infer Match
    ? [Match] extends [never]
      ? Name
      : Match
    : never
  : never;

export type NormalizeCapitalizedResourceNameMatch<
  Name extends string,
  Resource extends string,
> = Resource extends Resource
  ? Name extends `${CapitalizedResource<Resource>}${infer Suffix}`
    ? `${Capitalize<Resource>}${Suffix}`
    : never
  : never;

export type SelectedResourceLayoutName<Arguments, Resource extends string> =
  Arguments extends ReadonlyArray<string>
    ? string
    : Arguments extends readonly [infer Options]
      ? Options extends {
          resources: ReadonlyArray<string>;
          name?: infer Name;
        }
        ? Name extends (...args: never[]) => unknown
          ? ResolveResourceLayoutName<Name>
          : Name extends Record<Resource, infer ResourceName>
            ? ResolveResourceLayoutName<ResourceName>
            : string
        : Options extends Record<Resource, infer ResourceOptions>
          ? ResourceOptions extends { name?: infer Name }
            ? ResolveResourceLayoutName<Name>
            : string
          : string
      : string;

export type NormalizeResourceLayoutNames<Names, CallbackName extends string> = {
  [Resource in keyof Names]: Names[Resource] extends (
    ...args: never[]
  ) => unknown
    ? (
        resource: CapitalizedResource<Resource & string>,
      ) => NormalizeCapitalizedResourceName<CallbackName, Resource & string>
    : Names[Resource];
};

export type NormalizeResourceLayoutSelection<Selection> = {
  [Resource in keyof Selection]: Selection[Resource] extends {
    name: infer Name;
  }
    ? {
        name: Name extends (...args: never[]) => unknown
          ? (
              resource: CapitalizedResource<Resource & string>,
            ) => NormalizeCapitalizedResourceName<
              ResolveResourceLayoutName<Name>,
              Resource & string
            >
          : Name;
      }
    : Selection[Resource];
};

export type SharedResourceLayoutArguments<
  Resources extends ReadonlyArray<ResourceDefinition>,
  ResourceKeys extends ReadonlyArray<LayoutResourceKey<Resources>>,
  Name extends string,
> = readonly [
  {
    resources: ResourceKeys;
    name: (
      resource: CapitalizedResource<ResourceKeys[number]>,
    ) => NormalizeCapitalizedResourceName<Name, ResourceKeys[number]>;
  },
];

export type MappedResourceLayoutArguments<
  Resources extends ReadonlyArray<ResourceDefinition>,
  ResourceKeys extends ReadonlyArray<LayoutResourceKey<Resources>>,
  Names,
  CallbackName extends string,
> = readonly [
  {
    resources: ResourceKeys;
    name: NormalizeResourceLayoutNames<Names, CallbackName>;
  },
];

export type SelectedResourceLayoutArguments<Selection> = readonly [
  NormalizeResourceLayoutSelection<Selection>,
];

export type HasResourceLayoutName<Arguments, Resource extends string> =
  Arguments extends ReadonlyArray<string>
    ? false
    : Arguments extends readonly [infer Options]
      ? Options extends {
          resources: ReadonlyArray<string>;
          name: infer Name;
        }
        ? Name extends (...args: never[]) => unknown
          ? true
          : Name extends Record<Resource, unknown>
            ? true
            : false
        : Options extends Record<Resource, infer ResourceOptions>
          ? 'name' extends keyof ResourceOptions
            ? true
            : false
          : false
      : false;

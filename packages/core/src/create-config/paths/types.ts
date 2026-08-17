import type { JSX } from 'react';
import type {
  LayoutResourceKey,
  ResourceDefinition,
  ResourceDefinitionForKey,
  SubResourceDefinitionsFor,
  SubResourceParamForResource,
} from '../../resource';
import type { Show } from '../../utils';
import type {
  BaseResourceConfigComponents,
  ResourceConfigComponentKey,
  SharedResourceConfigOptions,
} from '../types';
import type {
  ComponentPathVariable,
  ExtractPathVariables,
  PathHead,
  PathTail,
  ResourcePathVariable,
  SubResourcePathVariable,
} from './variables';

/** Recursion cap for path types. Must stay aligned with `MAX_PATH_DEPTH` in `./generate`. */
type MaxPathDepth = 6;

type ComponentSlotKey = keyof BaseResourceConfigComponents;
type SharedBranchKey = keyof SharedResourceConfigOptions;

/** A component slot segment: a fixed slot key, or the `$component` variable. */
type ComponentSegment = ComponentSlotKey | ComponentPathVariable;

/**
 * Path tail selecting a component on the current node: a slot, a shared branch, or a
 * slot inside a shared branch (`detail.errorComponent`, `new.$component`, …).
 */
type ComponentTailPath =
  | ComponentSegment
  | SharedBranchKey
  | `${SharedBranchKey}.${ComponentSegment}`;

type NestedSubResourceDefinitions<Def extends ResourceDefinition> = Def extends {
  subResources: infer Nested extends ReadonlyArray<ResourceDefinition>;
}
  ? Nested
  : readonly [];

type SubResourceTailPaths<
  SubDefs extends ReadonlyArray<ResourceDefinition>,
  DepthAcc extends readonly unknown[],
> =
  LayoutResourceKey<SubDefs> extends infer Key extends string
    ? Key extends LayoutResourceKey<SubDefs>
      ?
          | Key
          | `${Key}.${ParameterizedEntryPath<
              NestedSubResourceDefinitions<
                ResourceDefinitionForKey<SubDefs, Key>
              >,
              readonly [...DepthAcc, unknown]
            >}`
      : never
    : never;

/**
 * Every path tail valid below one config node: component slots, declared sub-resource
 * slugs, or a single `$subResource` variable. One `$subResource` segment stands for the
 * whole remaining sub-resource chain, since its value may be `{ value, subResource }`.
 */
export type ParameterizedEntryPath<
  SubDefs extends ReadonlyArray<ResourceDefinition>,
  DepthAcc extends readonly unknown[] = readonly [],
> =
  | ComponentTailPath
  | ([SubDefs] extends [readonly []]
      ? never
      : DepthAcc['length'] extends MaxPathDepth
        ? never
        :
            | SubResourceTailPaths<SubDefs, DepthAcc>
            | SubResourcePathVariable
            | `${SubResourcePathVariable}.${ComponentTailPath}`);

type ParameterizedEntryPathForResource<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends LayoutResourceKey<Resources>,
> = ParameterizedEntryPath<SubResourceDefinitionsFor<Resources, Resource>>;

type AnyParameterizedEntryPath<
  Resources extends ReadonlyArray<ResourceDefinition>,
> =
  LayoutResourceKey<Resources> extends infer Resource
    ? Resource extends LayoutResourceKey<Resources>
      ? ParameterizedEntryPathForResource<Resources, Resource>
      : never
    : never;

/**
 * Paths accepted by `forPaths` and `createGetComponent`. Segments whose value depends on
 * the config collapse into variables (`$resource`, `$subResource`, `$component`), and the
 * fixed slots stay literal, so `'$resource.detail.$component'` leaves `resource` and
 * `component` to the call site.
 */
export type ParameterizedResourcePath<
  Resources extends ReadonlyArray<ResourceDefinition>,
> =
  | LayoutResourceKey<Resources>
  | ResourcePathVariable
  | (LayoutResourceKey<Resources> extends infer Resource
      ? Resource extends LayoutResourceKey<Resources>
        ? `${Resource}.${ParameterizedEntryPathForResource<Resources, Resource>}`
        : never
      : never)
  | `${ResourcePathVariable}.${AnyParameterizedEntryPath<Resources>}`;

type ConfigNodeOf<Node> = NonNullable<Node>;

/**
 * Element slots configured on a node (`component`, `errorComponent`, …). `detail` and
 * `new` are path segments, not `$component` values.
 */
type ComponentKeysAtNode<Node> =
  ConfigNodeOf<Node> extends JSX.Element
    ? never
    : Extract<keyof ConfigNodeOf<Node>, ComponentSlotKey>;

/** Sub-resource keys configured on a node: every key that is not a component slot. */
type SubResourceKeysAtNode<Node> =
  ConfigNodeOf<Node> extends JSX.Element
    ? never
    : Exclude<keyof ConfigNodeOf<Node>, ResourceConfigComponentKey>;

type IndexNode<Node, Key> = Key extends keyof ConfigNodeOf<Node>
  ? NonNullable<ConfigNodeOf<Node>[Key]>
  : never;

type ComponentKeysAtNodes<Node> = Node extends unknown
  ? ComponentKeysAtNode<Node>
  : never;

/** Sub-resource keys on a node and on every node below it, matching nested params. */
type SubResourceKeysBelowNode<
  Node,
  DepthAcc extends readonly unknown[] = readonly [],
> = DepthAcc['length'] extends MaxPathDepth
  ? never
  : SubResourceKeysAtNode<Node> extends infer Key
    ? Key extends SubResourceKeysAtNode<Node>
      ?
          | Key
          | SubResourceKeysBelowNode<
              IndexNode<Node, Key>,
              readonly [...DepthAcc, unknown]
            >
      : never
    : never;

/** Every node reachable below `Node`, used when a `$subResource` value is not yet known. */
type AnySubResourceNode<
  Node,
  DepthAcc extends readonly unknown[] = readonly [],
> = DepthAcc['length'] extends MaxPathDepth
  ? never
  : SubResourceKeysAtNode<Node> extends infer Key
    ? Key extends SubResourceKeysAtNode<Node>
      ?
          | IndexNode<Node, Key>
          | AnySubResourceNode<
              IndexNode<Node, Key>,
              readonly [...DepthAcc, unknown]
            >
      : never
    : never;

type ResolveConfigNodeSegment<Node, Segment extends string> = Node extends unknown
  ? Segment extends SubResourcePathVariable
    ? AnySubResourceNode<Node>
    : Segment extends ComponentPathVariable
      ? IndexNode<Node, ComponentKeysAtNode<Node>>
      : IndexNode<Node, Segment>
  : never;

/**
 * Walks `Path` on a config node. Open variables resolve to every value they could take,
 * so `never` means the path cannot exist on that node.
 */
export type ResolveConfigNode<Node, Path extends string> = [Node] extends [never]
  ? never
  : Path extends ''
    ? Node
    : Path extends `${infer Head}.${infer Rest}`
      ? ResolveConfigNode<ResolveConfigNodeSegment<Node, Head>, Rest>
      : ResolveConfigNodeSegment<Node, Path>;

/** Resource keys present in a created config, falling back to every declared resource. */
export type ConfigResourceKeys<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
> = [Extract<LayoutResourceKey<Resources>, keyof Config>] extends [never]
  ? LayoutResourceKey<Resources>
  : Extract<LayoutResourceKey<Resources>, keyof Config>;

type ResourceNode<Config, Resource> = Resource extends keyof Config
  ? NonNullable<Config[Resource]>
  : never;

/**
 * Resources a path can target: for `$resource` paths, only those whose config satisfies
 * the path's fixed segments, so `'$resource.detail.$component'` excludes resources
 * without a `detail`.
 */
export type PathResourceCandidates<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Path extends string,
> =
  PathHead<Path> extends ResourcePathVariable
    ? ConfigResourceKeys<Resources, Config> extends infer Resource
      ? Resource extends ConfigResourceKeys<Resources, Config>
        ? [
            ResolveConfigNode<
              ResourceNode<Config, Resource>,
              PathTail<Path>
            >,
          ] extends [never]
          ? never
          : Resource
        : never
      : never
    : Extract<PathHead<Path>, ConfigResourceKeys<Resources, Config>>;

type StripTrailingComponentVariable<Path extends string> =
  Path extends ComponentPathVariable
    ? ''
    : Path extends `${infer Head}.${ComponentPathVariable}`
      ? Head
      : Path;

/** Component slot keys configured on the node a path resolves to. */
export type PathComponentKeys<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Path extends string,
> =
  PathResourceCandidates<Resources, Config, Path> extends infer Resource
    ? Resource extends PathResourceCandidates<Resources, Config, Path>
      ? ComponentKeysAtNodes<
          ResolveConfigNode<
            ResourceNode<Config, Resource>,
            StripTrailingComponentVariable<PathTail<Path>>
          >
        >
      : never
    : never;

/** Sub-resource keys valid for the `$subResource` segment of a path. */
export type PathSubResourceKeys<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Path extends string,
> =
  PathResourceCandidates<Resources, Config, Path> extends infer Resource
    ? Resource extends PathResourceCandidates<Resources, Config, Path>
      ? SubResourceKeysBelowNode<ResourceNode<Config, Resource>>
      : never
    : never;

/** Sub-resource keys configured for one resource, at any depth. */
export type ResourceSubResourceKeys<Config, Resource> =
  SubResourceKeysBelowNode<ResourceNode<Config, Resource>>;

/** Every sub-resource key configured anywhere in a config map. */
export type ConfigSubResourceKeys<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
> =
  ConfigResourceKeys<Resources, Config> extends infer Resource
    ? Resource extends ConfigResourceKeys<Resources, Config>
      ? ResourceSubResourceKeys<Config, Resource>
      : never
    : never;

type ComponentKeysForPath<Config, Resource, Tail extends string> =
  ComponentKeysAtNodes<
    ResolveConfigNode<
      ResourceNode<Config, Resource>,
      StripTrailingComponentVariable<Tail>
    >
  > extends infer Keys
    ? [Keys] extends [never]
      ? ComponentSlotKey
      : Keys
    : ComponentSlotKey;

/** Params a path requires for one target resource. */
export type PathVariablesForResource<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Path extends string,
  Resource extends LayoutResourceKey<Resources>,
> = Show<
  ('resource' extends ExtractPathVariables<Path>
    ? { resource: Resource }
    : {}) &
    ('subResource' extends ExtractPathVariables<Path>
      ? { subResource: SubResourceParamForResource<Resources, Resource> }
      : {}) &
    ('component' extends ExtractPathVariables<Path>
      ? { component: ComponentKeysForPath<Config, Resource, PathTail<Path>> }
      : {})
>;

/**
 * Params a path requires, as one object per resource the path can target. A path with no
 * variables resolves to `{}`.
 */
export type PathVariables<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Path extends string,
> =
  PathResourceCandidates<Resources, Config, Path> extends infer Resource
    ? Resource extends LayoutResourceKey<Resources>
      ? PathVariablesForResource<Resources, Config, Path, Resource>
      : never
    : never;

type VariableValue<Variables, Name extends string> = Name extends keyof Variables
  ? Variables[Name]
  : never;

type ResolveSubResourceParamNode<
  Node,
  Param,
  DepthAcc extends readonly unknown[] = readonly [],
> = DepthAcc['length'] extends MaxPathDepth
  ? never
  : Param extends string
    ? IndexNode<Node, Param>
    : Param extends {
          value: infer Value extends string;
          subResource: infer Nested;
        }
      ? ResolveSubResourceParamNode<
          IndexNode<Node, Value>,
          Nested,
          readonly [...DepthAcc, unknown]
        >
      : never;

type ResolveNodeSegmentWithVariables<
  Node,
  Segment extends string,
  Variables,
> = Node extends unknown
  ? Segment extends SubResourcePathVariable
    ? ResolveSubResourceParamNode<Node, VariableValue<Variables, 'subResource'>>
    : Segment extends ComponentPathVariable
      ? IndexNode<Node, Extract<VariableValue<Variables, 'component'>, string>>
      : IndexNode<Node, Segment>
  : never;

type ResolveNodeWithVariables<
  Node,
  Path extends string,
  Variables,
> = [Node] extends [never]
  ? never
  : Path extends ''
    ? Node
    : Path extends `${infer Head}.${infer Rest}`
      ? ResolveNodeWithVariables<
          ResolveNodeSegmentWithVariables<Node, Head, Variables>,
          Rest,
          Variables
        >
      : ResolveNodeSegmentWithVariables<Node, Path, Variables>;

/**
 * Config value a path resolves to once its variables are supplied. Object nodes come back
 * with a `getComponent` helper attached at runtime; component slots resolve to the element.
 */
export type ResolveParameterizedPathValue<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Path extends string,
  Variables,
> = Variables extends unknown
  ? ResolveNodeWithVariables<
      PathHead<Path> extends ResourcePathVariable
        ? ResourceNode<
            Config,
            Extract<
              VariableValue<Variables, 'resource'>,
              LayoutResourceKey<Resources>
            >
          >
        : ResourceNode<Config, PathHead<Path>>,
      PathTail<Path>,
      Variables
    >
  : never;

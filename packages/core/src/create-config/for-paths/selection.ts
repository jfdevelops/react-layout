import type { JSX } from 'react';
import type { ResourceDefinition } from '../../resource';
import type { KeysOfUnion, ValueOfKeyInUnion } from '../../utils';
import {
  isConfigNode,
  RESOURCE_CONFIG_COMPONENT_KEYS,
  COMPONENT_SLOT_KEYS,
  type ComponentSlotKey,
} from '../component-keys';
import type {
  ExtractPathVariables,
  PathResourceCandidates,
  PathComponentKeys,
  PathVariables,
  ResolveParameterizedPathValue,
} from '../paths';

type BranchKeys<Node> = {
  [Key in KeysOfUnion<Node> & string]: NonNullable<
    ValueOfKeyInUnion<Node, Key>
  > extends JSX.Element
    ? never
    : NonNullable<ValueOfKeyInUnion<Node, Key>> extends object
      ? Key
      : never;
}[KeysOfUnion<Node> & string];

type TreePick<
  Node,
  Depth extends unknown[] = [],
  Excluded extends PropertyKey = never,
> = Depth['length'] extends 6
  ? never
  : {
      [Key in Exclude<BranchKeys<Node>, Excluded>]?:
        | true
        | (Exclude<
            BranchKeys<ValueOfKeyInUnion<Node, Key>>,
            Excluded
          > extends never
            ? never
            : TreePick<
                ValueOfKeyInUnion<Node, Key>,
                [...Depth, unknown],
                Excluded
              >);
    };

type VariableParentNodes<
  Resources extends readonly ResourceDefinition[],
  Config,
  Path extends string,
  Variable extends 'subResource' | 'component' = 'subResource',
> = Path extends `${infer Prefix}.${Variable extends 'subResource' ? '$subResource' : '$component'}${string}`
  ? ResolveParameterizedPathValue<
      Resources,
      Config,
      Prefix,
      PathVariables<Resources, Config, Prefix>
    >
  : never;

type SubResourceKeys<Node> = Exclude<
  BranchKeys<Node>,
  (typeof RESOURCE_CONFIG_COMPONENT_KEYS)[number]
>;
type SubResourceValues<
  Node,
  Depth extends unknown[] = [],
> = Depth['length'] extends 6
  ? never
  : {
      [Key in SubResourceKeys<Node>]:
        | (Extract<
            KeysOfUnion<ValueOfKeyInUnion<Node, Key>>,
            ComponentSlotKey
          > extends never
            ? never
            : Key)
        | (SubResourceKeys<ValueOfKeyInUnion<Node, Key>> extends never
            ? never
            : {
                value: Key;
                subResource: SubResourceValues<
                  ValueOfKeyInUnion<Node, Key>,
                  [...Depth, unknown]
                >;
              });
    }[SubResourceKeys<Node>];

/** Uses the actual parent of each sub-resource variable, including fixed prefixes. */
export type PathParamVariables<
  Resources extends readonly ResourceDefinition[],
  Config,
  Path extends string,
  Variables = PathVariables<Resources, Config, Path>,
> = Variables extends unknown
  ? {
      [Key in keyof Variables]: Key extends 'subResource'
        ? SubResourceValues<VariableParentNodes<Resources, Config, Path>>
        : Variables[Key];
    }
  : never;

/** Available values for each path variable, with nested selections on resource branches. */
export type PathParamPick<
  Resources extends readonly ResourceDefinition[],
  Config,
  Path extends string,
> = {
  [Name in ExtractPathVariables<Path>]?: Name extends 'resource'
    ?
        | true
        | TreePick<
            Pick<
              Config,
              Extract<
                PathResourceCandidates<Resources, Config, Path>,
                keyof Config
              >
            >
          >
    : Name extends 'subResource'
      ?
          | true
          | TreePick<
              VariableParentNodes<Resources, Config, Path>,
              [],
              (typeof RESOURCE_CONFIG_COMPONENT_KEYS)[number]
            >
      :
          | true
          | Partial<Record<PathComponentKeys<Resources, Config, Path>, true>>;
};

/** Generic runtime shape; public call sites substitute their actual resource tree. */
export type PathPickTree = { [key: string]: true | PathPickTree };
export type PathPick = Partial<
  Record<'resource' | 'subResource' | 'component', true | PathPickTree>
>;

/** Checks every level, including extra keys on variables supplied by reference. */
export type CheckedPathPick<Given, Available> = Given extends object
  ? {
      [Key in keyof Given]: Key extends keyof Available
        ? Given[Key] extends true
          ? true
          : CheckedPathPick<
              Given[Key],
              Exclude<Available[Key], true | undefined>
            >
        : never;
    }
  : never;

type ProjectTree<Node, Selection> = Selection extends true
  ? Node
  : {
      [Key in keyof Node & keyof Selection]: ProjectTree<
        Node[Key],
        Selection[Key]
      >;
    };

type PickSelection<Options> = Options extends {
  include: { path: { pick: infer Pick } };
}
  ? Pick
  : {};
type ResourceProjection<Config, Pick> = Pick extends {
  resource: infer Selection extends object;
}
  ? ProjectTree<Config, Selection>
  : Config;
type ProjectSubTree<
  Node,
  Selection,
  Depth extends unknown[] = [],
> = Depth['length'] extends 6
  ? {}
  : {
      [
        Key in SubResourceKeys<Node> as keyof (Key extends keyof Selection
          ? ProjectTree<ValueOfKeyInUnion<Node, Key>, Selection[Key]>
          : ProjectSubTree<
              ValueOfKeyInUnion<Node, Key>,
              Selection,
              [...Depth, unknown]
            >) extends never
          ? never
          : Key
      ]: Key extends keyof Selection
        ? ProjectTree<ValueOfKeyInUnion<Node, Key>, Selection[Key]>
        : ProjectSubTree<
            ValueOfKeyInUnion<Node, Key>,
            Selection,
            [...Depth, unknown]
          >;
    };
type SubResourceProjection<Config, Pick> = Pick extends {
  subResource: infer Selection extends object;
}
  ? { [Key in keyof Config]: ProjectSubTree<Config[Key], Selection> }
  : Config;

type ProjectComponents<
  Node,
  Selection,
  Depth extends unknown[] = [],
> = Depth['length'] extends 6
  ? Node
  : Node extends JSX.Element
    ? Node
    : {
        [
          Key in keyof Node as Key extends ComponentSlotKey
            ? Key extends keyof Selection
              ? Key
              : never
            : Key
        ]: Key extends ComponentSlotKey
          ? ProjectTree<Node[Key], Selection[Key & keyof Selection]>
          : ProjectComponents<Node[Key], Selection, [...Depth, unknown]>;
      };
type ComponentProjection<Config, Pick> = Pick extends {
  component: infer Selection extends object;
}
  ? ProjectComponents<Config, Selection>
  : Config;

/** Resource config projected by nested value selections; unselected parent pages are omitted. */
export type SelectedPathConfig<Config, Options> = ComponentProjection<
  SubResourceProjection<
    ResourceProjection<Config, PickSelection<Options>>,
    PickSelection<Options>
  >,
  PickSelection<Options>
>;

/** Available path patterns whose target page remains in the selection. */
export type SelectedPaths<
  Resources extends readonly ResourceDefinition[],
  Config,
  Path extends string,
  Options,
> =
  PickSelection<Options> extends { resource: object } | { subResource: object }
    ? Path extends unknown
      ? Extract<
          PathComponentKeys<
            Resources,
            SelectedPathConfig<Config, Options>,
            Path
          >,
          ComponentSlotKey
        > extends never
        ? never
        : Path
      : never
    : Path;

/** Resource and component strings narrow by key; sub-resource arguments follow the projected tree. */
export type SelectedVariableValue<Value, Selection, Name> =
  Selection extends true
    ? Value
    : Name extends 'subResource'
      ? Value
      : Extract<Value, keyof Selection>;

function projectTree(
  node: Record<string, unknown>,
  selection: PathPickTree,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, selected] of Object.entries(selection)) {
    const value = node[key];

    if (selected === true && value !== undefined) {
      result[key] = value;
    } else if (
      selected !== true &&
      isConfigNode(value) &&
      isConfigNode(selected)
    ) {
      result[key] = projectTree(value, selected);
    }
  }

  return result;
}

function projectSubTree(
  node: Record<string, unknown>,
  selection: PathPickTree,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(node)) {
    if (
      !isConfigNode(value) ||
      RESOURCE_CONFIG_COMPONENT_KEYS.some((reserved) => reserved === key)
    ) {
      continue;
    }

    const selected = selection[key];
    const child =
      selected === true
        ? value
        : selected === undefined
          ? projectSubTree(value, selection)
          : projectTree(value, selected);

    if (Object.keys(child).length > 0) {
      result[key] = child;
    }
  }

  return result;
}

function projectComponents(
  node: Record<string, unknown>,
  selection: PathPickTree,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(node)) {
    if (COMPONENT_SLOT_KEYS.some((reserved) => reserved === key)) {
      const selected = selection[key];

      if (selected === true) {
        result[key] = value;
      } else if (selected !== undefined && isConfigNode(value)) {
        result[key] = projectTree(value, selected);
      }
    } else if (isConfigNode(value)) {
      result[key] = projectComponents(value, selection);
    }
  }

  return result;
}

/** Applies the same nested resource selection used by inference to runtime lookups. */
export function selectPathConfig(
  config: Record<string, unknown>,
  pick?: PathPick,
) {
  const resource = pick?.resource;
  const subResource = pick?.subResource;
  let selected =
    typeof resource === 'object' ? projectTree(config, resource) : config;

  if (typeof subResource === 'object') {
    selected = Object.fromEntries(
      Object.entries(selected).map(([key, node]) => [
        key,
        isConfigNode(node) ? projectSubTree(node, subResource) : node,
      ]),
    );
  }

  return typeof pick?.component === 'object'
    ? projectComponents(selected, pick.component)
    : selected;
}

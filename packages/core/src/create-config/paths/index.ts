export {
  generateResourceConfigPaths,
  MAX_PATH_DEPTH,
} from './generate';
export {
  collectAllSubResourceKeys,
  collectConfigResources,
  collectDescendantNodes,
  collectPathComponentKeys,
  collectPathResources,
  collectPathSubResourceKeys,
  collectResourceSubResourceKeys,
  collectSubResourceKeysBelow,
  pathExistsOnNode,
} from './introspect';
export { flattenSubResourceParam, resolveParameterizedPath } from './resolve';
export type { PathVariableValues, SubResourceParamValue } from './resolve';
export type {
  ConfigResourceKeys,
  ConfigSubResourceKeys,
  ParameterizedEntryPath,
  ParameterizedResourcePath,
  PathComponentKeys,
  PathResourceCandidates,
  PathSubResourceKeys,
  PathVariables,
  PathVariablesForResource,
  ResolveConfigNode,
  ResolveParameterizedPathValue,
  ResourceSubResourceKeys,
} from './types';
export {
  createPathVariable,
  extractPathVariables,
  isPathVariableSegment,
  PATH_VARIABLE_IDENTIFIER,
  pathHasVariables,
  readPathVariableName,
} from './variables';
export type {
  ComponentPathVariable,
  ExtractPathVariables,
  PathHasVariables,
  PathHead,
  PathTail,
  PathVariable,
  PathVariableIdentifier,
  PathVariableName,
  RemovePathVariableIdentifier,
  ResourcePathVariable,
  SubResourcePathVariable,
} from './variables';

import {
  createElement,
  isValidElement,
  type ComponentType,
  type JSX,
  type ReactNode,
} from 'react';

/**
 * Names a scoped component cannot use. Scoped components are attached to
 * function objects, so they collide with the component's own statics and with
 * non-writable `Function.prototype` properties. `__proto__` is reserved so
 * assignment cannot hit the prototype setter on a normal object.
 */
export const reservedScopedComponentNames = new Set([
  '__proto__',
  'apply',
  'arguments',
  'bind',
  'call',
  'caller',
  'displayName',
  'length',
  'name',
  'props',
  'prototype',
  'resource',
]);

/**
 * Values a createComponent / scoped-component `render` may return.
 *
 * Alongside rendered nodes, a component type is allowed — the type constituent
 * of a React element — so factories like `createDataTable(columns)` can be
 * returned directly and mounted with the call-site props.
 *
 * At runtime, `resolveScopedRenderResult` distinguishes component types from
 * nodes (including portals). Getting that wrong mounts a portal via
 * `createElement` and blows up with an invalid-element-type error.
 */
// Returned components declare their own props; a concrete props parameter would
// be contravariant and reject the factories callers actually return.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
export type ScopedRenderResult = ReactNode | ComponentType<any>;

/**
 * `$$typeof` tags for object component wrappers that `createElement` accepts
 * as `type` (forwardRef, memo, lazy).
 *
 * Do not treat "any object with `$$typeof`" as a component: portals also have
 * `$$typeof` (`Symbol.for('react.portal')`) and `isValidElement(portal)` is
 * false, so a naive check would mis-classify them.
 */
const reactForwardRefType = Symbol.for('react.forward_ref');
const reactMemoType = Symbol.for('react.memo');
const reactLazyType = Symbol.for('react.lazy');

/**
 * True when `value` can be passed as the `type` argument to `createElement`.
 *
 * Functions always qualify. Object wrappers qualify only for the forwardRef /
 * memo / lazy tags above — not portals or other React nodes that happen to
 * carry `$$typeof`.
 */
export function isRenderableComponentType(
  value: unknown,
): value is ComponentType<Record<string, unknown>> {
  if (typeof value === 'function') {
    return true;
  }

  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    isValidElement(value) ||
    !('$$typeof' in value)
  ) {
    return false;
  }

  const typeTag = (value as { $$typeof: unknown }).$$typeof;

  return (
    typeTag === reactForwardRefType ||
    typeTag === reactMemoType ||
    typeTag === reactLazyType
  );
}

/**
 * If `render` returned a component type, mount it with `props`; otherwise
 * return the node as-is (elements, portals, null, etc.).
 */
export function resolveScopedRenderResult(
  result: ScopedRenderResult,
  props: Record<string, unknown> = {},
): JSX.Element {
  if (isRenderableComponentType(result)) {
    return createElement(result, props);
  }

  return result as JSX.Element;
}

/**
 * Runtime counterpart of `ScopedComponentCompoundStaticKey` — keys that must
 * not be treated as compound component statics on a scoped wrapper.
 */
const reservedScopedCompoundStaticKeys = new Set<PropertyKey>([
  'apply',
  'arguments',
  'bind',
  'call',
  'caller',
  'childContextTypes',
  'contextTypes',
  'defaultProps',
  'displayName',
  'length',
  'name',
  'propTypes',
  'prototype',
  'toLocaleString',
  'toString',
  'valueOf',
  '$$typeof',
]);

type ScopedComponentWrapper = ((
  props?: Record<string, unknown>,
) => JSX.Element) &
  Record<string, unknown>;

/**
 * Exposes compound statics (e.g. `DataTable.Loading`) on a scoped wrapper so
 * runtime matches `ScopedComponentCompoundStatics`.
 *
 * Why a Proxy: JSX reads `components.DataTable.Loading` while building the
 * element tree — before `DataTable` itself renders — so statics cannot be
 * copied only after the first `render` call. Property access lazily creates a
 * stable wrapper component that re-runs the scoped `render` under context and
 * mounts the matching static from the returned component type.
 */
export function withScopedCompoundStatics(
  wrapper: (props?: Record<string, unknown>) => JSX.Element,
  createCompoundStatic: (
    staticName: string,
  ) => (ownProps?: Record<string, unknown>) => JSX.Element,
): ScopedComponentWrapper {
  return new Proxy(wrapper as ScopedComponentWrapper, {
    get(target, property, receiver) {
      if (
        typeof property === 'symbol' ||
        reservedScopedCompoundStaticKeys.has(property) ||
        property in target
      ) {
        return Reflect.get(target, property, receiver);
      }

      // Cache on the target so repeated `.Loading` access keeps one identity.
      const CompoundStatic = createCompoundStatic(property);
      target[property] = CompoundStatic;
      return CompoundStatic;
    },
  });
}

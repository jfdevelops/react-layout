/** Check node containers without invoking components or awaiting promises. */
export function createReactNodeCheck(
  isValidElement: (value: unknown) => boolean,
  version: string,
) {
  const supportsAsyncNodes = Number.parseInt(version, 10) >= 19;

  function checkReactNode(value: unknown, ancestors: Set<object>): boolean {
    if (
      value == null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return true;
    }
    if (typeof value === 'bigint') {
      return supportsAsyncNodes;
    }
    if (isValidElement(value)) {
      return true;
    }
    if (typeof value !== 'object') {
      return false;
    }
    if ('$$typeof' in value && value.$$typeof === Symbol.for('react.portal')) {
      return true;
    }
    if (
      supportsAsyncNodes &&
      'then' in value &&
      typeof value.then === 'function'
    ) {
      return true;
    }
    if (
      !(Symbol.iterator in value) ||
      typeof value[Symbol.iterator] !== 'function' ||
      ancestors.has(value)
    ) {
      return false;
    }

    const iterator = (value as Iterable<unknown>)[Symbol.iterator]();
    // Consuming a one-shot iterator here would leave React with no children.
    if ((iterator as unknown) === value) {
      return false;
    }

    ancestors.add(value);
    try {
      let step = iterator.next();
      while (!step.done) {
        if (!checkReactNode(step.value, ancestors)) {
          return false;
        }
        step = iterator.next();
      }

      return true;
    } finally {
      ancestors.delete(value);
    }
  }

  return function isReactNode(value: unknown) {
    return checkReactNode(value, new Set<object>());
  };
}

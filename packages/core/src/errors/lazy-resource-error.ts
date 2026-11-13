import { LayoutConfigurationError } from './layout-configuration-error';
import { ResourceModuleLoadError } from './resource-state-error';

/** A lazy module must export exactly one matching layout, state, or component. */
export class LazyResourceModuleShapeError extends LayoutConfigurationError {
  override readonly code = 'lazyResourceModuleShape';

  constructor(
    readonly resource: string,
    readonly received: number,
  ) {
    super(
      `Lazy module "${resource}" must export exactly one matching component or state; received ${received}`,
    );
    this.name = 'LazyResourceModuleShapeError';
  }
}

/** A compound state requested before loading does not exist in the module. */
export class LazyResourceStateNotFoundError extends LayoutConfigurationError {
  override readonly code = 'lazyResourceStateNotFound';

  constructor(
    readonly resource: string,
    readonly state: string,
  ) {
    super(`Lazy resource "${resource}" does not define state "${state}"`);
    this.name = 'LazyResourceStateNotFoundError';
  }
}

export type LazyResourceError =
  | ResourceModuleLoadError
  | LazyResourceModuleShapeError
  | LazyResourceStateNotFoundError;

export type LazyResourceErrorMap = {
  [Code in LazyResourceError['code']]: Extract<
    LazyResourceError,
    { code: Code }
  >;
};

export function isLazyResourceError(
  error: unknown,
): error is LazyResourceError {
  return (
    error instanceof ResourceModuleLoadError ||
    error instanceof LazyResourceModuleShapeError ||
    error instanceof LazyResourceStateNotFoundError
  );
}

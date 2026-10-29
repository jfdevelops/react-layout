import type { ComponentType, ReactNode } from 'react';
import type { LoadStatus } from '@jfdevelops/react-layout-devtools-core';
import type {
  LazyResourceError,
  LazyResourceErrorMap,
} from '../errors/lazy-resource-error';

export type { LoadStatus } from '@jfdevelops/react-layout-devtools-core';

/** Options shared by lazy layouts, render states, and scoped content. */
export type LazyOptions<
  Module extends Record<string, unknown> = Record<string, unknown>,
> = {
  load: () => Promise<Module>;
  fallback?: ReactNode;
};

export type LazyHandle = {
  preload(): Promise<void>;
  readonly status: LoadStatus;
};

export type LazyResourceErrorProps<Resource = string> = {
  error: LazyResourceError;
  retry: () => void;
  resource: Resource;
};

export type LazyResourceErrorComponent<Resource = string> = ComponentType<
  LazyResourceErrorProps<Resource>
>;
export type LazyResourceLoadingComponent<Resource = string> = ComponentType<{
  resource: Resource;
}>;
export type LazyResourceStates<Resource = string> = {
  Error?: LazyResourceErrorComponent<Resource>;
  Loading?: LazyResourceLoadingComponent<Resource>;
};

type ErrorHandlerContext<Context> = [Context] extends [never]
  ? []
  : [context: Context];

export type LazyErrorHandlers<
  Resource,
  Custom extends object = {},
  Context = never,
> = {
  [Code in LazyResourceError['code']]?: (
    props: Custom &
      Omit<LazyResourceErrorProps<Resource>, 'error'> & {
        error: LazyResourceErrorMap[Code];
      },
    ...context: ErrorHandlerContext<Context>
  ) => ReactNode;
} & {
  fallback?: (
    props: Custom & LazyResourceErrorProps<Resource>,
    ...context: ErrorHandlerContext<Context>
  ) => ReactNode;
};

export type CreateLazyErrorComponent<Resource, Context = never> = {
  <Custom extends object = {}>(
    render: (
      props: Custom & LazyResourceErrorProps<Resource>,
      ...context: ErrorHandlerContext<Context>
    ) => ReactNode,
  ): ComponentType<Custom & LazyResourceErrorProps<Resource>>;
  <Custom extends object = {}>(
    handlers: LazyErrorHandlers<Resource, Custom, Context>,
  ): ComponentType<Custom & LazyResourceErrorProps<Resource>>;
};

/** Internal factory defaults propagated to layouts without publishing metadata. */
export const lazyDefaultsSymbol = Symbol('lazyDefaults');

export const lazyStatesSymbol = Symbol('lazyStates');

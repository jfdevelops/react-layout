import type { WithChildren } from '@jfdevelops/react-layout-composables';
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
  CustomProps extends object = {},
  Context = never,
> = {
  [Code in LazyResourceError['code']]?: (
    props: WithChildren<CustomProps> &
      Omit<LazyResourceErrorProps<Resource>, 'error'> & {
        error: LazyResourceErrorMap[Code];
      },
    ...context: ErrorHandlerContext<Context>
  ) => ReactNode;
} & {
  fallback?: (
    props: WithChildren<CustomProps> & LazyResourceErrorProps<Resource>,
    ...context: ErrorHandlerContext<Context>
  ) => ReactNode;
};

/** Internal factory defaults propagated to layouts without publishing metadata. */
export const lazyDefaultsSymbol = Symbol('lazyDefaults');

export const lazyStatesSymbol = Symbol('lazyStates');

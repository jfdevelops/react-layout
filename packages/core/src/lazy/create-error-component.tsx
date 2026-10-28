import type {
  CreateLazyErrorComponent,
  LazyErrorHandlers,
  LazyResourceErrorProps,
} from './types';

/** Function inputs retain their identity; handler maps dispatch by error code. */
export const createLazyErrorComponent: CreateLazyErrorComponent<string> = (
  input:
    | ((props: LazyResourceErrorProps) => React.ReactNode)
    | LazyErrorHandlers<string>,
) => {
  if (typeof input === 'function') return input;
  const handlers = input;
  function LazyResourceErrorByCode(props: LazyResourceErrorProps) {
    const handler = handlers[props.error.code] ?? handlers.fallback;
    if (!handler) throw props.error;
    return handler(props as never);
  }
  return LazyResourceErrorByCode;
};

import {
  Component,
  Suspense,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react';
import { isLazyResourceError } from '../errors/lazy-resource-error';
import type { LazyResourceErrorComponent } from './types';
import type { LazyLoader } from './create-lazy-loader';

type BoundaryProps = {
  children: ReactNode;
  ErrorComponent?: LazyResourceErrorComponent;
  resource: string;
  onRetry: () => void;
};

class LazyErrorBoundary extends Component<
  BoundaryProps,
  { failed: boolean; error?: unknown }
> {
  state = { failed: false, error: undefined as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { failed: true, error };
  }
  retry = () => {
    this.props.onRetry();
    this.setState({ failed: false, error: undefined });
  };
  render() {
    if (!this.state.failed) return this.props.children;
    const { ErrorComponent, resource } = this.props;
    if (!isLazyResourceError(this.state.error) || !ErrorComponent)
      throw this.state.error;
    return (
      <ErrorComponent
        error={this.state.error}
        retry={this.retry}
        resource={resource}
      />
    );
  }
}

/** Shared loading, typed error handling and retry for all lazy components. */
export function LazyBoundary({
  loader,
  member,
  resource,
  fallback,
  ErrorComponent,
  componentProps,
  onMount,
  map,
}: {
  loader: LazyLoader<any>;
  member?: PropertyKey;
  map?: (selected: any) => React.ComponentType<any>;
  resource: string;
  fallback?: ReactNode;
  ErrorComponent?: LazyResourceErrorComponent;
  componentProps: Record<string, unknown>;
  onMount?: () => (() => void) | undefined;
}) {
  const [, rerender] = useReducer((value) => value + 1, 0);
  useEffect(() => onMount?.(), [onMount]);
  const Current = loader.component(member, map);
  return (
    <LazyErrorBoundary
      resource={resource}
      ErrorComponent={ErrorComponent}
      onRetry={() => {
        loader.reset();
        rerender();
      }}
    >
      <Suspense fallback={fallback}>
        <Current {...componentProps} />
      </Suspense>
    </LazyErrorBoundary>
  );
}

import {
  Component,
  createElement,
  useLayoutEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  inspectionId,
  layoutPreviewFixtures,
  type InspectionStore,
} from '@jfdevelops/react-layout-devtools-core';

type PropsOf<T> = T extends (props: infer P, ...rest: never[]) => unknown
  ? Partial<P>
  : never;

export type LayoutPreviewProps<T> = {
  [K in keyof T as K extends 'Root' | 'makeComposable'
    ? never
    : T[K] extends (...args: never[]) => unknown
    ? K
    : never]?: PropsOf<T[K]>;
} & { default?: PropsOf<T extends { Root: infer R } ? R : T> };

/** Typed, partial props used only while an opted-in development preview is forced. */
export function defineLayoutPreview<T extends object>(
  layout: T,
  fixtures: LayoutPreviewProps<T>
): T {
  const root = 'Root' in layout ? layout.Root : layout;

  Object.defineProperty(root, layoutPreviewFixtures, {
    value: fixtures,
    configurable: true,
  });

  return layout;
}

class PreviewBoundary extends Component<
  { children: ReactNode; onError: (message: string) => void },
  { error?: string }
> {
  state: { error?: string } = {};

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error.message);
  }

  render() {
    return this.state.error ? (
      <div role="alert">
        Unable to preview this render state: {this.state.error}. Supply preview
        props or return to Auto in React Layout Devtools.
      </div>
    ) : (
      this.props.children
    );
  }
}

export function createPreviewComponent(
  automatic: ComponentType<Record<string, unknown>>,
  options: {
    store: InspectionStore;
    layout: string;
    state: string;
    states: ReadonlyMap<string, string>;
    components: Record<string, ComponentType<Record<string, unknown>>>;
    fixtures: () => Record<string, Record<string, unknown>> | undefined;
  }
) {
  function PreviewableLayout(props: Record<string, unknown>) {
    const [id] = useState(() => inspectionId('instance'));
    const [forced, setForced] = useState<string>();

    useLayoutEffect(
      () =>
        options.store.registerPreview(
          {
            id,
            layout: options.layout,
            state: options.state,
            states: [...options.states.values()],
          },
          setForced
        ),
      [id]
    );

    if (!forced) return createElement(automatic, props);

    const name = [...options.states].find(([, state]) => state === forced)?.[0];
    const target = name && options.components[name];

    if (!target) return createElement(automatic, props);

    return (
      <PreviewBoundary
        key={forced}
        onError={(message) => options.store.previewError(id, message)}
      >
        {createElement(target, { ...props, ...options.fixtures()?.[name] })}
      </PreviewBoundary>
    );
  }

  return Object.assign(PreviewableLayout, automatic);
}

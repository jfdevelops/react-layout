/** Optional metadata injected by development adapters. No framework or build-tool dependency. */
export const layoutDebug = Symbol.for('@jfdevelops/react-layout/debug');
export const layoutPreviewFixtures = Symbol.for(
  '@jfdevelops/react-layout/preview-fixtures'
);
export interface SourceLocation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  /** Adapter-provided, same-origin development editor endpoint. */
  readonly editorUrl?: string;
}
export interface LayoutDebugMetadata {
  readonly source?: SourceLocation;
  readonly preview?: boolean;
}
export function getLayoutDebug(
  value: unknown
): LayoutDebugMetadata | undefined {
  return value !== null &&
    (typeof value === 'object' || typeof value === 'function')
    ? (
        globalThis as unknown as Record<
          symbol,
          WeakMap<object, LayoutDebugMetadata>
        >
      )[Symbol.for('@jfdevelops/react-layout/debug-registry')]?.get(value) ??
        (value as Record<symbol, LayoutDebugMetadata>)[layoutDebug]
    : undefined;
}
export interface PreviewInstance {
  readonly id: string;
  readonly layout: string;
  readonly state: string;
  readonly states: readonly string[];
  readonly forcedState?: string;
  readonly error?: string;
}
export type PreviewController = (state: string | undefined) => void;

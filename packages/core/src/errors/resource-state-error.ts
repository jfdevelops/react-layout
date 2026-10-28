/** Identifies a failed dynamic import for a resource layout or render state. */
export class ResourceModuleLoadError extends Error {
  readonly code = 'resourceModuleLoad';

  constructor(
    readonly resource: string,
    override readonly cause: unknown,
  ) {
    const detail = cause instanceof Error
      ? `${cause.name}: ${cause.message}`
      : typeof cause === 'string' ? cause : undefined;
    super(`Unable to load resource module "${resource}"${detail ? `: ${detail}` : ''}`, { cause });
    this.name = 'ResourceModuleLoadError';
  }
}

/** Wraps an exception thrown while rendering a named resource state. */
export class ResourceRenderError extends Error {
  readonly code = 'resourceRender';

  constructor(
    readonly resource: string,
    readonly state: string,
    cause: unknown,
  ) {
    super(`Unable to render resource "${resource}" state "${state}"`, {
      cause,
    });
    this.name = 'ResourceRenderError';
  }
}

/** Library errors that can trigger a configured resource `Error` state. */
export type ResourceStateError =
  | ResourceModuleLoadError
  | ResourceRenderError;

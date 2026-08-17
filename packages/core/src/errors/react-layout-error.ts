/** Options used to assign a stable code and scope to a React Layout error. */
export type CreateReactLayoutErrorOptions<
  Code extends string = string,
  Scope extends string = string,
> = {
  code: Code;
  scope: Scope;
};

/** Shared context carried by every React Layout error. */
export interface ReactLayoutErrorContext<Scope extends string>
  extends Record<string, unknown> {
  scope: Scope;
}

/** Renders an error message from its scope and structured context. */
export type ErrorMessageRenderer<
  Scope extends string,
  Context extends ReactLayoutErrorContext<Scope>,
> = (scope: Scope, context: Context) => string;

/** Constructor and invariant API returned by the React Layout error factory. */
export interface CreatedReactLayoutError<
  Code extends string,
  Scope extends string,
  Context extends ReactLayoutErrorContext<Scope>,
> {
  invariant: <Condition>(
    condition: Condition,
    context: Omit<Context, 'scope'> | (() => Omit<Context, 'scope'>),
  ) => asserts condition;
  new (context: Omit<Context, 'scope'>): ReactLayoutError<
    Code,
    Scope,
    Context
  > & {
    readonly code: Code;
    readonly scope: Scope;
    renderMessage(renderer?: ErrorMessageRenderer<Scope, Context>): string;
  };
}

/** Adds a default renderer to a React Layout error definition. */
export interface ReactLayoutErrorRendererFactory<
  Code extends string,
  Scope extends string,
> {
  <Context extends ReactLayoutErrorContext<Scope>>(
    defaultRenderer: ErrorMessageRenderer<Scope, Context>,
  ): CreatedReactLayoutError<Code, Scope, Context>;
}

function makeJsonSafe(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map(makeJsonSafe);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        makeJsonSafe(nestedValue),
      ]),
    );
  }

  return value;
}

/** Base data class for errors thrown by React Layout. */
export abstract class ReactLayoutError<
  Code extends string = string,
  Scope extends string = string,
  Context extends ReactLayoutErrorContext<Scope> =
    ReactLayoutErrorContext<Scope>,
> extends Error {
  abstract readonly code: Code;
  readonly scope: Scope;
  readonly context: Context;

  static invariant<
    Condition,
    Context extends Record<string, unknown>,
  >(
    this: new (context: Context) => Error,
    condition: Condition,
    context: Context | (() => Context),
  ): asserts condition {
    if (!condition) {
      throw new this(typeof context === 'function' ? context() : context);
    }
  }

  constructor(context: Context) {
    super();
    this.name = new.target.name;
    this.scope = context.scope;
    this.context = context;

    Object.setPrototypeOf(this, new.target.prototype);
  }

  abstract renderMessage(
    renderer?: ErrorMessageRenderer<Scope, Context>,
  ): string;

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      scope: this.scope,
      message: this.message,
      context: makeJsonSafe(this.context),
    };
  }
}

/** Creates a context-only React Layout error class with a default renderer. */
export function createReactLayoutError<
  const Options extends CreateReactLayoutErrorOptions,
>(
  options: Options,
): ReactLayoutErrorRendererFactory<Options['code'], Options['scope']> {
  return function createErrorWithRenderer<
    Context extends ReactLayoutErrorContext<Options['scope']>,
  >(defaultRenderer: ErrorMessageRenderer<Options['scope'], Context>) {
    return class ReactLayoutErrorWithCode extends ReactLayoutError<
      Options['code'],
      Options['scope'],
      Context
    > {
      readonly code = options.code;

      constructor(context: Omit<Context, 'scope'>) {
        const resolvedContext = {
          ...context,
          scope: options.scope,
        } as Context;

        super(resolvedContext);
        this.message = this.renderMessage();
      }

      renderMessage(
        renderer?: ErrorMessageRenderer<Options['scope'], Context>,
      ) {
        return (renderer ?? defaultRenderer)(this.scope, this.context);
      }
    };
  };
}

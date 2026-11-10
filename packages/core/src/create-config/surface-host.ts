/** Internal carrier that keeps host identity through existing layout generics. */
export declare const surfaceHost: unique symbol;

export type SurfaceResources<Resources, Host> = Resources &
  ([Host] extends [never]
    ? { readonly [surfaceHost]: never }
    : [Host] extends [undefined]
      ? {}
      : { readonly [surfaceHost]: Host });

export type HostedSelection<Resources> = Resources extends {
  readonly [surfaceHost]: infer Host;
}
  ? { hostedBy: Host }
  : {};

export type UnhostedOnly<Resources> = Resources extends {
  readonly [surfaceHost]: unknown;
}
  ? never
  : unknown;

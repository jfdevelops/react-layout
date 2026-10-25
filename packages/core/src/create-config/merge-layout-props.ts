/** Merge contracts by section and prop key; the closest declaration wins. */
export function mergeLayoutProps<
  A extends { include?: object; custom?: object } | undefined,
  B extends { include?: object; custom?: object } | undefined
>(base: A, local: B) {
  if (!base && !local) return undefined;
  return {
    include: { ...base?.include, ...local?.include },
    custom: { ...base?.custom, ...local?.custom },
  } as {
    include: NonNullable<A>['include'] & NonNullable<B>['include'];
    custom: NonNullable<A>['custom'] & NonNullable<B>['custom'];
  };
}

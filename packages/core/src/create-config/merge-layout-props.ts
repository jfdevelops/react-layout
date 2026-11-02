import type { PropsContract } from '../props';

/** Merge contracts by section and prop key; the closest declaration wins. */
export function mergeLayoutProps<
  A extends PropsContract | undefined,
  B extends PropsContract | undefined
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

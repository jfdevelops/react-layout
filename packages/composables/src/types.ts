import type { AnyBuiltPropDefinition } from '@jfdevelops/react-layout-validator';
import type { ReactNode } from 'react';

export type InPropsObject = Record<string, AnyBuiltPropDefinition>;

/** Adds the default content slot without weakening an explicit declaration. */
export type WithChildren<Props> = Props &
  ('children' extends keyof Props ? {} : { children?: ReactNode });

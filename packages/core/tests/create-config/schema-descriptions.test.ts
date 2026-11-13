import { expect, it, vi } from 'vitest';
import { z } from 'zod';
import * as v from 'valibot';
import { type } from 'arktype';
import { inspectPropValidator } from '@jfdevelops/react-layout-devtools-core';
import { reactNode, reactElement } from '@jfdevelops/react-layout-adapter-zod';
import { componentSlot } from '../../src';

it('describes real schema types and optionality without parsing inputs', () => {
  expect(
    inspectPropValidator(
      z.object({
        name: z.string(),
        age: z.number().optional(),
      }),
    ),
  ).toMatchObject({
    type: '{ name: string; age?: number }',
    vendor: 'zod',
    visibility: 'required',
  });
  expect(inspectPropValidator(v.optional(v.array(v.string())))).toEqual({
    type: 'string[]',
    vendor: 'valibot',
    visibility: 'optional',
  });
  expect(inspectPropValidator(type('string | number'))).toMatchObject({
    type: 'number | string',
    vendor: 'arktype',
    visibility: 'required',
  });
  const refine = vi.fn<() => boolean>(() => true);
  inspectPropValidator(z.string().refine(refine));
  expect(refine).not.toHaveBeenCalled();
});

it('names React adapter schemas through optional wrappers', () => {
  expect(inspectPropValidator(reactNode().optional())).toMatchObject({
    type: 'ReactNode',
    visibility: 'optional',
  });
  expect(inspectPropValidator(reactElement())).toMatchObject({
    type: 'ReactElement',
    visibility: 'required',
  });
  expect(inspectPropValidator(componentSlot())?.type).toBe('Component');
});

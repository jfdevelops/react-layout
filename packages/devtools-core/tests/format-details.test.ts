import { expect, it, vi } from 'vitest';
import { describePropValidator, formatInspectionDetails } from '../src';

function schema(vendor: string, validate = vi.fn()) {
  return {
    '~standard': {
      version: 1,
      vendor,
      validate,
    },
  };
}

it('formats repeated schemas independently and never invokes callbacks', () => {
  const validate = vi.fn();
  const validator = schema('zod', validate);
  const render = vi.fn();
  const result = JSON.parse(
    formatInspectionDetails({
      first: validator,
      second: validator,
      render,
    }),
  );
  expect(result.first).toBe('zod schema');
  expect(result.second).toBe('zod schema');
  expect(result.render).toMatch(/^\[function/);
  expect(validate).not.toHaveBeenCalled();
  expect(render).not.toHaveBeenCalled();
});
it('retains circular reference protection for ordinary details', () => {
  const details: Record<string, unknown> = {
    count: 5n,
  };
  details.self = details;
  expect(JSON.parse(formatInspectionDetails(details))).toEqual({
    count: '5',
    self: '[circular reference]',
  });
});
it('describes schemas by vendor and distinguishes plain functions', () => {
  expect(describePropValidator(schema('valibot'))).toBe('valibot schema');
  expect(describePropValidator(Object.assign(() => {}, schema('arktype')))).toBe('arktype schema');
  expect(describePropValidator(() => {})).toBeUndefined();
  expect(
    describePropValidator({
      '~standard': {
        version: 2,
      },
    }),
  ).toBeUndefined();
});

import { expect, it, vi } from 'vitest';
import { describePropValidator, formatInspectionDetails } from '../src';
it('formats repeated validators independently and never invokes callbacks', () => {
  const validator = Object.assign(vi.fn(), {
    type: 'string',
    visibility: 'optional',
  });
  const render = vi.fn();
  const result = JSON.parse(
    formatInspectionDetails({ first: validator, second: validator, render })
  );
  expect(result.first).toBe('string (optional)');
  expect(result.second).toBe('string (optional)');
  expect(result.render).toMatch(/^\[function/);
  expect(validator).not.toHaveBeenCalled();
  expect(render).not.toHaveBeenCalled();
});
it('retains circular reference protection for schemas and ordinary details', () => {
  const details: Record<string, unknown> = { count: 5n };
  details.self = details;
  expect(JSON.parse(formatInspectionDetails(details))).toEqual({
    count: '5',
    self: '[circular reference]',
  });
  const base: Record<string, unknown> = {
    type: 'object',
    visibility: 'required',
  };
  const validator = Object.assign(() => {}, { _baseProp: base });
  base.properties = { self: validator };
  expect(describePropValidator(validator)).toBe(
    '{ self: recursive } (required)'
  );
});
it('describes render-prop signatures and distinguishes plain functions', () => {
  const title = Object.assign(() => {}, {
    type: 'string',
    visibility: 'required',
  });
  const render = Object.assign(() => {}, {
    _baseProp: {
      type: 'function',
      visibility: 'optional',
      renderProps: { title },
      childrenType: 'ReactNode',
    },
  });
  expect(describePropValidator(render)).toBe(
    '(props: { title: string }) => ReactNode (optional)'
  );
  expect(describePropValidator(() => {})).toBeUndefined();
});

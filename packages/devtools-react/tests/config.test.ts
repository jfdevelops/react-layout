import { expect, it } from 'vitest';
import { initialGraphZoom, resolveChipColors } from '../src/config';
it('accepts named colors and CSS variables without assuming hex notation', () => {
  const palette = resolveChipColors({
    resource: 'tomato',
    active: { color: 'var(--active)', background: 'var(--active-bg)' },
  });
  expect(palette.resource).toEqual({
    color: 'tomato',
    background: 'color-mix(in srgb, tomato 10%, transparent)',
  });
  expect(palette.active).toEqual({
    color: 'var(--active)',
    background: 'var(--active-bg)',
  });
  expect(palette.layout.color).toBe('#a78bfa');
});
it('keeps initial zoom finite and within the toolbar bounds', () => {
  expect(initialGraphZoom()).toBe(1);
  expect(initialGraphZoom(NaN)).toBe(1);
  expect(initialGraphZoom(Infinity)).toBe(1);
  expect(initialGraphZoom(-2)).toBe(0.25);
  expect(initialGraphZoom(20)).toBe(2);
  expect(initialGraphZoom(0.75)).toBe(0.75);
});

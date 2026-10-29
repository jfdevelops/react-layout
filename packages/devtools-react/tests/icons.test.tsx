import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import * as icons from '../src/icons';

afterEach(cleanup);

it.each(Object.entries(icons))(
  '%s uses the same decorative icon geometry',
  (_, Glyph) => {
    const { container } = render(<Glyph />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', '18');
    expect(svg).toHaveAttribute('height', '18');
    expect(svg).toHaveAttribute('viewBox', '0 0 32 32');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
  }
);

import { Button } from '../src/components/ui/button';
import { EyeIcon } from '../src/icons';

it('gives icon-only buttons square targets despite inherited control padding', () => {
  const { getByRole } = render(
    <Button
      size="icon"
      aria-label="Show outlines"
      style={{ padding: '6px 12px' }}
    >
      <EyeIcon />
    </Button>
  );
  expect(getByRole('button')).toHaveStyle({
    width: '32px',
    height: '32px',
    padding: '0px',
  });
});

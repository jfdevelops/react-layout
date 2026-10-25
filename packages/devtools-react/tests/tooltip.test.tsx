import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { HelpTooltip } from '../src/components/ui/tooltip';

it('keeps the tooltip visible while its trigger retains keyboard focus', () => {
  render(
    <HelpTooltip content="Help">
      <button>Trigger</button>
    </HelpTooltip>
  );
  const trigger = screen.getByRole('button', { name: 'Trigger' });
  act(() => trigger.focus());
  fireEvent.pointerMove(trigger, { pointerType: 'mouse' });
  fireEvent.pointerLeave(trigger.parentElement!);
  expect(screen.getByRole('tooltip')).toHaveTextContent('Help');
  fireEvent.blur(trigger);
  expect(screen.queryByRole('tooltip')).toBeNull();
});

it('keeps a hovered tooltip visible when keyboard focus leaves', () => {
  render(
    <HelpTooltip content="Help">
      <button>Trigger</button>
    </HelpTooltip>
  );
  const trigger = screen.getByRole('button', { name: 'Trigger' });
  fireEvent.pointerMove(trigger, { pointerType: 'mouse' });
  fireEvent.focus(trigger);
  fireEvent.blur(trigger);
  expect(screen.getByRole('tooltip')).toHaveTextContent('Help');
  fireEvent.pointerLeave(trigger.parentElement!);
  expect(screen.queryByRole('tooltip')).toBeNull();
});

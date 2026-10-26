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

it('stays dismissed after a pointer click until the pointer leaves and re-enters', () => {
  render(
    <HelpTooltip content="Help">
      <button>Trigger</button>
    </HelpTooltip>
  );

  const trigger = screen.getByRole('button', { name: 'Trigger' });

  fireEvent.pointerMove(trigger, { pointerType: 'mouse' });
  expect(screen.getByRole('tooltip')).toBeTruthy();

  fireEvent.pointerDown(trigger);
  act(() => trigger.focus());
  fireEvent.click(trigger);
  fireEvent.pointerMove(trigger, { pointerType: 'mouse' });

  expect(screen.queryByRole('tooltip')).toBeNull();

  fireEvent.pointerLeave(trigger.parentElement!);
  fireEvent.pointerMove(trigger, { pointerType: 'mouse' });

  expect(screen.getByRole('tooltip')).toHaveTextContent('Help');
});

it('dismisses on keyboard activation without removing focus from the trigger', () => {
  render(
    <HelpTooltip content="Help">
      <button>Trigger</button>
    </HelpTooltip>
  );

  const trigger = screen.getByRole('button', { name: 'Trigger' });

  act(() => trigger.focus());
  fireEvent.click(trigger, { detail: 0 });

  expect(screen.queryByRole('tooltip')).toBeNull();
  expect(trigger).toHaveFocus();
});

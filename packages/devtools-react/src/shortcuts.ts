export const panelShortcutLabel = 'Control+j Meta+j';

export function matchesPanelShortcut(event: KeyboardEvent) {
  return (
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.shiftKey &&
    (event.code === 'KeyJ' || event.key.toLowerCase() === 'j')
  );
}

export function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      !!target.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'
      ))
  );
}

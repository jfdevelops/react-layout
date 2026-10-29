import { usePanelTransition } from './use-panel-transition';
import {
  ResizeIcon,
  GraphIcon,
  CollapseIcon,
  ExpandIcon,
  DockIcon,
  ToolbarIcon,
  CloseIcon,
} from './icons';
import {
  isEditable,
  matchesPanelShortcut,
  panelShortcutLabel,
} from './shortcuts';
import { Button } from './components/ui/button';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  ReactLayoutDevtoolsContent,
  type ReactLayoutDevtoolsContentProps,
} from './content';
import { control } from './theme';
import { useDraggableFab } from './use-draggable-fab';
import { HelpTooltip } from './components/ui/tooltip';
import { useFloatingPanel } from './use-floating-panel';
import { usePanelPreferences, type DevtoolsVariant } from './preferences';
import { ToolbarDevtools } from './toolbar';

export interface ReactLayoutDevtoolsProps extends ReactLayoutDevtoolsContentProps {
  initialIsOpen?: boolean;
  /** Floating launcher position. Ignored by the toolbar variant. */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /**
   * `floating` (default) shows a launcher and panel; `toolbar` docks a bar to
   * the bottom of the viewport. A variant the user picks in the panel is saved
   * and takes precedence.
   */
  variant?: DevtoolsVariant;
}

/** Floating launcher and panel, or a bottom toolbar. Use Content directly inside another devtools host. */
export function ReactLayoutDevtools({
  variant = 'floating',
  initialIsOpen,
  ...props
}: ReactLayoutDevtoolsProps) {
  const [preferences, updatePreferences] = usePanelPreferences(
    props.config,
    props.storageKey
  );
  const active = preferences.variant ?? variant;
  // Toolbar mode starts collapsed when selected from the floating panel.
  const [openAfterSwitch, setOpenAfterSwitch] = useState<boolean>();

  function switchTo(next: DevtoolsVariant) {
    setOpenAfterSwitch(next === 'floating');

    updatePreferences({ variant: next });
  }

  const open = openAfterSwitch ?? initialIsOpen;

  return active === 'toolbar' ? (
    <ToolbarDevtools
      key="toolbar"
      {...props}
      initialIsOpen={open}
      onSwitchVariant={() => switchTo('floating')}
    />
  ) : (
    <FloatingDevtools
      key="floating"
      {...props}
      initialIsOpen={open}
      onSwitchVariant={() => switchTo('toolbar')}
    />
  );
}

function FloatingDevtools({
  initialIsOpen = false,
  position = 'bottom-right',
  onSwitchVariant,
  ...content
}: Omit<ReactLayoutDevtoolsProps, 'variant'> & {
  onSwitchVariant: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const transition = usePanelTransition(initialIsOpen);
  const { phase, open, setOpen } = transition;
  const hasOpened = useRef(initialIsOpen);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [preferences, updatePreferences] = usePanelPreferences(
    content.config,
    content.storageKey
  );
  const fab = useDraggableFab(trigger, preferences.fabPosition, (fabPosition) =>
    updatePreferences({ fabPosition })
  );
  const panel = useFloatingPanel(
    preferences.panel,
    (value) => updatePreferences({ panel: value }),
    position
  );

  const panelId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        event.repeat ||
        isEditable(event.target) ||
        !matchesPanelShortcut(event)
      )
        return;
      event.preventDefault();
      hasOpened.current = true;
      setOpen((current) => !current);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setOpen]);

  useEffect(() => {
    if (mounted && open) close.current?.focus();
  }, [mounted, open]);

  useEffect(() => {
    if (mounted && phase === 'closed' && hasOpened.current)
      trigger.current?.focus();
  }, [mounted, phase]);

  function hide() {
    setOpen(false);
  }

  if (!mounted) return null;

  const horizontal = position.endsWith('right') ? { right: 16 } : { left: 16 };
  const vertical = position.startsWith('bottom') ? { bottom: 16 } : { top: 16 };
  const panelControl = {
    ...control,
    padding: '5px 7px',
    minWidth: 28,
    height: 28,
  };

  return createPortal(
    <>
      {phase !== 'closed' && (
        <div
          data-react-layout-devtools-panel
          id={panelId}
          role="dialog"
          aria-label="React Layout Devtools"
          onAnimationEnd={(event) => {
            if (event.target !== event.currentTarget) return;

            transition.finish();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();

              hide();
            }
          }}
          style={{
            position: 'fixed',
            left: panel.rect.x,
            top: panel.rect.y,
            animation: transition.animation,
            width: panel.rect.width,
            height: panel.rect.height,
            boxSizing: 'border-box',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            background: '#0b1220',
            border: '1px solid #334155',
            borderRadius: 12,
            boxShadow: '0 20px 80px #0008',
            overflow: 'hidden',
            color: '#e2e8f0',
            font: '13px ui-sans-serif, system-ui, sans-serif',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              padding: '8px 12px',
              borderBottom: '1px solid #334155',
            }}
          >
            <strong>React Layout</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {panel.mode === 'floating' && (
                <HelpTooltip content="Move panel · Arrow keys move; Shift moves faster">
                  <Button
                    aria-label="Move devtools panel"
                    {...panel.move}
                    style={{
                      ...panelControl,
                      cursor: 'grab',
                      touchAction: 'none',
                    }}
                  >
                    ⠿
                  </Button>
                </HelpTooltip>
              )}
              <HelpTooltip
                content={
                  panel.mode === 'expanded'
                    ? 'Restore compact panel'
                    : 'Expand panel'
                }
              >
                <Button
                  size="icon"
                  style={panelControl}
                  aria-label={
                    panel.mode === 'expanded'
                      ? 'Restore compact panel'
                      : 'Expand panel'
                  }
                  onClick={() =>
                    panel.setMode(
                      panel.mode === 'expanded' ? 'floating' : 'expanded'
                    )
                  }
                >
                  {panel.mode === 'expanded' ? (
                    <CollapseIcon />
                  ) : (
                    <ExpandIcon />
                  )}
                </Button>
              </HelpTooltip>
              <HelpTooltip
                content={
                  panel.mode === 'docked' ? 'Undock panel' : 'Dock panel'
                }
              >
                <Button
                  size="icon"
                  style={panelControl}
                  aria-label={
                    panel.mode === 'docked' ? 'Undock panel' : 'Dock panel'
                  }
                  onClick={() =>
                    panel.setMode(
                      panel.mode === 'docked' ? 'floating' : 'docked'
                    )
                  }
                >
                  <DockIcon />
                </Button>
              </HelpTooltip>
              <HelpTooltip content="Switch to bottom toolbar">
                <Button
                  size="icon"
                  style={panelControl}
                  aria-label="Switch to bottom toolbar"
                  onClick={onSwitchVariant}
                >
                  <ToolbarIcon />
                </Button>
              </HelpTooltip>
              <Button
                size="icon"
                ref={close}
                type="button"
                aria-label="Close React Layout Devtools"
                aria-keyshortcuts={panelShortcutLabel}
                onClick={hide}
                style={panelControl}
              >
                <CloseIcon />
              </Button>
            </div>
          </div>
          {panel.mode !== 'expanded' && (
            <Button
              aria-label="Resize devtools panel"
              title="Drag up or left to enlarge · Arrow keys resize"
              {...panel.resize}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                zIndex: 2,
                width: 14,
                height: 14,
                border: 0,
                padding: 0,
                color: '#94a3b8',
                background: 'transparent',
                cursor: panel.mode === 'docked' ? 'ns-resize' : 'nwse-resize',
                touchAction: 'none',
              }}
            >
              <ResizeIcon size={12} />
            </Button>
          )}
          <div style={{ overflow: 'hidden', flex: 1, minHeight: 0 }}>
            <ReactLayoutDevtoolsContent
              {...content}
              layout={
                content.layout ??
                (panel.mode === 'floating' && panel.rect.width < 760
                  ? 'compact'
                  : 'auto')
              }
              style={{ border: 0, borderRadius: 0, ...content.style }}
            />
          </div>
        </div>
      )}
      {phase === 'closed' && (
        <Button
          ref={trigger}
          type="button"
          aria-label="Open React Layout Devtools"
          aria-keyshortcuts={panelShortcutLabel}
          aria-expanded={false}
          title="Drag to move · Click to open"
          aria-description="Drag to reposition, or use Alt and arrow keys. Click or press Enter to open."
          {...fab.handlers}
          onClick={(event) => {
            if (fab.consumeClick(event.detail)) {
              event.preventDefault();

              return;
            }

            hasOpened.current = true;

            setOpen(true);
          }}
          style={{
            position: 'fixed',
            ...(fab.coordinates
              ? { left: fab.coordinates.x, top: fab.coordinates.y }
              : { ...horizontal, ...vertical }),
            zIndex: 100000,
            width: 52,
            height: 52,
            display: 'grid',
            placeItems: 'center',
            border: '1px solid #6ee7b7',
            borderRadius: '50%',
            background: '#064e3b',
            color: '#a7f3d0',
            boxShadow: '0 4px 24px #0006',
            cursor: fab.dragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            userSelect: 'none',
          }}
        >
          <GraphIcon />
        </Button>
      )}
    </>,
    document.body
  );
}

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

export interface ReactLayoutDevtoolsProps
  extends ReactLayoutDevtoolsContentProps {
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
  // Switching from an open panel keeps the devtools open in the new variant.
  const [openAfterSwitch, setOpenAfterSwitch] = useState(false);

  function switchTo(next: DevtoolsVariant) {
    setOpenAfterSwitch(true);

    updatePreferences({ variant: next });
  }

  const open = openAfterSwitch || initialIsOpen;

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
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open' | 'closing'>(
    initialIsOpen ? 'opening' : 'closed'
  );
  const open = phase === 'opening' || phase === 'open';
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
    if (phase !== 'opening' && phase !== 'closing') return;

    // Complete even if a host stylesheet disables animation events.
    const timeout = setTimeout(
      () =>
        setPhase((current) =>
          current === phase
            ? phase === 'opening'
              ? 'open'
              : 'closed'
            : current
        ),
      phase === 'opening' ? 280 : 220
    );

    return () => clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (mounted && open) close.current?.focus();
  }, [mounted, open]);

  useEffect(() => {
    if (mounted && phase === 'closed' && hasOpened.current)
      trigger.current?.focus();
  }, [mounted, phase]);

  function hide() {
    setPhase('closing');
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

            setPhase((current) =>
              current === 'closing'
                ? 'closed'
                : current === 'opening'
                ? 'open'
                : current
            );
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
            animation:
              phase === 'opening'
                ? 'react-layout-devtools-enter 280ms cubic-bezier(0.22, 1, 0.36, 1) both'
                : phase === 'closing'
                ? 'react-layout-devtools-exit 220ms cubic-bezier(0.4, 0, 1, 1) both'
                : undefined,
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
                  ⛶
                </Button>
              </HelpTooltip>
              <HelpTooltip
                content={
                  panel.mode === 'docked' ? 'Undock panel' : 'Dock panel'
                }
              >
                <Button
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
                  ▤
                </Button>
              </HelpTooltip>
              <HelpTooltip content="Switch to bottom toolbar">
                <Button
                  style={panelControl}
                  aria-label="Switch to bottom toolbar"
                  onClick={onSwitchVariant}
                >
                  ▁
                </Button>
              </HelpTooltip>
              <Button
                ref={close}
                type="button"
                aria-label="Close React Layout Devtools"
                onClick={hide}
                style={panelControl}
              >
                ×
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
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path d="M2 10L10 2M2 6L6 2" />
              </svg>
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

            setPhase('opening');
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
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <rect x="9" y="2" width="10" height="7" rx="2" />
            <path d="M14 9v5M6 14h16M6 14v5M22 14v5" />
            <rect x="2" y="19" width="8" height="7" rx="2" />
            <rect x="18" y="19" width="8" height="7" rx="2" />
          </svg>
        </Button>
      )}
    </>,
    document.body
  );
}

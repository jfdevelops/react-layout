import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Button } from './components/ui/button';
import { HelpTooltip } from './components/ui/tooltip';
import {
  ReactLayoutDevtoolsProvider,
  ReactLayoutDevtoolsWorkspace,
  type ReactLayoutDevtoolsContentProps,
} from './content';
import { useDevtoolsContext } from './context';
import { ComposableOutlines, OutlineToggle } from './outlines';
import { usePanelPreferences } from './preferences';
import { control } from './theme';
import { summarizeGraph } from './toolbar-summary';

export const toolbarBarHeight = 32;
export const toolbarHeightVariable = '--react-layout-devtools-toolbar-height';

const defaultDrawerHeight = 360;
const minDrawerHeight = 160;

/** Shortcuts use `event.code` so they work with any keyboard layout. */
export const toolbarShortcuts = {
  toggle: { code: 'KeyL', label: 'Alt+Shift+L' },
  hide: { code: 'KeyH', label: 'Alt+Shift+H' },
} as const;

function matches(
  event: globalThis.KeyboardEvent,
  shortcut: (typeof toolbarShortcuts)[keyof typeof toolbarShortcuts]
) {
  return (
    event.altKey &&
    event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    event.code === shortcut.code
  );
}

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

function clampHeight(height: number) {
  const max = Math.max(
    minDrawerHeight,
    (typeof window === 'undefined' ? 768 : window.innerHeight) -
      toolbarBarHeight -
      48
  );

  return Math.round(Math.max(minDrawerHeight, Math.min(max, height)));
}

export interface ToolbarDevtoolsProps extends ReactLayoutDevtoolsContentProps {
  initialIsOpen?: boolean;
  onSwitchVariant?: () => void;
}

/** A bar docked to the bottom of the viewport that expands into a drawer. */
export function ToolbarDevtools({
  initialIsOpen = false,
  onSwitchVariant,
  ...content
}: ToolbarDevtoolsProps) {
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(initialIsOpen);
  const [hidden, setHidden] = useState(false);
  const [preferences, updatePreferences] = usePanelPreferences(
    content.config,
    content.storageKey
  );
  const [draftHeight, setDraftHeight] = useState<number>();
  const drawerHeight = clampHeight(
    draftHeight ?? preferences.toolbar?.height ?? defaultDrawerHeight
  );
  const [narrow, setNarrow] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const update = () => setNarrow(window.innerWidth < 760);

    update();

    window.addEventListener('resize', update);

    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (isEditable(event.target)) return;

      if (matches(event, toolbarShortcuts.hide)) {
        event.preventDefault();

        setHidden((current) => !current);
      } else if (matches(event, toolbarShortcuts.toggle)) {
        event.preventDefault();

        setHidden(false);

        setExpanded((current) => !current);
      }
    }

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Reserve space so the bar and drawer never cover the end of the page.
  const reserved = hidden
    ? 0
    : toolbarBarHeight + (expanded ? drawerHeight : 0);

  useEffect(() => {
    if (!mounted) return;

    const body = document.body;
    const inline = body.style.paddingBottom;
    const base = getComputedStyle(body).paddingBottom || '0px';

    // The padding follows the variable, so resizing only updates the variable.
    body.style.paddingBottom = `calc(${base} + var(${toolbarHeightVariable}, 0px))`;

    return () => {
      document.documentElement.style.removeProperty(toolbarHeightVariable);

      body.style.paddingBottom = inline;
    };
  }, [mounted]);

  useEffect(() => {
    if (mounted)
      document.documentElement.style.setProperty(
        toolbarHeightVariable,
        `${reserved}px`
      );
  }, [mounted, reserved]);

  function saveHeight(height: number) {
    setDraftHeight(undefined);

    updatePreferences({ toolbar: { height: clampHeight(height) } });
  }

  if (!mounted || hidden) return null;

  return createPortal(
    <ReactLayoutDevtoolsProvider
      source={content.source}
      nonce={content.nonce}
      styleMode={content.styleMode}
      config={content.config}
      storageKey={content.storageKey}
      layout={
        content.layout === 'compact' || (content.layout !== 'split' && narrow)
          ? 'compact'
          : 'split'
      }
    >
      <ToolbarShell
        expanded={expanded}
        setExpanded={setExpanded}
        hide={() => setHidden(true)}
        drawerHeight={drawerHeight}
        previewHeight={setDraftHeight}
        saveHeight={saveHeight}
        onSwitchVariant={onSwitchVariant}
        className={content.className}
        style={content.style}
      />
    </ReactLayoutDevtoolsProvider>,
    document.body
  );
}

function ToolbarShell({
  expanded,
  setExpanded,
  hide,
  drawerHeight,
  previewHeight,
  saveHeight,
  onSwitchVariant,
  className,
  style,
}: {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  hide: () => void;
  drawerHeight: number;
  previewHeight: (height: number) => void;
  saveHeight: (height: number) => void;
  onSwitchVariant?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const { graph, inspector, palette } = useDevtoolsContext();
  const summary = useMemo(() => summarizeGraph(graph), [graph]);
  const drawerId = useId();
  const drag = useRef<{ pointer: number; y: number; height: number }>();
  const toggle = useRef<HTMLButtonElement>(null);
  const dragHeight = useRef(drawerHeight);
  const barControl: CSSProperties = {
    ...control,
    height: 24,
    minWidth: 24,
    padding: '0 6px',
    fontSize: 12,
  };
  const instance = summary.current?.instance;
  const stateLabel = (id: string) =>
    graph.nodes.find((node) => node.id === id)?.label ?? id;

  function onResizeKey(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 64 : 16;
    const delta =
      event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0;

    if (!delta) return;

    event.preventDefault();

    saveHeight(drawerHeight + delta);
  }

  return (
    <div
      data-react-layout-devtools-toolbar
      className={className}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        background: '#0b1220',
        color: '#e2e8f0',
        borderTop: '1px solid #334155',
        boxShadow: '0 -8px 32px #0006',
        font: '12px/1.5 ui-sans-serif, system-ui, sans-serif',
        ...style,
      }}
    >
      {expanded && (
        <section
          id={drawerId}
          aria-label="Layout devtools"
          onKeyDown={(event) => {
            if (event.key !== 'Escape' || event.defaultPrevented) return;

            event.stopPropagation();

            setExpanded(false);

            // The drawer unmounts with focus inside it; return focus to its toggle.
            toggle.current?.focus();
          }}
          style={{
            position: 'relative',
            height: drawerHeight,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            borderBottom: '1px solid #334155',
            font: '13px/1.5 ui-sans-serif, system-ui, sans-serif',
          }}
        >
          <Button
            aria-label="Resize devtools drawer"
            title="Drag to resize · Arrow keys resize; Shift resizes faster"
            onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
              if (event.button !== 0 || event.isPrimary === false) return;

              event.preventDefault();

              drag.current = {
                pointer: event.pointerId,
                y: event.clientY,
                height: drawerHeight,
              };

              dragHeight.current = drawerHeight;

              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={(event) => {
              const active = drag.current;

              if (!active || active.pointer !== event.pointerId) return;

              dragHeight.current = clampHeight(
                active.height + active.y - event.clientY
              );

              previewHeight(dragHeight.current);
            }}
            onPointerUp={(event) => {
              if (drag.current?.pointer !== event.pointerId) return;

              drag.current = undefined;

              saveHeight(dragHeight.current);
            }}
            onPointerCancel={() => {
              drag.current = undefined;

              saveHeight(dragHeight.current);
            }}
            onKeyDown={onResizeKey}
            style={{
              position: 'absolute',
              top: -4,
              left: 0,
              right: 0,
              zIndex: 2,
              height: 8,
              padding: 0,
              border: 0,
              borderRadius: 0,
              background: 'transparent',
              cursor: 'ns-resize',
              touchAction: 'none',
            }}
          />
          <ReactLayoutDevtoolsWorkspace />
        </section>
      )}
      {!expanded && <ComposableOutlines />}
      <div
        role="region"
        aria-label="React Layout Devtools toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          height: toolbarBarHeight,
          boxSizing: 'border-box',
          padding: '0 8px 0 12px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        <strong
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: '#a7f3d0',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 28 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <rect x="9" y="2" width="10" height="7" rx="2" />
            <path d="M14 9v5M6 14h16M6 14v5M22 14v5" />
            <rect x="2" y="19" width="8" height="7" rx="2" />
            <rect x="18" y="19" width="8" height="7" rx="2" />
          </svg>
          React Layout
        </strong>
        <span
          role="group"
          aria-label="Layout status"
          style={{ display: 'flex', gap: 10, color: '#94a3b8' }}
        >
          <span>{summary.activeLayouts} active</span>
          <span>{summary.loading} loading</span>
          <span
            data-failed={summary.failed > 0 || undefined}
            style={{
              color: summary.failed > 0 ? palette.error.color : undefined,
              fontWeight: summary.failed > 0 ? 600 : undefined,
            }}
          >
            {summary.failed} failed
          </span>
        </span>
        {summary.current && (
          <span
            aria-label="Current layout"
            title="Most recently mounted layout"
            style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {summary.current.resource}
            {summary.current.state && ` · ${summary.current.state}`}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {instance && inspector.preview && instance.states.length > 0 && (
          <select
            aria-label="Override state"
            value={instance.forcedState ?? ''}
            onChange={(event) =>
              inspector.preview?.(instance.id, event.target.value || undefined)
            }
            style={{ ...barControl, padding: '0 4px' }}
          >
            <option value="">Auto</option>
            {instance.states.map((id) => (
              <option key={id} value={id}>
                {stateLabel(id)}
              </option>
            ))}
          </select>
        )}
        <OutlineToggle />
        {onSwitchVariant && (
          <HelpTooltip content="Switch to floating panel">
            <Button
              aria-label="Switch to floating panel"
              onClick={onSwitchVariant}
              style={barControl}
            >
              ⧉
            </Button>
          </HelpTooltip>
        )}
        <HelpTooltip
          content={`Hide toolbar · ${toolbarShortcuts.hide.label} shows it again`}
        >
          <Button
            aria-label="Hide toolbar"
            aria-keyshortcuts={toolbarShortcuts.hide.label}
            onClick={hide}
            style={barControl}
          >
            ×
          </Button>
        </HelpTooltip>
        <HelpTooltip
          content={`${expanded ? 'Collapse' : 'Expand'} devtools · ${
            toolbarShortcuts.toggle.label
          }`}
        >
          <Button
            ref={toggle}
            aria-label={expanded ? 'Collapse devtools' : 'Expand devtools'}
            aria-expanded={expanded}
            aria-controls={expanded ? drawerId : undefined}
            aria-keyshortcuts={toolbarShortcuts.toggle.label}
            onClick={() => setExpanded(!expanded)}
            style={barControl}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
              style={{ transform: expanded ? 'rotate(180deg)' : undefined }}
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
          </Button>
        </HelpTooltip>
      </div>
    </div>
  );
}

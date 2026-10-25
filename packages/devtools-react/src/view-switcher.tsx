import { HelpTooltip } from './components/ui/tooltip';
import { Button } from './components/ui/button';

type View = 'graph' | 'tree';
const views: readonly View[] = ['graph', 'tree'];
export function ViewSwitcher({
  value,
  onChange,
}: {
  value: View;
  onChange: (view: View) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Relationship view"
      style={{
        display: 'flex',
        gap: 2,
        padding: 3,
        border: '1px solid #334155',
        borderRadius: 8,
        background: '#101a2b',
      }}
    >
      {views.map((view) => {
        const label = view === 'graph' ? 'Graph' : 'Tree';
        return (
          <HelpTooltip key={view} content={`${label} view`}>
            <Button
              type="button"
              role="tab"
              aria-label={label}
              aria-selected={value === view}
              tabIndex={value === view ? 0 : -1}
              onClick={() => onChange(view)}
              onKeyDown={(event) => {
                if (
                  !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(
                    event.key
                  )
                )
                  return;
                event.preventDefault();
                const next =
                  event.key === 'Home'
                    ? 'graph'
                    : event.key === 'End'
                    ? 'tree'
                    : view === 'graph'
                    ? 'tree'
                    : 'graph';
                onChange(next);
                event.currentTarget
                  .closest('[role="tablist"]')
                  ?.querySelector<HTMLButtonElement>(
                    `[aria-label="${next === 'graph' ? 'Graph' : 'Tree'}"]`
                  )
                  ?.focus();
              }}
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 34,
                height: 30,
                padding: 0,
                border: 0,
                borderRadius: 5,
                background: value === view ? '#334155' : 'transparent',
                color: value === view ? '#f1f5f9' : '#94a3b8',
                cursor: 'pointer',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {view === 'graph' ? (
                  <>
                    <rect x="9" y="2" width="6" height="5" rx="1" />
                    <path d="M12 7v5M5 12h14M5 12v5M19 12v5" />
                    <rect x="2" y="17" width="6" height="5" rx="1" />
                    <rect x="16" y="17" width="6" height="5" rx="1" />
                  </>
                ) : (
                  <>
                    <path d="M5 4v13q0 2 2 2h3M5 8h5M14 5h6M14 8h4M14 16h6M14 19h4" />
                    <rect x="10" y="5" width="3" height="3" rx=".5" />
                    <rect x="10" y="16" width="3" height="3" rx=".5" />
                  </>
                )}
              </svg>
            </Button>
          </HelpTooltip>
        );
      })}
    </div>
  );
}

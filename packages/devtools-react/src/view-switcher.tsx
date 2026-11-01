import { GraphIcon, TreeIcon } from './icons';
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
              size="icon"
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
              {view === 'graph' ? <GraphIcon /> : <TreeIcon />}
            </Button>
          </HelpTooltip>
        );
      })}
    </div>
  );
}

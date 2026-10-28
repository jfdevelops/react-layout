import type { InspectionError } from '@jfdevelops/react-layout-devtools-core';
import { Badge } from './components/ui/badge';
import type { ChipPalette } from './config';

function causeChain(error: InspectionError): InspectionError[] {
  const chain: InspectionError[] = [];

  for (
    let current: InspectionError | undefined = error;
    current;
    current = current.cause
  )
    chain.push(current);

  return chain;
}

/** Shows a failed load: each error in the `cause` chain, root cause last. */
export function LoadErrorDetails({
  error,
  palette,
}: {
  error: InspectionError;
  palette: ChipPalette;
}) {
  return (
    <section aria-label="Load error" style={{ display: 'grid', gap: 8 }}>
      <h4 style={{ margin: 0, fontSize: 13, color: palette.error.color }}>
        Load error
      </h4>
      {causeChain(error).map((entry, index) => (
        <div
          key={index}
          style={{
            display: 'grid',
            gap: 6,
            padding: 10,
            borderRadius: 6,
            border: `1px solid ${palette.error.color}`,
            background: palette.error.background,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              alignItems: 'center',
            }}
          >
            {index > 0 && (
              <span style={{ color: '#94a3b8', fontSize: 11 }}>Caused by</span>
            )}
            <Badge style={palette.error}>{entry.name}</Badge>
            {entry.code && <Badge>{entry.code}</Badge>}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: '#e2e8f0',
              overflowWrap: 'anywhere',
            }}
          >
            {entry.message}
          </p>
          {entry.stack && (
            <details>
              <summary
                style={{ cursor: 'pointer', fontSize: 11, color: '#94a3b8' }}
              >
                Stack trace
              </summary>
              <pre
                style={{
                  margin: '6px 0 0',
                  maxHeight: 200,
                  overflow: 'auto',
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: '#cbd5e1',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                }}
              >
                {entry.stack}
              </pre>
            </details>
          )}
        </div>
      ))}
    </section>
  );
}

// Adapted from shadcn/ui (MIT), with self-contained styles and configurable colors.
import { forwardRef, type HTMLAttributes } from 'react';
export const Badge = forwardRef<
  HTMLSpanElement,
  HTMLAttributes<HTMLSpanElement>
>(({ style, ...props }, ref) => (
  <span
    ref={ref}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: 5,
      padding: '2px 7px',
      fontSize: 11,
      lineHeight: '18px',
      fontWeight: 500,
      color: '#cbd5e1',
      background: '#243044',
      maxWidth: '100%',
      overflowWrap: 'anywhere',
      ...style,
    }}
    {...props}
  />
));
Badge.displayName = 'Badge';

// Adapted from shadcn/ui (MIT), with self-contained package styles.
import { forwardRef, type ComponentProps } from 'react';
import { control } from '../../theme';
export const Input = forwardRef<HTMLInputElement, ComponentProps<'input'>>(
  ({ style, ...props }, ref) => (
    <input
      ref={ref}
      style={{
        ...control,
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        font: 'inherit',
        ...style,
      }}
      {...props}
    />
  )
);
Input.displayName = 'Input';

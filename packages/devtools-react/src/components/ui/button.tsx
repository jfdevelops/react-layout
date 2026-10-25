// Adapted from shadcn/ui (MIT), with self-contained package styles.
import { forwardRef, type ComponentProps } from 'react';
import { control } from '../../theme';
export const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(
  ({ style, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        style={{
          ...control,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          cursor: 'pointer',
          font: 'inherit',
          ...style,
        }}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

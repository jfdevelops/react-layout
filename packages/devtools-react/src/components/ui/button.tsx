// Adapted from shadcn/ui (MIT), with self-contained package styles.
import { forwardRef, type ComponentProps } from 'react';
import { control } from '../../theme';
type ButtonProps = ComponentProps<'button'> & {
  size?: 'default' | 'icon' | 'icon-sm';
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ style, type = 'button', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        data-size={size}
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
          ...(size === 'default'
            ? {}
            : {
                boxSizing: 'border-box',
                width: size === 'icon' ? 32 : 24,
                height: size === 'icon' ? 32 : 24,
                minWidth: size === 'icon' ? 32 : 24,
                padding: 0,
                flexShrink: 0,
              }),
        }}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

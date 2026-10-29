import type { SVGProps } from 'react';
export type IconProps = SVGProps<SVGSVGElement> & { size?: number };
/** Shared geometry for copied Icons8 SVGs. */
export function Icon({ size = 18, style, children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      fill="currentColor"
      {...props}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      {children}
    </svg>
  );
}

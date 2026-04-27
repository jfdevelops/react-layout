import type { ComponentPropsWithoutRef } from 'react'

export interface ViewMapProps extends ComponentPropsWithoutRef<'iframe'> {}

export function ViewMap({
  allowFullScreen = true,
  loading = 'lazy',
  referrerPolicy = 'no-referrer-when-downgrade',
  style,
  title = 'Map',
  ...props
}: ViewMapProps) {
  return (
    <iframe
      allowFullScreen={allowFullScreen}
      loading={loading}
      referrerPolicy={referrerPolicy}
      style={{ border: 0, minHeight: 320, width: '100%', ...style }}
      title={title}
      {...props}
    />
  )
}

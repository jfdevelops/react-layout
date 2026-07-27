---
'@jfdevelops/react-layout': patch
---

Keep scoped resource render components stable across parent rerenders so their
stateful descendants are preserved. Reject resource selections whose
capitalized render-context keys collide instead of silently using the wrong
resource render.

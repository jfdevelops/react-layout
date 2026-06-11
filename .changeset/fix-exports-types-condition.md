---
"@jfdevelops/react-layout": patch
"@jfdevelops/react-layout-composables": patch
"@jfdevelops/react-layout-validator": patch
---

Add `types` condition to package exports for correct TypeScript resolution under `moduleResolution: "bundler"`. Also corrects the top-level `types` field to point to `.d.mts` instead of `.d.cts`.

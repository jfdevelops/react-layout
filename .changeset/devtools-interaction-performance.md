---
"@jfdevelops/react-layout-devtools-core": minor
"@jfdevelops/react-layout-devtools-react": patch
---

Speed up devtools interactions in large apps. Store notifications are coalesced per microtask through the new `subscribeInspectionBatched`, graph layout and the inspection tree are cached per snapshot, search is deferred, both explorer views stay mounted, and trees and graphs over 200 nodes render only the rows and cards near the viewport.

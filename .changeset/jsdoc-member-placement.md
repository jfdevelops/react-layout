---
"@jfdevelops/react-layout": patch
"@jfdevelops/react-layout-composables": patch
"@jfdevelops/react-layout-validator": patch
"@jfdevelops/react-layout-devtools-core": patch
"@jfdevelops/react-layout-devtools-react": patch
"@jfdevelops/react-layout-devtools-vite": patch
---

Keep property documentation on its property in published declarations. The declaration bundler moved every single-line `/** … */` member comment onto the line of the member before it, so editors showed no docs (or the wrong docs) on hover. Member comments are now written in block form, which the bundler preserves.

---
'@jfdevelops/react-layout': minor
---

Return a definition-scoped `ResourceProvider` and `useResource` hook from
`defineResourceLayout`. Created resource layouts automatically provide their
current resource to descendant React components. `useResource` throws a
`MissingResourceProviderError` when called outside its provider.

Add `findResource(resource)` to grouped resource links for finding the group
that contains a resource. Its argument rejects unknown resources, and its
return type reflects whether that resource is present in the grouped-links
result.

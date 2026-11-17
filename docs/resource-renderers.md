# Resource renderers

Define a shared renderer on a created resource config:

```tsx
const renderPage = resourcePageConfig.createRenderer({
  params: { include: { keys: true } },
  render: ({ getComponentForPath, path, params }) => {
    const getComponents = getComponentForPath(path);
    const components = getComponents();

    return components[params.componentKey];
  },
  displayName: ({ path, params }) => `${path}Page${params.componentKey}`,
  factory: {
    render: (_props, { context: { Component, componentKey } }) =>
      () => <Component componentKey={componentKey} />,
  },
});

const renderTrash = renderPage('trash');
const routeOptions = {
  component: renderTrash({ component: 'component' }),
  pendingComponent: renderTrash({ component: 'pendingComponent' }),
};
```

Only `render` is required. Without `factory`, path selection returns a configured
Component. With a factory, it returns a function accepting the declared parameters
and optional factory props. Factory results preserve their inferred type and
runtime identity: thunks, JSX, primitives, and objects are all supported.

The `displayName` callback's `path.capitalize()` capitalizes the current path.
Pass a valid path to capitalize that literal instead, for example
`path.capitalize('users.detail')` returns `'Users.detail'`.
`path.capitalize('*')` also capitalizes the current path, but its string type
is the union of all capitalized valid paths. It always returns a string.

## Path selection and overrides

A direct call selects a page when the node has a component slot. Parent-only
nodes return another selector, so `renderPage('containers')('$containerId')`
and `renderPage('containers.$containerId')` are equivalent for a parent-only node.
`$containerId` is a literal configured resource key. The existing `$resource`,
`$subResource`, and `$component` variables retain their parameter behavior.

When a node is both a page and a parent, the page wins. Explicitly scope that node
with `renderPage.forPath('containers')('$containerId')`. This separates child path
selection from component-key selection, including when their names coincide.
`forPath` always returns a scope; `scope.build()` resolves the current scope.

Selections with configured descendants also expose `forResource`:

```tsx
// file-1.ts
export const renderUserComponents = renderPage('users');

// file-2.ts
const renderUserDetailComponents = renderUserComponents.forResource('detail');
// Equivalent to renderPage('users.detail').
```

The argument is relative to the selected path, with one-segment-at-a-time
suggestions. It preserves the renderer, factory, and scoped overrides. Leaf
selections omit `forResource` from their types and runtime objects.

Use `renderPage.render(callback)` or `scope.render(callback)` to create a separate
render override before factory evaluation. A default Component also supports
`Component.render(callback)` and its existing `asHOF` API. Overrides are immutable.
Factory outputs expose exactly their inferred return type and acquire no methods.

## Parameter configuration

Both `createRenderer.params` and `forPaths(...).addParams(...)` accept:

```tsx
{
  include: {
    path: { pick: { resource: true }, optional: true },
    keys: { optional: true },
  },
  custom: { title: z.string(), count: z.string().transform(Number) },
}
```

Every property is optional. `path: true` includes all path variables as required
parameters; `keys: true` includes the required `componentKey`. Set either flag to
`false` to exclude it. Object flags support `optional: true`, and path flags support
the `pick` option. The top level names the included variables. Each variable accepts
`true` for all available values, or an object selecting values from its resource tree.
A branch accepts `true` for the whole branch or another object to select its children;
a leaf accepts only `true`.

```tsx
path: {
  pick: {
    resource: {
      containers: { $containerId: true },
    },
  },
}
```

This selects the container detail page and excludes sibling resources and the
unselected container parent page. The render callback's `path`, available path
selections, parameter values, and component keys narrow to this tree. Equivalent
literal and parameterized paths remain supported. `optional: true` makes the included
parameters optional without widening the selection.

`custom` is the library's map of synchronous Standard Schema definitions. Callers
provide schema inputs; render and factory callbacks receive validated schema outputs.
Schema defaults and optional inputs retain their existing behavior. Within a renderer,
`getComponentForPath(path)()` uses its current declared path parameters; explicit
getter arguments override them.

Factories accept one options object: `selectedFactory({ component, params, props })`.
`component` accepts a configured component key or `'*'`. Use `{ component: '*' }`
to return every configured component's factory result, keyed by its component key.
Path variables and custom parameters use an object under `params`.
The component key belongs only in `component`; `params` does not accept `componentKey`.
The `component`, `params`, and `props` fields are independently optional when their inputs
are optional or defaulted. With no required inputs, the options object can also
be omitted.

`factory.props` is a separate Standard Schema definition map. Required schema inputs
make the `props` field required. For example, a factory declaring
`params.custom.title` and `factory.props.label` is invoked as
```tsx
const renderTrash = renderPage('trash');
const page = renderTrash({
  params: { title: 'Trash' },
  props: { label: 'Page' },
});
```
The first callback argument contains validated factory props; the second argument's
`context` contains the configured Component and all validated declared parameters.
Supply any required Component props when rendering it from a factory.

Custom names cannot shadow included parameters or the reserved names `Component`,
`children`, `context`, `path`, `params`, and `getComponentForPath`. Collisions are
rejected during definition as well as by the type system.

## Migration

Replace `.addPathParams(options)` with
`.addParams({ include: { path: options ?? true } })`, and replace
`.addComponentKeyParams(options)` with
`.addParams({ include: { keys: options ?? true } })`. Combine flags in one call.
The deprecated methods delegate to the same implementation. Legacy default-value
`.addParams({ title: 'Default' })` calls remain supported; use schema defaults under
`custom` for new code.

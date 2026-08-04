---
name: build-react-layouts
description: Build, extend, refactor, and review typed resource-based React application layouts using @jfdevelops/react-layout. Use when defining shared application shells with defineResourceLayout, generating resource pages with createResourceLayout, creating semantic composables, configuring grouped resource navigation, dispatching route components with createResourceConfig, building create or detail panes, or sharing implementations across multiple resources.
---

# Build React Layouts

Use `@jfdevelops/react-layout` as a typed application-structure layer.

Model the application around a central resource definition, a shared layout
contract, small resource-specific page configurations, and router adapters that
dispatch through the resource configuration. Create additional layout
definitions for structurally different surfaces such as side panes.

Do not treat the library as a replacement for routing, data fetching, form
state, or application business logic.

## Follow the workflow

1. Inspect the existing layout definition and resource list.
2. Identify whether the requested surface belongs to an existing layout family.
3. Add or reuse the resource in the central definition.
4. Define shared configuration values with `createProp`.
5. Expose semantic layout regions through composables.
6. Generate the narrowest suitable page factory.
7. Connect navigation and route-state dispatch through the helpers returned by
   `defineResourceLayout`.
8. Run the application's typecheck and relevant tests.

Read [references/architecture.md](references/architecture.md) before creating
or substantially restructuring a layout definition.

Read [references/factory-patterns.md](references/factory-patterns.md) when
choosing between direct creation, `forResource`, `forResources`,
`makeComposable`, or `createComponent(...).asHOF()`.

Read
[references/routing-and-navigation.md](references/routing-and-navigation.md)
when integrating resource links, route components, pending states, errors, or
not-found states.

## Apply the core conventions

- Import `defineResourceLayout` and `createProp` from
  `@jfdevelops/react-layout`.
- Import optional preset composables from their dedicated packages.
- Export the helpers returned by the central `defineResourceLayout` call.
- Keep the authoritative resource list in the central layout definition.
- Use resource names that match the application's route vocabulary.
- Define reusable configuration in `options`.
- Use `layout.props.include` for definition-time values consumed by the shared
  renderer.
- Use `layout.props.custom` for props passed when rendering the generated React
  component.
- Use `createProp.component({ type: 'ReactNode' })` for React content.
- Mark genuinely optional values with `.optional()`.
- Give optional custom values defaults in the shared renderer when appropriate.
- Name composables by semantic role rather than visual implementation.
- Connect semantic composables to design-system components with `wrapWith`.
- Use resource-aware composable names so generated components remain
  identifiable in React DevTools.
- Keep page configuration close to the corresponding resource feature.
- Keep resource routing generic instead of building a separate route component
  for every resource.
- Confirm helper signatures against the installed package version and let the
  current TypeScript types determine which resource-configuration branches are
  supported.
- Reuse the consuming application's router and runtime-validation tools. Do not
  add a schema dependency solely to connect a route parameter to a resource.
- Create a separate `defineResourceLayout` definition for a surface with a
  meaningfully different structural contract, such as a create or detail pane.
- Preserve inferred types. Do not use `any`, broad casts, or duplicated
  hand-written resource types to work around a layout mismatch.

## Define semantic composables

Prefer names that describe application structure, such as `Layout`, `Header`,
`Content`, `ResourceLayout`, `ResourceHeader`, `ResourceHeaderActions`, and
`Breadcrumb`.

Do not expose every wrapper element as a composable. Expose a region when
consumers may need to replace it, compose it, style it, or address it through a
generated component.

## Separate definition-time and render-time props

Use `options` for values supplied while creating a resource layout:

```tsx
options: {
  title: createProp.component({ type: 'ReactNode' }).optional(),
}
```

Make an option available to the shared renderer through `include`:

```tsx
layout: {
  props: {
    include: {
      title: true,
    },
  },
}
```

Use `custom` for values supplied when rendering the resulting component:

```tsx
layout: {
  props: {
    custom: {
      children: createProp.component({ type: 'ReactNode' }),
      actions: createProp.component({ type: 'ReactNode' }).optional(),
      showHeader: createProp.boolean().optional(),
    },
  },
}
```

Keep these categories distinct. Do not turn a definition-time page contract
into a custom render prop merely because both eventually reach the renderer.

## Verify the result

1. Typecheck the consuming application.
2. Run relevant component and route tests.
3. Exercise at least one resource page.
4. Exercise pending, error, and not-found dispatch if route configuration
   changed.
5. Exercise create and detail panes if pane configuration changed.
6. Confirm grouped navigation generates the intended resource and route.

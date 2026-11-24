---
title: Overview
description: Define typed resource layouts, compose page states, and render React pages.
order: 10
---

React Layout turns a shared page design into typed components for each resource in your application. Define the resource vocabulary, schemas, and composables once. Build reusable page chrome from those primitives, then let each resource own its content, loading, error, and detail states.

## Start here

1. [Installation](./installation.md): add the library and any companion packages.
2. [Quick start](./quick-start.md): define a layout and render a resource page.
3. [TypeScript](./typescript.md): what is inferred and which type helpers to use.

Use the guides below as you add props, states, composables, and routing.

## Guides and examples

- [Standard Schema](./standard-schema.md): schema integration and validation support.
- [Runtime errors](./errors/layout-configuration.md): configuration failures and how to resolve them; the Errors section lists every error for this release.

[Shared factory](./guides/shared-factory.md) and [Resource routing](./guides/resource-routing.md) show a larger application organized around reusable page chrome and resource-local states. They are adapted from [glammed-by-arielie PR #65](https://github.com/jfdevelops/glammed-by-arielie/pull/65).

## Vocabulary

| Term | Purpose |
| --- | --- |
| Resource | A typed application key, such as `services` or `builder.homepage`. |
| Option | A schema-backed value used when creating a page, such as its title. |
| Composable | A named component wrapping a UI primitive or a reusable state. |
| Render state | A named page variant, such as `default`, `Loading`, or `Detail`. |
| Resource config | A tree mapping resources and branches to route component slots. |
| Hosted surface | A separate layout family attached to a resource, such as a detail pane. |

## Find a guide

- [Resources and layouts](./guides/resource-layouts.md): resource trees, naming, namespaces, and persistent shells.
- [Props and validation](./guides/props-and-validation.md): creation-time options and component-time values.
- [Composables and presets](./guides/composables-and-presets.md): reuse your design system and preset contracts.
- [Render states](./guides/render-states.md): compose, inherit, and derive state definitions.
- [Route components](./guides/route-components.md): config fragments, lookups, and shared renderers.
- [Lazy loading](./guides/lazy-loading.md): module boundaries, download fallbacks, errors, and preloading.
- [Hosted surfaces](./guides/hosted-surfaces.md): panes and overlays with their own contracts.
- [Reusable helpers](./guides/reusable-helpers.md): functions sharing your schemas and resources.
- [Develop and debug](./guides/develop-and-debug.md): inspect and preview layouts.
- [Troubleshooting](./guides/troubleshooting.md) and [Migration](./guides/migration.md).
- [API reference](./reference/index.md): generated from the public TypeScript entry point.

## Plugins and devtools

- [Adapters](./plugins/adapters.md): React value schemas for ArkType, Zod, Valibot, and Effect.
- [Composables](./plugins/composables.md): named slots and preset contracts.
- [Devtools](./devtools.md): the React inspector and Vite integration.

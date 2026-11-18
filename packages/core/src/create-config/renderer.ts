import { createElement, Fragment } from 'react';
import {
  capitalize,
  resolveStringSelection,
} from '@jfdevelops/react-layout-internals';
import { validateProps } from '@jfdevelops/react-layout-validator';
import type { PropDefinitions } from '@jfdevelops/react-layout-validator';
import { InvalidPathError } from '../errors';
import type { ResourceDefinition } from '../resource';
import { collectPathComponentKeys, generateResourceConfigPaths } from './paths';
import { selectPathConfig } from './for-paths/selection';
import { createDisplayNamePath } from './display-name-path';
import { COMPONENT_SLOT_KEYS } from './component-keys';
import type { ForPathsRenderContext } from './for-paths/builder';
import type { PropsRenderDefinition } from '../props';
import { createTargetPathBuilder } from './for-paths/builder';
import {
  createScopedGetComponentForPath,
  createGetComponentForPath,
} from './for-paths/get-component-for-path';
import {
  createPathParams,
  validatePathParamsOptions,
} from './for-paths/params';
import type {
  CreateResourceRenderer,
  RendererDefinition,
} from './renderer-types';

type RuntimeContext<Config> = ForPathsRenderContext<
  readonly ResourceDefinition[],
  Config,
  readonly string[],
  Record<string, unknown>
> & { path: string };

type RuntimeOptions<Config> = RendererDefinition<RuntimeContext<Config>> & {
  factory?: PropsRenderDefinition<
    PropDefinitions,
    Record<string, unknown>,
    unknown,
    { context: Record<string, unknown> }
  >;
};

/** Creates the runtime path selector behind the inferred resource renderer API. */
export function createResourceRenderer<
  Resources extends readonly ResourceDefinition[],
  Config extends Record<string, unknown>,
>(config: Config): CreateResourceRenderer<Resources, Config> {
  function createRenderer(options: RuntimeOptions<Record<string, unknown>>) {
    const params = options.params ?? {};
    validatePathParamsOptions(params);
    const pick =
      typeof params.include?.path === 'object'
        ? params.include.path.pick
        : undefined;
    const selectedConfig = selectPathConfig(config, pick);
    const paths = generateResourceConfigPaths(selectedConfig).filter((path) =>
      collectPathComponentKeys(selectedConfig, path).some((key) =>
        COMPONENT_SLOT_KEYS.some((slot) => slot === key),
      ),
    );
    const displayNamePaths = [
      ...new Set(
        paths.flatMap((path) => {
          const segments = path.split('.');
          const tail = segments.at(-1);

          if (
            tail === '$component' ||
            COMPONENT_SLOT_KEYS.some((key) => key === tail)
          ) {
            return [];
          }

          return segments.map((_, index) =>
            segments.slice(0, index + 1).join('.'),
          );
        }),
      ),
    ];

    function makeScope(
      prefix: string,
      render: RuntimeOptions<Record<string, unknown>>['render'],
      useFactory = true,
    ) {
      const hasDescendants = displayNamePaths.some(
        (path) => !prefix || path.startsWith(`${prefix}.`),
      );

      function withDescendants<Value extends object>(
        value: Value,
        renderer = render,
        factoryEnabled = useFactory,
      ) {
        return hasDescendants
          ? Object.assign(value, {
              forResource: (path: string) =>
                makeScope(prefix, renderer, factoryEnabled)(path),
            })
          : value;
      }

      /** A scope is a page, or a parent whose descendants include a page. */
      function assertScope(path: string) {
        if (
          !paths.includes(path) &&
          !paths.some((candidate) => candidate.startsWith(`${path}.`))
        ) {
          throw new InvalidPathError({
            path,
            validPaths: paths,
          });
        }
      }

      function checkPath(path: string) {
        const fullPath = prefix ? `${prefix}.${path}` : path;

        assertScope(fullPath);

        return fullPath;
      }

      function build() {
        assertScope(prefix);

        function makeBuilder(
          renderer: RuntimeOptions<Record<string, unknown>>['render'],
        ) {
          const configured = createTargetPathBuilder(selectedConfig, [
            prefix,
          ]).addParams(params);

          function buildContext(
            context: Pick<
              RuntimeContext<Record<string, unknown>>,
              'params' | 'children'
            >,
          ) {
            return {
              ...context,
              path: prefix,
              getComponentForPath: createScopedGetComponentForPath(
                selectedConfig,
                [prefix],
                context.params,
              ),
            };
          }

          const component = configured.render((context) =>
            createElement(Fragment, null, renderer(buildContext(context))),
          );
          const configuredName = options.displayName;
          const mappingKey =
            typeof configuredName === 'object'
              ? Object.keys(configuredName)
                  .filter(
                    (key) =>
                      key !== '*' &&
                      (prefix === key || prefix.startsWith(`${key}.`)),
                  )
                  .sort((left, right) => right.length - left.length)[0]
              : undefined;
          const displayName =
            typeof configuredName === 'object'
              ? configuredName[mappingKey ?? '*']
              : configuredName;

          const named =
            displayName === undefined
              ? component
              : component.setDisplayName(
                  typeof displayName === 'string'
                    ? displayName
                    : (context) =>
                        displayName({
                          ...buildContext(context),
                          capitalize,
                          path: createDisplayNamePath(prefix, displayNamePaths),
                        }),
                );

          return withDescendants(
            Object.assign(named, {
              render: makeBuilder,
            }),
            renderer,
            false,
          );
        }

        const Component = makeBuilder(render);
        const factory = useFactory ? options.factory : undefined;

        if (!factory) {
          return Component;
        }

        const pathParams = createPathParams(selectedConfig, [prefix], params);
        const renderFactory = factory.render;
        const factoryProps = factory.props ?? {};

        const createFactoryResult = (options: unknown = {}) => {
          if (
            typeof options !== 'object' ||
            options === null ||
            Array.isArray(options)
          ) {
            throw new TypeError('Renderer factory options must be an object.');
          }

          const componentKey =
            'component' in options ? options.component : undefined;
          const input =
            ('params' in options ? options.params : undefined) ?? {};
          const props = ('props' in options ? options.props : undefined) ?? {};

          if (typeof props !== 'object' || Array.isArray(props)) {
            throw new TypeError('Renderer factory props must be an object.');
          }
          if (componentKey !== undefined && typeof componentKey !== 'string') {
            throw new TypeError(
              'Renderer factory component must be a component key or "*".',
            );
          }

          if (componentKey !== undefined && !params.include?.keys) {
            throw new TypeError(
              'Renderer factory component requires included component keys.',
            );
          }

          if (
            typeof input !== 'object' ||
            input === null ||
            Array.isArray(input)
          ) {
            throw new TypeError('Renderer factory params must be an object.');
          }

          if ('componentKey' in input) {
            throw new TypeError(
              'Pass the component key in component, not params.',
            );
          }

          function evaluateFactory(input: Record<string, unknown>) {
            const values = pathParams.resolve(input, true);

            return renderFactory(
              validateProps(factoryProps, props as Record<string, unknown>),
              {
                context: {
                  ...values,
                  Component,
                },
              },
            );
          }

          if (componentKey !== undefined) {
            const keys = collectPathComponentKeys(
              selectedConfig,
              prefix,
            ).filter((key) => COMPONENT_SLOT_KEYS.some((slot) => slot === key));

            function evaluateComponent(componentKey: string) {
              return evaluateFactory({
                ...input,
                componentKey,
              });
            }

            return resolveStringSelection<Record<string, unknown>, string>(
              keys,
              componentKey,
              evaluateComponent,
              (keys) =>
                Object.fromEntries(
                  keys.map((key) => [key, evaluateComponent(key)]),
                ),
            );
          }

          return evaluateFactory({
            ...input,
            ...(componentKey === undefined
              ? {}
              : {
                  componentKey,
                }),
          });
        };

        return withDescendants(createFactoryResult);
      }

      function select(path: string) {
        const fullPath = checkPath(path);
        const getter = createGetComponentForPath(selectedConfig, fullPath);

        if (
          !paths.includes(fullPath) ||
          (!COMPONENT_SLOT_KEYS.some((key) => getter.isComponent(key)) &&
            paths.some((candidate) => candidate.startsWith(`${fullPath}.`)))
        ) {
          return makeScope(fullPath, render, useFactory);
        }

        return makeScope(fullPath, render, useFactory).build();
      }

      return withDescendants(
        Object.assign(select, {
          forPath: (path: string) =>
            makeScope(checkPath(path), render, useFactory),
          render: (
            renderer: RuntimeOptions<Record<string, unknown>>['render'],
          ) => makeScope(prefix, renderer, useFactory),
          build,
        }),
      );
    }

    return makeScope('', options.render);
  }

  return createRenderer as unknown as CreateResourceRenderer<Resources, Config>;
}

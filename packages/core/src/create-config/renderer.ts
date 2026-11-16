import { createElement, Fragment } from 'react';
import { validateProps } from '@jfdevelops/react-layout-validator';
import type { PropDefinitions } from '@jfdevelops/react-layout-validator';
import { InvalidPathError } from '../errors';
import type { ResourceDefinition } from '../resource';
import { collectPathComponentKeys, generateResourceConfigPaths } from './paths';
import { selectPathConfig } from './for-paths/selection';
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

    function makeScope(
      prefix: string,
      render: RuntimeOptions<Record<string, unknown>>['render'],
    ) {
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
          const displayName = options.displayName;
          const named =
            displayName === undefined
              ? component
              : component.setDisplayName(
                  typeof displayName === 'string'
                    ? displayName
                    : (context) => displayName(buildContext(context)),
                );

          return Object.assign(named, {
            render: makeBuilder,
          });
        }

        const Component = makeBuilder(render);
        const factory = options.factory;

        if (!factory) {
          return Component;
        }

        const pathParams = createPathParams(selectedConfig, [prefix], params);

        return (
          supplied: unknown = {},
          props: Record<string, unknown> = {},
        ) => {
          if (typeof supplied === 'string' && !pathParams.canUseKeyShorthand) {
            throw new TypeError(
              'Component-key shorthand requires componentKey to be the only declared parameter.',
            );
          }

          const input =
            typeof supplied === 'string'
              ? {
                  componentKey: supplied,
                }
              : supplied;

          if (
            typeof input !== 'object' ||
            input === null ||
            Array.isArray(input)
          ) {
            throw new TypeError(
              'Renderer factory parameters must be an object or a component key.',
            );
          }

          const values = pathParams.resolve(
            input as Record<string, unknown>,
            true,
          );

          return factory.render(validateProps(factory.props ?? {}, props), {
            context: {
              ...values,
              Component,
            },
          });
        };
      }

      function select(path: string) {
        const fullPath = checkPath(path);
        const getter = createGetComponentForPath(selectedConfig, fullPath);

        if (
          !paths.includes(fullPath) ||
          (!COMPONENT_SLOT_KEYS.some((key) => getter.isComponent(key)) &&
            paths.some((candidate) => candidate.startsWith(`${fullPath}.`)))
        ) {
          return makeScope(fullPath, render);
        }

        return makeScope(fullPath, render).build();
      }

      return Object.assign(select, {
        forPath: (path: string) => makeScope(checkPath(path), render),
        render: (renderer: RuntimeOptions<Record<string, unknown>>['render']) =>
          makeScope(prefix, renderer),
        build,
      });
    }

    return makeScope('', options.render);
  }

  return createRenderer as unknown as CreateResourceRenderer<Resources, Config>;
}

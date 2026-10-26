import path from 'node:path';
import ts from 'typescript';
import MagicString from 'magic-string';
import type { Plugin } from 'vite';

export interface ReactLayoutDevtoolsOptions {
  /** Include the React inspector in production builds. Defaults to false. */
  production?: boolean;
  /** Enable temporary render-state previews. Defaults to true. */
  statePreview?: boolean;
  /** Add wrapper packages that re-export the layout API. Relative imports are recognized automatically. */
  imports?: readonly string[];
  /** Restrict instrumentation to matching module paths. */
  include?: RegExp;
  exclude?: RegExp;
}

const api = new Set([
  'createDefinedResourceLayout',
  'defineResourceLayout',
  'createResourceLayout',
  'createRenderState',
  'defineComposableComponent',
  'createLayoutBuildingBlocks',
  'createComposableComponent',
]);
const virtual = 'virtual:react-layout-devtools';
const resolvedVirtual = '\0' + virtual;

/** Development instrumentation and production bundle selection. */
export function reactLayoutDevtools(
  options: ReactLayoutDevtoolsOptions = {}
): Plugin {
  let root = process.cwd();
  let base = '/';
  let building = false;

  return {
    name: 'react-layout-devtools',
    enforce: 'pre',

    configResolved(config) {
      building = config.command === 'build';

      root = config.root;

      base = config.base.startsWith('/') ? config.base : '/';
    },

    async resolveId(id, importer) {
      if (id === virtual) return resolvedVirtual;

      if (building && id === '@jfdevelops/react-layout-devtools-react') {
        const entry = options.production ? 'production' : 'disabled';

        return this.resolve(`${id}/${entry}`, importer, { skipSelf: true });
      }
    },

    load(id) {
      if (id !== resolvedVirtual) return;

      return `const key = Symbol.for('@jfdevelops/react-layout/debug');
const registryKey = Symbol.for('@jfdevelops/react-layout/debug-registry');
const registry = globalThis[registryKey] ??= new WeakMap();
export function annotate(value, metadata) {
  if (value == null || (typeof value !== 'object' && typeof value !== 'function')) return value;
  const previous = registry.get(value) ?? value[key];
  const debug = { ...previous, ...metadata, source: previous?.source ?? metadata.source };
  registry.set(value, debug);
  try { Object.defineProperty(value, key, { value: debug, enumerable: true, configurable: true }); } catch {}
  return value;
}`;
    },

    transform(code, id, transformOptions) {
      const file = id.split('?')[0];

      const matches = (pattern: RegExp) => {
        pattern.lastIndex = 0;

        return pattern.test(file);
      };

      if (
        building ||
        transformOptions?.ssr ||
        file.includes('/node_modules/') ||
        !/\.[cm]?[jt]sx?$/.test(file) ||
        (options.include && !matches(options.include)) ||
        (options.exclude && matches(options.exclude))
      )
        return;

      const source = ts.createSourceFile(
        file,
        code,
        ts.ScriptTarget.Latest,
        true,
        /\.[jt]sx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      );
      // Resolve actual bindings so names in different lexical scopes never collide.
      const program = ts.createProgram(
        [file],
        { noLib: true, noResolve: true },
        {
          ...ts.createCompilerHost({}),
          getSourceFile: (name) => (name === file ? source : undefined),
          writeFile: () => {},
        }
      );
      const checker = program.getTypeChecker();

      const binding = (node: ts.Node) =>
        checker.getSymbolAtLocation(node) ?? node;

      const names = new Map<ts.Symbol | ts.Node, string>();
      const owners = new Set<ts.Symbol | ts.Node>();
      const creators = new Set<ts.Symbol | ts.Node>();

      for (const statement of source.statements) {
        if (
          !ts.isImportDeclaration(statement) ||
          !ts.isStringLiteral(statement.moduleSpecifier) ||
          statement.importClause?.isTypeOnly
        )
          continue;

        const module = statement.moduleSpecifier.text;

        if (
          !(
            module.startsWith('.') ||
            module.startsWith('@/') ||
            module.startsWith('@jfdevelops/react-layout') ||
            options.imports?.includes(module)
          )
        )
          continue;

        const bindings = statement.importClause?.namedBindings;

        if (bindings && ts.isNamespaceImport(bindings))
          owners.add(binding(bindings.name));

        if (bindings && ts.isNamedImports(bindings))
          for (const importedBinding of bindings.elements) {
            if (importedBinding.isTypeOnly) continue;

            const imported = (
              importedBinding.propertyName ?? importedBinding.name
            ).text;

            if (api.has(imported))
              names.set(binding(importedBinding.name), imported);
            else owners.add(binding(importedBinding.name));
          }
      }

      function callName(expression: ts.Expression): string | undefined {
        if (
          ts.isCallExpression(expression) &&
          ts.isPropertyAccessExpression(expression.expression) &&
          expression.expression.name.text === 'forResources' &&
          callName(expression.expression.expression) === 'defineResourceLayout'
        )
          return 'defineResourceLayout';

        if (ts.isIdentifier(expression)) {
          const symbol = binding(expression);

          return creators.has(symbol)
            ? 'createComposableComponent'
            : names.get(symbol);
        }

        if (!ts.isPropertyAccessExpression(expression)) return;

        const member = expression.name.text;

        if (
          api.has(member) &&
          ts.isIdentifier(expression.expression) &&
          owners.has(binding(expression.expression))
        )
          return member;

        if (api.has(member) && ts.isCallExpression(expression.expression)) {
          const producer = callName(expression.expression.expression);

          if (
            producer === 'createDefinedResourceLayout' ||
            (producer === 'defineResourceLayout' &&
              member === 'createResourceLayout')
          )
            return member;
        }

        if (
          ['lazy', 'defer', 'fromState', 'withLayout', 'forResource'].includes(
            member
          )
        )
          return callName(expression.expression);
      }

      function collectCreators(node: ts.Node | undefined) {
        if (!node || !ts.isObjectLiteralExpression(node)) return;

        for (const property of node.properties) {
          if (!ts.isPropertyAssignment(property)) continue;

          const key = property.name.getText(source).replaceAll(/['"]/g, '');

          if (
            key === 'composables' &&
            (ts.isArrowFunction(property.initializer) ||
              ts.isFunctionExpression(property.initializer))
          ) {
            const parameter = property.initializer.parameters[0];

            if (parameter && ts.isIdentifier(parameter.name))
              creators.add(binding(parameter.name));
          } else {
            collectCreators(property.initializer);
          }
        }
      }

      // Propagate bindings from factory/definition results and destructured helpers.
      function collect(node: ts.Node) {
        if (ts.isCallExpression(node) && callName(node.expression)) {
          collectCreators(node.arguments[0]);
        }

        if (
          ts.isVariableDeclaration(node) &&
          ts.isObjectBindingPattern(node.name) &&
          node.initializer &&
          ts.isIdentifier(node.initializer) &&
          owners.has(binding(node.initializer))
        ) {
          for (const element of node.name.elements) {
            if (!ts.isIdentifier(element.name)) continue;

            const key =
              element.propertyName && ts.isIdentifier(element.propertyName)
                ? element.propertyName.text
                : element.name.text;

            if (api.has(key)) names.set(binding(element.name), key);
          }
        }

        if (
          ts.isVariableDeclaration(node) &&
          node.initializer &&
          ts.isCallExpression(node.initializer) &&
          callName(node.initializer.expression)
        ) {
          if (ts.isIdentifier(node.name)) {
            if (
              ts.isPropertyAccessExpression(node.initializer.expression) &&
              node.initializer.expression.name.text === 'forResource'
            )
              names.set(binding(node.name), 'createResourceLayout');
            else owners.add(binding(node.name));
          }

          if (ts.isObjectBindingPattern(node.name))
            for (const element of node.name.elements) {
              if (!ts.isIdentifier(element.name)) continue;

              const key =
                element.propertyName && ts.isIdentifier(element.propertyName)
                  ? element.propertyName.text
                  : element.name.text;

              if (api.has(key)) names.set(binding(element.name), key);
            }
        }

        if (
          ts.isVariableDeclaration(node) &&
          ts.isIdentifier(node.name) &&
          node.initializer &&
          ts.isCallExpression(node.initializer) &&
          ts.isPropertyAccessExpression(node.initializer.expression) &&
          node.initializer.expression.name.text === 'forResources' &&
          callName(node.initializer.expression.expression) ===
            'defineResourceLayout'
        )
          names.set(binding(node.name), 'defineResourceLayout');

        ts.forEachChild(node, collect);
      }

      collect(source);

      let helper = '__reactLayoutDebug';

      while (code.includes(helper)) helper += '_';

      const output = new MagicString(code);
      const wrapped = new Set<number>();

      function annotate(node: ts.Expression, at: ts.Node = node) {
        const start = node.getStart(source);

        if (wrapped.has(start)) return;

        wrapped.add(start);

        const point = source.getLineAndCharacterOfPosition(at.getStart(source));
        const absolute = path.resolve(file).replaceAll('\\', '/');
        const location = {
          file: path.relative(root, absolute).replaceAll('\\', '/'),
          line: point.line + 1,
          column: point.character + 1,
          editorUrl: `${base}__open-in-editor?file=${encodeURIComponent(
            `${absolute}:${point.line + 1}:${point.character + 1}`
          )}`,
        };

        output.appendLeft(start, `${helper}(`);

        output.appendLeft(
          node.end,
          `, ${JSON.stringify({
            source: location,
            preview: options.statePreview ?? true,
          })})`
        );
      }

      function inlineStates(node: ts.Expression) {
        if (!ts.isObjectLiteralExpression(node)) return;

        for (const property of node.properties) {
          if (!ts.isPropertyAssignment(property)) continue;

          const key = property.name.getText(source).replaceAll(/['"]/g, '');

          if (key === 'layout') inlineStates(property.initializer);

          if (
            key !== 'render' ||
            !ts.isObjectLiteralExpression(property.initializer)
          )
            continue;

          for (const state of property.initializer.properties) {
            if (ts.isPropertyAssignment(state))
              annotate(state.initializer, state);

            if (ts.isShorthandPropertyAssignment(state)) {
              // Preserve the shorthand's key while wrapping its value.
              output.prependLeft(
                state.getStart(source),
                `${state.name.text}: `
              );

              annotate(state.name, state);
            }
          }
        }
      }

      function visit(node: ts.Node) {
        if (
          ts.isCallExpression(node) &&
          callName(node.expression) &&
          node.arguments[0] &&
          !ts.isSpreadElement(node.arguments[0])
        ) {
          annotate(node.arguments[0], node);

          inlineStates(node.arguments[0]);
        }

        ts.forEachChild(node, visit);
      }

      visit(source);

      if (!wrapped.size) return;

      let importOffset = code.startsWith('#!') ? code.indexOf('\n') + 1 : 0;

      for (const statement of source.statements) {
        if (
          ts.isExpressionStatement(statement) &&
          ts.isStringLiteral(statement.expression)
        )
          importOffset = statement.end;
        else break;
      }

      output.appendLeft(
        importOffset,
        `\nimport { annotate as ${helper} } from ${JSON.stringify(virtual)};\n`
      );

      return {
        code: output.toString(),
        map: output.generateMap({
          source: file,
          includeContent: true,
          hires: true,
        }),
      };
    },
  };
}

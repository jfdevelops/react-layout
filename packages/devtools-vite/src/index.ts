import path from 'node:path';
import ts from 'typescript';
import MagicString from 'magic-string';
import type { Plugin } from 'vite';

export interface ReactLayoutDevtoolsOptions {
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
/** Development-only instrumentation; never applied to production builds or SSR transforms. */
export function reactLayoutDevtools(
  options: ReactLayoutDevtoolsOptions = {}
): Plugin {
  let root = process.cwd();
  let base = '/';
  return {
    name: 'react-layout-devtools',
    enforce: 'pre',
    apply: 'serve',
    configResolved(config) {
      root = config.root;
      base = config.base.startsWith('/') ? config.base : '/';
    },
    resolveId(id) {
      if (id === virtual) return resolvedVirtual;
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
      const names = new Map<string, string>();
      const owners = new Set<string>();
      const creators = new Set<ts.ParameterDeclaration>();
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
          owners.add(bindings.name.text);
        if (bindings && ts.isNamedImports(bindings))
          for (const binding of bindings.elements) {
            if (binding.isTypeOnly) continue;
            const imported = (binding.propertyName ?? binding.name).text;
            if (api.has(imported)) names.set(binding.name.text, imported);
            else owners.add(binding.name.text);
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
          for (
            let parent: ts.Node | undefined = expression.parent;
            parent;
            parent = parent.parent
          ) {
            if (ts.isFunctionLike(parent)) {
              const parameter = parent.parameters.find(
                (parameter) =>
                  ts.isIdentifier(parameter.name) &&
                  parameter.name.text === expression.text
              );
              if (parameter)
                return creators.has(parameter)
                  ? 'createComposableComponent'
                  : undefined;
            }
          }
          return names.get(expression.text);
        }
        if (!ts.isPropertyAccessExpression(expression)) return;
        const member = expression.name.text;
        if (
          api.has(member) &&
          ts.isIdentifier(expression.expression) &&
          owners.has(expression.expression.text)
        )
          return member;
        if (
          ['lazy', 'defer', 'fromState', 'withLayout', 'forResource'].includes(
            member
          )
        )
          return callName(expression.expression);
      }
      // Propagate bindings from factory/definition results and destructured helpers.
      function collect(node: ts.Node) {
        if (
          ts.isPropertyAssignment(node) &&
          node.name.getText(source) === 'composables' &&
          (ts.isArrowFunction(node.initializer) ||
            ts.isFunctionExpression(node.initializer)) &&
          node.initializer.parameters[0]
        )
          creators.add(node.initializer.parameters[0]);
        if (
          ts.isVariableDeclaration(node) &&
          ts.isObjectBindingPattern(node.name) &&
          node.initializer &&
          ts.isIdentifier(node.initializer) &&
          owners.has(node.initializer.text)
        ) {
          for (const binding of node.name.elements) {
            if (!ts.isIdentifier(binding.name)) continue;
            const key =
              binding.propertyName && ts.isIdentifier(binding.propertyName)
                ? binding.propertyName.text
                : binding.name.text;
            if (api.has(key)) names.set(binding.name.text, key);
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
              names.set(node.name.text, 'createResourceLayout');
            else owners.add(node.name.text);
          }
          if (ts.isObjectBindingPattern(node.name))
            for (const binding of node.name.elements) {
              if (!ts.isIdentifier(binding.name)) continue;
              const key =
                binding.propertyName && ts.isIdentifier(binding.propertyName)
                  ? binding.propertyName.text
                  : binding.name.text;
              if (api.has(key)) names.set(binding.name.text, key);
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
          names.set(node.name.text, 'defineResourceLayout');
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

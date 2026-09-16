// Generic AST helpers shared by every compiler pass (F05 di-resolver, F06 slicer, F07 code-generator,
// F09 schema extractor). Nothing here knows about modules, providers or tokens: it only reads decorators,
// validates statically analyzable arrays (REQ-036) and resolves identifiers/types back to a concrete
// `ClassDeclaration` (REQ-033). Deciding whether an unresolved node is an error belongs to the caller.
import {Node, SyntaxKind, type ClassDeclaration, type Symbol as TsSymbol, type Type} from 'ts-morph';
import {CompilerError} from '#/compiler/errors';

/** `SAH100`: metadata the compiler cannot analyze statically (REQ-036). */
const NOT_ANALYZABLE = '100';

/** Human readable name of a `SyntaxKind`, for error messages. */
function kindName(kind: SyntaxKind): string {
  return SyntaxKind[kind] ?? String(kind);
}

/**
 * First argument of `@<decoratorName>(...)` applied to `node`, or `undefined` when there is no such
 * decorator, when it is used without a call (`@Marker`) or when it is called without arguments.
 *
 * Never throws: a missing decorator is a normal outcome (a class without `@Global()`, a parameter without
 * `@Inject(...)`), so the caller decides whether the absence matters. Nodes that cannot hold decorators
 * (anything that is not a class, method, property or parameter) also yield `undefined`.
 */
export function readDecoratorArgument(node: Node, decoratorName: string): Node | undefined {
  if (!Node.isDecoratable(node)) {
    return undefined;
  }

  return node.getDecorator(decoratorName)?.getArguments()[0];
}

/**
 * Elements of a statically analyzable array literal (`imports`, `controllers`, `providers`, `exports`,
 * `inject`...), in source order.
 *
 * `undefined`/`null` means the metadata key is absent, which is not an error: the result is an empty array.
 * Anything else must be an `ArrayLiteralExpression` whose every element is one of `allowedKinds` — the first
 * element outside that set (a `SpreadElement`, a `ConditionalExpression`, a call the compiler does not
 * recognize) throws `SAH100` pointing at that element's own file and line (REQ-036).
 */
export function readAnalyzableArray(
  arrayLiteralOrUndefined: Node | undefined | null,
  allowedKinds: readonly SyntaxKind[]
): Node[] {
  if (!arrayLiteralOrUndefined) {
    return [];
  }

  const arrayLiteral = arrayLiteralOrUndefined.asKind(SyntaxKind.ArrayLiteralExpression);
  if (!arrayLiteral) {
    throw new CompilerError(
      NOT_ANALYZABLE,
      `expected a static array literal, got \`${arrayLiteralOrUndefined.getKindName()}\``,
      arrayLiteralOrUndefined
    );
  }

  const elements = arrayLiteral.getElements();
  for (const element of elements) {
    if (!allowedKinds.includes(element.getKind())) {
      throw new CompilerError(
        NOT_ANALYZABLE,
        `\`${element.getKindName()}\` is not statically analyzable here, expected one of ` +
          `${allowedKinds.map(kindName).join(', ')}`,
        element
      );
    }
  }

  return elements;
}

/**
 * `ClassDeclaration` an identifier (or any node carrying a symbol) points at, following import aliases as
 * far as needed — chained barrels (`export * from`) included.
 *
 * Returns `undefined` for anything that is not a class (interface, type alias, primitive, const token):
 * the caller decides whether that deserves `SAH101`/`SAH103`.
 */
export function resolveIdentifierToClass(node: Node): ClassDeclaration | undefined {
  return findClassDeclaration(node.getSymbol());
}

/**
 * `ClassDeclaration` behind a type, used for constructor parameters without `@Inject(...)` (REQ-033).
 *
 * Resolves the *direct* type only, on purpose: generic wrappers (`Promise<Foo>`) and unions (`Foo | Bar`,
 * therefore `Foo | undefined` too) yield `undefined` instead of being unwrapped, so that unwrapping policy
 * stays a single decision inside `di-resolver.ts`.
 */
export function resolveTypeToClass(type: Type): ClassDeclaration | undefined {
  if (type.isUnion() || type.isIntersection()) {
    return undefined;
  }

  return findClassDeclaration(type.getSymbol());
}

/**
 * Walks the alias chain of a symbol until a `ClassDeclaration` shows up. Each hop is one `export`/`import`
 * indirection, so the visited set only guards against a malformed circular alias.
 */
function findClassDeclaration(symbol: TsSymbol | undefined): ClassDeclaration | undefined {
  const visited = new Set<unknown>();
  let current = symbol;

  while (current && !visited.has(current.compilerSymbol)) {
    visited.add(current.compilerSymbol);

    const classDeclaration = current.getDeclarations().find(Node.isClassDeclaration);
    if (classDeclaration) {
      return classDeclaration;
    }

    current = current.getAliasedSymbol();
  }

  return undefined;
}

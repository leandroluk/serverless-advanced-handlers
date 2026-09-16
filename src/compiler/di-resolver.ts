// Ahead-of-time dependency-injection resolver (F05): walks `@Module` metadata from a root module and
// produces a fully resolved `AppGraph` — modules, providers, constructor dependencies, the effective
// registry, and a leaves-first topological order — without ever executing the user's code
// (REQ-030..REQ-037).
//
// Everything is read from the AST through `ast-analyzer.ts`, and every rejection is a `CompilerError`
// carrying its own file and line (`SAH100`..`SAH105`). Code generation belongs to F06/F07: nothing is
// emitted here.
import {
  Node,
  SyntaxKind,
  VariableDeclarationKind,
  type ClassDeclaration,
  type ConstructorDeclaration,
  type ObjectLiteralExpression,
  type Project,
  type Symbol as TsSymbol,
  type VariableDeclaration,
} from 'ts-morph';
import {
  readAnalyzableArray,
  readDecoratorArgument,
  resolveIdentifierToClass,
  resolveTypeToClass,
} from '#/compiler/ast-analyzer';
import {CompilerError} from '#/compiler/errors';

/** `SAH100`: metadata that cannot be analyzed statically (REQ-036). */
const NOT_ANALYZABLE = '100';
/** `SAH101`: token not visible from the module that injects it. */
const TOKEN_NOT_FOUND = '101';
/** `SAH102`: dependency cycle (REQ-037). */
const DEPENDENCY_CYCLE = '102';
/** `SAH103`: constructor parameter without `@Inject(...)` whose type is not a class (REQ-033). */
const UNRESOLVED_PARAMETER = '103';
/** `SAH104`: provider exists in an imported module but is missing from its `exports`. */
const NOT_EXPORTED = '104';
/** `SAH105`: dynamic module argument outside the analyzable subset (REQ-034). */
const DYNAMIC_ARGUMENT = '105';

/** Keys accepted inside `@Module({...})`. */
const MODULE_KEYS: readonly string[] = ['imports', 'controllers', 'providers', 'exports'];
/** Keys accepted inside an object provider (`{provide, use*}`). */
const PROVIDER_KEYS: readonly string[] = [
  'provide',
  'useClass',
  'useValue',
  'useFactory',
  'useExisting',
  'inject',
  'scope',
];
/** The four mutually exclusive provider shapes (REQ-032). */
const USE_KEYS: readonly ['useClass', 'useValue', 'useFactory', 'useExisting'] = [
  'useClass',
  'useValue',
  'useFactory',
  'useExisting',
];

/** `imports` accepts a module class or a dynamic module call (`X.forRoot({...})`). */
const IMPORT_KINDS = [SyntaxKind.Identifier, SyntaxKind.CallExpression] as const;
/** `controllers` accepts class identifiers only. */
const CONTROLLER_KINDS = [SyntaxKind.Identifier] as const;
/** `providers` accepts a class identifier or one of the object provider shapes. */
const PROVIDER_KINDS = [SyntaxKind.Identifier, SyntaxKind.ObjectLiteralExpression] as const;
/** `exports` accepts a token identifier or a string token. */
const EXPORT_KINDS = [SyntaxKind.Identifier, SyntaxKind.StringLiteral] as const;
/** `inject` accepts a token or `{token, optional: true}`. */
const INJECT_KINDS = [SyntaxKind.Identifier, SyntaxKind.StringLiteral, SyntaxKind.ObjectLiteralExpression] as const;

/**
 * Normalized DI token key.
 *
 * Classes and constant tokens (`InjectionToken`, `Symbol`, exported `const`) are keyed by the identity of
 * their own `ts-morph` declaration node — valid for the lifetime of a single compilation pass — so no
 * synthetic name has to be invented and barrels/aliases collapse to the same key. String tokens are keyed
 * by their literal value.
 */
export type TokenKey = ClassDeclaration | VariableDeclaration | string;

/** Lifetime of a provider instance (REQ-031); mirrors the runtime `Scope` enum values. */
export type ProviderScope = 'default' | 'request';

/** Provider shape declared in a module (REQ-032). */
export type ProviderKind = 'class' | 'useClass' | 'useValue' | 'useFactory' | 'useExisting';

/** A single provider of a module, with its dependencies already resolved to tokens. */
export interface ProviderResolution {
  /** Token this provider answers to. */
  token: TokenKey;
  /** Which of the provider shapes declared it. */
  kind: ProviderKind;
  /** Class to instantiate — `'class'` and `'useClass'` only. */
  classDecl?: ClassDeclaration;
  /** Factory expression — `'useFactory'` only. Analyzed, never executed. */
  factoryDecl?: Node;
  /** Aliased token — `'useExisting'` only. */
  existingToken?: TokenKey;
  /** Instance lifetime (REQ-031). */
  scope: ProviderScope;
  /** Constructor parameters (`'class'`/`'useClass'`) or `inject` entries (`'useFactory'`), in order. */
  deps: TokenKey[];
  /** Indexes of `deps` marked `@Optional()` / `{optional: true}`. */
  optionalDeps: Set<number>;
  /** Module that declares this provider. */
  sourceModule: ModuleNode;
  /** Node the provider was declared at, used as the anchor of later diagnostics. */
  declarationNode: Node;
}

/** A `@Module` class and everything it declares. */
export interface ModuleNode {
  classDecl: ClassDeclaration;
  /** `@Global()`: this module's `exports` are visible from every module (REQ-030). */
  isGlobal: boolean;
  /** Modules listed in `imports`, in source order; a dynamic module resolves to its base class. */
  imports: ModuleNode[];
  controllers: ClassDeclaration[];
  /** Providers declared by *this* module only. */
  providers: ProviderResolution[];
  /** Tokens this module exposes to whoever imports it — not transitive. */
  exports: TokenKey[];
}

/** Fully resolved application, consumed by the slicer (F06) and the code generator (F07). */
export interface AppGraph {
  rootModule: ModuleNode;
  /** Every module reached from the root, keyed by its class. */
  modules: Map<ClassDeclaration, ModuleNode>;
  /** Effective registry of every provider of the application, keyed by token. */
  providers: Map<TokenKey, ProviderResolution>;
  /** Every controller, from every module. */
  controllers: ClassDeclaration[];
  /** Topological order of every provider token, leaves first. */
  order: TokenKey[];
}

/** Constructor/factory dependencies of a node, before the scope lookup validates them. */
interface Dependencies {
  deps: TokenKey[];
  optionalDeps: Set<number>;
  /** Node that declared each dep (parameter or `inject` element), for diagnostics. */
  depNodes: Node[];
  /** Optional deps that resolved to no provider: kept out of the graph instead of failing (REQ-033). */
  missing: Set<number>;
}

/** A controller's resolved dependencies; `ModuleNode.controllers` only keeps the class itself. */
interface ControllerResolution extends Dependencies {
  classDecl: ClassDeclaration;
  sourceModule: ModuleNode;
}

/** Node of the dependency graph used for cycle detection and topological ordering. */
interface GraphNode {
  key: TokenKey;
  edges: TokenKey[];
  /** Controllers take part in cycle detection but are not part of `AppGraph.order`. */
  isProvider: boolean;
  declarationNode: Node;
}

/** DFS coloring of the cycle detection pass. */
type Color = 'visiting' | 'done';

/**
 * Resolves the whole dependency-injection graph of an application, starting at its root `@Module` class.
 *
 * `project` is the already-loaded `ts-morph` project the root module belongs to; discovering it from
 * `serverless.yml` is the plugin's job (F10). Nothing is generated here — the returned `AppGraph` is the
 * input of the slicer (F06) and of the code generator (F07).
 *
 * Throws a `CompilerError` (`SAH100`..`SAH105`) at the first offending node, always with its real file and
 * line, so a broken configuration fails the build instead of failing at runtime.
 */
export function resolveAppGraph(project: Project, rootModule: ClassDeclaration): AppGraph {
  void project;
  return new AppGraphBuilder().build(rootModule);
}

/** One-shot builder: all mutable state of a single resolution pass lives here. */
class AppGraphBuilder {
  private readonly modules = new Map<ClassDeclaration, ModuleNode>();
  private readonly registry = new Map<TokenKey, ProviderResolution>();
  private readonly globalRegistry = new Map<TokenKey, ProviderResolution>();
  private readonly controllers: ClassDeclaration[] = [];
  private readonly controllerResolutions: ControllerResolution[] = [];
  private readonly providerDeps = new Map<ProviderResolution, Dependencies>();

  build(rootModule: ClassDeclaration): AppGraph {
    const root = this.visitModule(rootModule);

    this.buildRegistries();
    this.validateDependencies();

    const graph = this.buildGraph();

    return {
      rootModule: root,
      modules: this.modules,
      providers: this.registry,
      controllers: this.controllers,
      order: this.sortTopologically(graph),
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Step 2 — recursive module scan
  // ---------------------------------------------------------------------------------------------

  /** Reads one module and everything it declares, reusing the node when a module is imported twice. */
  private visitModule(classDecl: ClassDeclaration): ModuleNode {
    const known = this.modules.get(classDecl);
    if (known) {
      return known;
    }

    const metadata = this.readModuleMetadata(classDecl);
    const moduleNode: ModuleNode = {
      classDecl,
      isGlobal: classDecl.getDecorator('Global') !== undefined,
      imports: [],
      controllers: [],
      providers: [],
      exports: [],
    };
    // Registered before recursing: two modules importing each other is legal and must not loop.
    this.modules.set(classDecl, moduleNode);

    for (const element of readAnalyzableArray(metadata.get('imports'), IMPORT_KINDS)) {
      moduleNode.imports.push(this.visitModule(this.resolveImport(element)));
    }

    for (const element of readAnalyzableArray(metadata.get('controllers'), CONTROLLER_KINDS)) {
      const controller = this.expectClass(element, 'controller');
      moduleNode.controllers.push(controller);
      if (!this.controllers.includes(controller)) {
        this.controllers.push(controller);
      }
      this.controllerResolutions.push({
        classDecl: controller,
        sourceModule: moduleNode,
        ...this.readConstructorDependencies(controller),
      });
    }

    for (const element of readAnalyzableArray(metadata.get('providers'), PROVIDER_KINDS)) {
      moduleNode.providers.push(this.readProvider(element, moduleNode));
    }

    for (const element of readAnalyzableArray(metadata.get('exports'), EXPORT_KINDS)) {
      moduleNode.exports.push(this.resolveToken(element, '`exports`'));
    }

    return moduleNode;
  }

  /** `@Module({...})` metadata as a key → initializer map, rejecting anything not statically readable. */
  private readModuleMetadata(classDecl: ClassDeclaration): Map<string, Node> {
    const argument = readDecoratorArgument(classDecl, 'Module');
    if (!argument) {
      throw new CompilerError(
        NOT_ANALYZABLE,
        `\`${className(classDecl)}\` is used as a module but has no \`@Module({...})\` metadata`,
        classDecl
      );
    }

    const object = argument.asKind(SyntaxKind.ObjectLiteralExpression);
    if (!object) {
      throw new CompilerError(
        NOT_ANALYZABLE,
        `\`@Module(...)\` expects an object literal, got \`${argument.getKindName()}\``,
        argument
      );
    }

    const metadata = new Map<string, Node>();
    for (const property of object.getProperties()) {
      const assignment = property.asKind(SyntaxKind.PropertyAssignment);
      const name = assignment?.getName();
      if (!assignment || !name || !MODULE_KEYS.includes(name)) {
        throw new CompilerError(
          NOT_ANALYZABLE,
          `\`@Module(...)\` only accepts the literal keys ${MODULE_KEYS.join(', ')}, got \`${property.getText()}\``,
          property
        );
      }
      metadata.set(name, this.expectInitializer(assignment));
    }

    return metadata;
  }

  /** Module class behind one `imports` element: a class identifier or `X.forRoot({...})` (REQ-034). */
  private resolveImport(element: Node): ClassDeclaration {
    if (Node.isIdentifier(element)) {
      return this.expectClass(element, 'imported module');
    }

    const call = element.asKindOrThrow(SyntaxKind.CallExpression);
    const callee = call.getExpression().asKind(SyntaxKind.PropertyAccessExpression);
    if (!callee) {
      throw new CompilerError(
        NOT_ANALYZABLE,
        `only \`Module.staticMethod(...)\` calls are recognized in \`imports\`, got \`${call.getText()}\``,
        call
      );
    }

    const moduleClass = resolveIdentifierToClass(callee.getExpression());
    if (!moduleClass) {
      throw new CompilerError(
        NOT_ANALYZABLE,
        `\`${callee.getExpression().getText()}\` does not resolve to a module class`,
        callee
      );
    }

    this.validateDynamicArguments(call.getArguments(), callee.getText());

    return moduleClass;
  }

  /**
   * Arguments of a dynamic module call must stay inside the analyzable subset: an object literal whose
   * values are literals, imported constants or `process.env.*` (REQ-034). They never take part in the DI
   * resolution itself — F06/F07 copy them into the generated code (design decision 3).
   */
  private validateDynamicArguments(argumentNodes: readonly Node[], calleeText: string): void {
    for (const argument of argumentNodes) {
      const object = argument.asKind(SyntaxKind.ObjectLiteralExpression);
      if (!object) {
        throw new CompilerError(
          DYNAMIC_ARGUMENT,
          `\`${calleeText}(...)\` expects an object literal argument, got \`${argument.getKindName()}\``,
          argument
        );
      }
      this.validateStaticObject(object);
    }
  }

  /** Every property of a dynamic module argument, recursively. */
  private validateStaticObject(object: ObjectLiteralExpression): void {
    for (const property of object.getProperties()) {
      const assignment = property.asKind(SyntaxKind.PropertyAssignment);
      if (!assignment) {
        throw new CompilerError(
          DYNAMIC_ARGUMENT,
          `only plain \`key: value\` properties are analyzable here, got \`${property.getText()}\``,
          property
        );
      }
      this.validateStaticValue(this.expectInitializer(assignment));
    }
  }

  /** One value of a dynamic module argument: literal, constant, `process.env.*`, object or array. */
  private validateStaticValue(value: Node): void {
    switch (value.getKind()) {
      case SyntaxKind.StringLiteral:
      case SyntaxKind.NoSubstitutionTemplateLiteral:
      case SyntaxKind.NumericLiteral:
      case SyntaxKind.TrueKeyword:
      case SyntaxKind.FalseKeyword:
      case SyntaxKind.NullKeyword:
        return;
      case SyntaxKind.ObjectLiteralExpression:
        this.validateStaticObject(value.asKindOrThrow(SyntaxKind.ObjectLiteralExpression));
        return;
      case SyntaxKind.ArrayLiteralExpression:
        for (const element of value.asKindOrThrow(SyntaxKind.ArrayLiteralExpression).getElements()) {
          this.validateStaticValue(element);
        }
        return;
      case SyntaxKind.PropertyAccessExpression:
        if (value.getText().startsWith('process.env.')) {
          return;
        }
        break;
      case SyntaxKind.Identifier:
        if (value.getText() === 'undefined' || isConstant(resolveIdentifierToVariable(value))) {
          return;
        }
        break;
      default:
        break;
    }

    throw new CompilerError(
      DYNAMIC_ARGUMENT,
      `\`${value.getText()}\` is not a literal, an imported constant or \`process.env.*\``,
      value
    );
  }

  // ---------------------------------------------------------------------------------------------
  // Steps 3 and 4 — providers, tokens and constructor dependencies
  // ---------------------------------------------------------------------------------------------

  /** One `providers` element: a bare class or one of the object provider shapes (REQ-032). */
  private readProvider(element: Node, moduleNode: ModuleNode): ProviderResolution {
    if (Node.isIdentifier(element)) {
      const classDecl = this.expectClass(element, 'provider');
      return this.provider(moduleNode, element, {
        token: classDecl,
        kind: 'class',
        classDecl,
        scope: this.classScope(classDecl),
        ...this.readConstructorDependencies(classDecl),
      });
    }

    const object = element.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const values = this.readProviderKeys(object);
    const token = this.resolveToken(this.requireKey(values, 'provide', object), '`provide`');
    const declared = USE_KEYS.filter(key => values.has(key));
    if (declared.length !== 1) {
      throw new CompilerError(
        NOT_ANALYZABLE,
        `a provider must declare exactly one of ${USE_KEYS.join(', ')}, got ${declared.length}`,
        object
      );
    }

    const scope = this.readScope(values.get('scope'));
    const inject = values.get('inject');

    if (declared[0] !== 'useFactory' && inject) {
      throw new CompilerError(NOT_ANALYZABLE, '`inject` is only valid together with `useFactory`', inject);
    }

    switch (declared[0]) {
      case 'useClass': {
        const classDecl = this.expectClass(this.requireKey(values, 'useClass', object), '`useClass`');
        return this.provider(moduleNode, element, {
          token,
          kind: 'useClass',
          classDecl,
          scope: scope ?? this.classScope(classDecl),
          ...this.readConstructorDependencies(classDecl),
        });
      }
      case 'useFactory': {
        return this.provider(moduleNode, element, {
          token,
          kind: 'useFactory',
          factoryDecl: this.requireKey(values, 'useFactory', object),
          scope: scope ?? 'default',
          ...this.readInjectDependencies(inject),
        });
      }
      case 'useExisting': {
        return this.provider(moduleNode, element, {
          token,
          kind: 'useExisting',
          existingToken: this.resolveToken(this.requireKey(values, 'useExisting', object), '`useExisting`'),
          scope: scope ?? 'default',
          ...emptyDependencies(),
        });
      }
      default: {
        return this.provider(moduleNode, element, {
          token,
          kind: 'useValue',
          scope: scope ?? 'default',
          ...emptyDependencies(),
        });
      }
    }
  }

  /** Assembles a `ProviderResolution` and keeps its diagnostic nodes aside. */
  private provider(
    moduleNode: ModuleNode,
    declarationNode: Node,
    parts: Omit<ProviderResolution, 'sourceModule' | 'declarationNode'> & Dependencies
  ): ProviderResolution {
    const {depNodes, missing, ...rest} = parts;
    const resolution: ProviderResolution = {...rest, sourceModule: moduleNode, declarationNode};

    this.providerDeps.set(resolution, {
      deps: resolution.deps,
      optionalDeps: resolution.optionalDeps,
      depNodes,
      missing,
    });

    return resolution;
  }

  /** Keys of an object provider, rejecting shorthand, spreads and unknown keys. */
  private readProviderKeys(object: ObjectLiteralExpression): Map<string, Node> {
    const values = new Map<string, Node>();

    for (const property of object.getProperties()) {
      const assignment = property.asKind(SyntaxKind.PropertyAssignment);
      const name = assignment?.getName();
      if (!assignment || !name || !PROVIDER_KEYS.includes(name)) {
        throw new CompilerError(
          NOT_ANALYZABLE,
          `a provider only accepts the literal keys ${PROVIDER_KEYS.join(', ')}; got \`${property.getText()}\``,
          property
        );
      }
      values.set(name, this.expectInitializer(assignment));
    }

    return values;
  }

  /** Constructor parameters of a class as tokens (REQ-033). */
  private readConstructorDependencies(classDecl: ClassDeclaration): Dependencies {
    const result = emptyDependencies();
    const constructorDecl = implementationConstructor(classDecl);
    if (!constructorDecl) {
      // Classe sem constructor próprio não herda os parâmetros do construtor da classe base — deps: [] mesmo que a base declare dependências. Limitação conhecida, sem suporte a herança nesta primeira versão do resolver.
      return result;
    }

    for (const [index, parameter] of constructorDecl.getParameters().entries()) {
      const injected = readDecoratorArgument(parameter, 'Inject');

      if (injected) {
        result.deps.push(this.resolveToken(injected, '`@Inject`'));
      } else if (parameter.getDecorator('Inject')) {
        throw new CompilerError(NOT_ANALYZABLE, '`@Inject(...)` requires a token argument', parameter);
      } else {
        const classToken = resolveTypeToClass(parameter.getType());
        if (!classToken) {
          const declaredType = parameter.getTypeNode()?.getText() ?? parameter.getType().getText();
          throw new CompilerError(
            UNRESOLVED_PARAMETER,
            `parameter \`${parameter.getName()}\` of \`${className(classDecl)}\` has no \`@Inject(...)\` and ` +
              `its type \`${declaredType}\` does not resolve to a class`,
            parameter
          );
        }
        result.deps.push(classToken);
      }

      result.depNodes.push(parameter);
      if (parameter.getDecorator('Optional')) {
        result.optionalDeps.add(index);
      }
    }

    return result;
  }

  /** `inject: [TOKEN, {token: OTHER, optional: true}]` of a factory provider (REQ-032). */
  private readInjectDependencies(inject: Node | undefined): Dependencies {
    const result = emptyDependencies();

    for (const [index, element] of readAnalyzableArray(inject, INJECT_KINDS).entries()) {
      const object = element.asKind(SyntaxKind.ObjectLiteralExpression);

      if (!object) {
        result.deps.push(this.resolveToken(element, '`inject`'));
        result.depNodes.push(element);
        continue;
      }

      const entry = new Map<string, Node>();
      for (const property of object.getProperties()) {
        const assignment = property.asKind(SyntaxKind.PropertyAssignment);
        const name = assignment?.getName();
        if (!assignment || !name || (name !== 'token' && name !== 'optional')) {
          throw new CompilerError(
            NOT_ANALYZABLE,
            `an \`inject\` entry is a token or \`{token, optional: true}\`, got \`${property.getText()}\``,
            property
          );
        }
        entry.set(name, this.expectInitializer(assignment));
      }

      const optional = entry.get('optional');
      if (!optional || optional.getKind() !== SyntaxKind.TrueKeyword) {
        throw new CompilerError(
          NOT_ANALYZABLE,
          `an \`inject\` entry object requires \`optional: true\`, got \`${object.getText()}\``,
          object
        );
      }

      result.deps.push(this.resolveToken(this.requireKey(entry, 'token', object), '`inject`'));
      result.depNodes.push(object);
      result.optionalDeps.add(index);
    }

    return result;
  }

  /** Token behind a `provide`/`@Inject`/`inject`/`exports` node (REQ-033). */
  private resolveToken(node: Node, context: string): TokenKey {
    const literal = node.asKind(SyntaxKind.StringLiteral);
    if (literal) {
      return literal.getLiteralValue();
    }

    if (Node.isIdentifier(node)) {
      const classToken = resolveIdentifierToClass(node);
      if (classToken) {
        return classToken;
      }

      const variableToken = resolveIdentifierToVariable(node);
      if (variableToken) {
        return variableToken;
      }
    }

    throw new CompilerError(
      NOT_ANALYZABLE,
      `\`${node.getText()}\` is not a statically analyzable token in ${context}`,
      node
    );
  }

  /** `@Injectable({scope})` of a class (REQ-031). */
  private classScope(classDecl: ClassDeclaration): ProviderScope {
    const options = readDecoratorArgument(classDecl, 'Injectable')?.asKind(SyntaxKind.ObjectLiteralExpression);
    const scope = options?.getProperty('scope')?.asKind(SyntaxKind.PropertyAssignment)?.getInitializer();

    return this.readScope(scope) ?? 'default';
  }

  /** `Scope.REQUEST` / `'request'` and their default counterparts; anything else is not analyzable. */
  private readScope(value: Node | undefined): ProviderScope | undefined {
    if (!value) {
      return undefined;
    }

    const name = Node.isPropertyAccessExpression(value)
      ? value.getName().toLowerCase()
      : value.asKind(SyntaxKind.StringLiteral)?.getLiteralValue();

    if (name === 'request' || name === 'default') {
      return name;
    }

    throw new CompilerError(
      NOT_ANALYZABLE,
      `\`scope\` must be \`Scope.DEFAULT\` or \`Scope.REQUEST\`, got \`${value.getText()}\``,
      value
    );
  }

  // ---------------------------------------------------------------------------------------------
  // Step 3 — effective registries
  // ---------------------------------------------------------------------------------------------

  /** Flattens every provider into the application registry, plus the `@Global()` visibility registry. */
  private buildRegistries(): void {
    for (const moduleNode of this.modules.values()) {
      for (const provider of moduleNode.providers) {
        // Token duplicado em módulos não relacionados (sem @Global): o primeiro provider varrido vence, silenciosamente — não há código SAH pra isso; decisão consciente, não lacuna.
        if (!this.registry.has(provider.token)) {
          this.registry.set(provider.token, provider);
        }
      }
    }

    for (const moduleNode of this.modules.values()) {
      if (!moduleNode.isGlobal) {
        continue;
      }
      for (const token of moduleNode.exports) {
        const exported = this.findExported(moduleNode, token, new Set());
        if (exported && !this.globalRegistry.has(token)) {
          this.globalRegistry.set(token, exported);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Step 5 — scope lookup
  // ---------------------------------------------------------------------------------------------

  /** Validates every dependency of every provider and controller against what its module can see. */
  private validateDependencies(): void {
    for (const moduleNode of this.modules.values()) {
      for (const provider of moduleNode.providers) {
        const dependencies = this.providerDeps.get(provider);
        if (dependencies) {
          this.validateNode(moduleNode, dependencies, provider.declarationNode);
        }
        if (provider.existingToken !== undefined) {
          this.requireVisible(moduleNode, provider.existingToken, provider.declarationNode);
        }
      }
    }

    for (const controller of this.controllerResolutions) {
      this.validateNode(controller.sourceModule, controller, controller.classDecl);
    }
  }

  /** Each dep must be visible from `moduleNode`, unless it is optional and simply absent. */
  private validateNode(moduleNode: ModuleNode, dependencies: Dependencies, fallbackNode: Node): void {
    for (const [index, token] of dependencies.deps.entries()) {
      const node = dependencies.depNodes[index] ?? fallbackNode;

      if (this.lookup(moduleNode, token)) {
        continue;
      }

      if (dependencies.optionalDeps.has(index)) {
        dependencies.missing.add(index);
        continue;
      }

      this.reportMissing(moduleNode, token, node);
    }
  }

  /** Same as `lookup`, but a miss is always a build error. */
  private requireVisible(moduleNode: ModuleNode, token: TokenKey, node: Node): void {
    if (!this.lookup(moduleNode, token)) {
      this.reportMissing(moduleNode, token, node);
    }
  }

  /**
   * Provider a module can see for a token: its own providers, then the `exports` of the modules it
   * imports *directly* (design decision 2 — `exports` is not transitive), then the `@Global()` registry.
   */
  private lookup(moduleNode: ModuleNode, token: TokenKey): ProviderResolution | undefined {
    const own = moduleNode.providers.find(provider => provider.token === token);
    if (own) {
      return own;
    }

    for (const imported of moduleNode.imports) {
      if (imported.exports.includes(token)) {
        const exported = this.findExported(imported, token, new Set());
        if (exported) {
          return exported;
        }
      }
    }

    return this.globalRegistry.get(token);
  }

  /** Provider behind an exported token, following re-exports (`exports` of an imported module). */
  private findExported(
    moduleNode: ModuleNode,
    token: TokenKey,
    visited: Set<ModuleNode>
  ): ProviderResolution | undefined {
    if (visited.has(moduleNode)) {
      return undefined;
    }
    visited.add(moduleNode);

    const own = moduleNode.providers.find(provider => provider.token === token);
    if (own) {
      return own;
    }

    for (const imported of moduleNode.imports) {
      if (imported.exports.includes(token)) {
        const exported = this.findExported(imported, token, visited);
        if (exported) {
          return exported;
        }
      }
    }

    return undefined;
  }

  /** `SAH104` when a directly imported module owns the provider but hides it, `SAH101` otherwise. */
  private reportMissing(moduleNode: ModuleNode, token: TokenKey, node: Node): never {
    const owner = moduleNode.imports.find(imported => imported.providers.some(provider => provider.token === token));

    if (owner) {
      throw new CompilerError(
        NOT_EXPORTED,
        `token \`${tokenLabel(token)}\` is provided by module \`${className(owner.classDecl)}\` but is not ` +
          `listed in its \`exports\`, so \`${className(moduleNode.classDecl)}\` cannot inject it`,
        node
      );
    }

    throw new CompilerError(
      TOKEN_NOT_FOUND,
      `token \`${tokenLabel(token)}\` is not visible from module \`${className(moduleNode.classDecl)}\`: no ` +
        'provider declares it, none of its imports exports it and no `@Global()` module registers it',
      node
    );
  }

  // ---------------------------------------------------------------------------------------------
  // Steps 6 and 7 — dependency graph, cycle detection and topological order
  // ---------------------------------------------------------------------------------------------

  /** Directed graph `provider|controller → resolved deps`, skipping optional deps that resolved to nothing. */
  private buildGraph(): Map<TokenKey, GraphNode> {
    const graph = new Map<TokenKey, GraphNode>();

    for (const moduleNode of this.modules.values()) {
      for (const provider of moduleNode.providers) {
        if (graph.has(provider.token)) {
          continue;
        }

        const dependencies = this.providerDeps.get(provider) ?? emptyDependencies();
        const edges = this.edgesOf(dependencies);
        if (provider.existingToken !== undefined) {
          edges.push(provider.existingToken);
        }

        graph.set(provider.token, {
          key: provider.token,
          edges,
          isProvider: true,
          declarationNode: provider.declarationNode,
        });
      }
    }

    for (const controller of this.controllerResolutions) {
      if (graph.has(controller.classDecl)) {
        continue;
      }
      graph.set(controller.classDecl, {
        key: controller.classDecl,
        edges: this.edgesOf(controller),
        isProvider: false,
        declarationNode: controller.classDecl,
      });
    }

    return graph;
  }

  /** Dependencies that really become edges: optional deps with no provider are dropped. */
  private edgesOf(dependencies: Dependencies): TokenKey[] {
    return dependencies.deps.filter((_token, index) => !dependencies.missing.has(index));
  }

  /** Post-order DFS: detects cycles (`SAH102`) and returns every provider token, leaves first. */
  private sortTopologically(graph: Map<TokenKey, GraphNode>): TokenKey[] {
    const colors = new Map<TokenKey, Color>();
    const path: TokenKey[] = [];
    const order: TokenKey[] = [];

    const visit = (key: TokenKey): void => {
      const color = colors.get(key);
      if (color === 'done') {
        return;
      }

      const node = graph.get(key);
      if (!node) {
        return;
      }

      if (color === 'visiting') {
        const cycle = [...path.slice(path.indexOf(key)), key];
        throw new CompilerError(
          DEPENDENCY_CYCLE,
          `dependency cycle detected: ${cycle.map(tokenLabel).join(' -> ')}`,
          node.declarationNode
        );
      }

      colors.set(key, 'visiting');
      path.push(key);

      for (const edge of node.edges) {
        visit(edge);
      }

      path.pop();
      colors.set(key, 'done');

      if (node.isProvider) {
        order.push(key);
      }
    };

    for (const key of graph.keys()) {
      visit(key);
    }

    return order;
  }

  // ---------------------------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------------------------

  /** Class behind an identifier, or `SAH100` naming the role the identifier was playing. */
  private expectClass(node: Node, role: string): ClassDeclaration {
    const classDecl = resolveIdentifierToClass(node);
    if (!classDecl) {
      throw new CompilerError(
        NOT_ANALYZABLE,
        `\`${node.getText()}\` does not resolve to a class declaration (${role})`,
        node
      );
    }

    return classDecl;
  }

  /** Value of a required key of an object literal. */
  private requireKey(values: Map<string, Node>, key: string, object: ObjectLiteralExpression): Node {
    const value = values.get(key);
    if (!value) {
      throw new CompilerError(NOT_ANALYZABLE, `missing required key \`${key}\` in \`${object.getText()}\``, object);
    }

    return value;
  }

  /** Initializer of a property assignment; a property without one is not analyzable. */
  private expectInitializer(assignment: Node): Node {
    const initializer = assignment.asKindOrThrow(SyntaxKind.PropertyAssignment).getInitializer();
    if (!initializer) {
      throw new CompilerError(NOT_ANALYZABLE, `\`${assignment.getText()}\` has no analyzable value`, assignment);
    }

    return initializer;
  }
}

/** Empty dependency set, shared by `useValue`/`useExisting` and by classes without a constructor. */
function emptyDependencies(): Dependencies {
  return {deps: [], optionalDeps: new Set<number>(), depNodes: [], missing: new Set<number>()};
}

/** Constructor that actually carries the parameters: the implementation, or the only signature. */
function implementationConstructor(classDecl: ClassDeclaration): ConstructorDeclaration | undefined {
  const constructors = classDecl.getConstructors();

  return constructors.find(candidate => candidate.getBody() !== undefined) ?? constructors[0];
}

/** Readable name of a class declaration, including the anonymous `export default class` case. */
function className(classDecl: ClassDeclaration): string {
  return classDecl.getName() ?? '<anonymous class>';
}

/** Readable name of a token, used by `SAH101`/`SAH102`/`SAH104` messages. */
function tokenLabel(token: TokenKey): string {
  if (typeof token === 'string') {
    return token;
  }

  return Node.isClassDeclaration(token) ? className(token) : token.getName();
}

/** `VariableDeclaration` an identifier points at, following import aliases (const tokens, `InjectionToken`). */
function resolveIdentifierToVariable(node: Node): VariableDeclaration | undefined {
  const visited = new Set<unknown>();
  let current: TsSymbol | undefined = node.getSymbol();

  while (current && !visited.has(current.compilerSymbol)) {
    visited.add(current.compilerSymbol);

    const declaration = current.getDeclarations().find(Node.isVariableDeclaration);
    if (declaration) {
      return declaration;
    }

    current = current.getAliasedSymbol();
  }

  return undefined;
}

/** Whether a variable is a `const`, the only binding a dynamic module argument may reference. */
function isConstant(declaration: VariableDeclaration | undefined): boolean {
  return declaration?.getVariableStatement()?.getDeclarationKind() === VariableDeclarationKind.Const;
}

# Graph Report - serverless-advanced-handlers  (2026-09-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 930 nodes · 1890 edges · 43 communities (36 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.81)
- Token cost: 108,725 input · 2,425 output

## Graph Freshness
- Built from commit: `b0669379`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- HTTP Route Decorators
- HTTP Exception Classes
- HTTP Status Codes
- OpenAPI Response Decorators
- Lambda Config & IAM
- DI Provider Definitions
- Root TypeScript Config
- DI Tokens & Pipeline Contracts
- Mode-C DI TS Config
- Mode-C HTTP TS Config
- Mode-C Lambda TS Config
- Mode-C TS Config
- Advanced Class Types
- Pipeline Metadata Decorators
- Exception Filters
- Decorator Test Fixtures
- Injectable DI Decorators
- Package Manifest Config
- Module System
- DI Decorator Mode Specs
- Public API Inventory Tests
- Metadata Reflection Registry
- Dev Tooling Dependencies
- DI Decorators & Markers
- Parameter Injection Decorators
- Auth Guards
- Decorator Mode Specs
- Package Entry Exports
- Invalid TS Config Fixtures
- Request Interceptors
- Dual Class/Method Decorators
- Invalid Parameter Decorator Fixture
- NPM Build Scripts
- Build Boundary Tests
- Core DI Module
- Build Tooling Config
- Generic Test Fixture
- Users Service Example
- Users Service Example
- Commitlint Configuration
- Vitest Configuration

## God Nodes (most connected - your core abstractions)
1. `HttpStatus` - 74 edges
2. `HttpException` - 42 edges
3. `methodDecorator()` - 39 edges
4. `classOrMethodDecorator()` - 34 edges
5. `compilerOptions` - 26 edges
6. `parameterDecorator()` - 25 edges
7. `compilerOptions` - 25 edges
8. `compilerOptions` - 25 edges
9. `compilerOptions` - 25 edges
10. `compilerOptions` - 25 edges

## Surprising Connections (you probably didn't know these)
- `AuthenticatedRequest` --inherits--> `HttpRequest()`  [EXTRACTED]
  test/types/pipeline.test-d.ts → src/http/types.ts
- `AppModule` --references--> `Module()`  [EXTRACTED]
  test/types/mode-c-di/di-decorators-and-markers.ts → src/decorators/di.ts
- `BaseRepository` --references--> `Injectable()`  [EXTRACTED]
  test/types/mode-c-di/di-decorators-and-markers.ts → src/decorators/di.ts
- `InvalidModule` --references--> `Module()`  [EXTRACTED]
  test/types/mode-c-di/di-decorators-and-markers.ts → src/decorators/di.ts
- `InvalidScope` --references--> `Injectable()`  [EXTRACTED]
  test/types/mode-c-di/di-decorators-and-markers.ts → src/decorators/di.ts

## Import Cycles
- None detected.

## Communities (43 total, 5 thin omitted)

### Community 0 - "HTTP Route Decorators"
Cohesion: 0.05
Nodes (62): zod, ClassFactory, HttpBody(), HttpCode(), HttpController(), HttpCookies(), HttpDelete(), HttpForm() (+54 more)

### Community 1 - "HTTP Exception Classes"
Cohesion: 0.06
Nodes (48): BadGatewayException, BadRequestException, ConflictException, ExpectationFailedException, FailedDependencyException, ForbiddenException, GatewayTimeoutException, getReasonPhrase() (+40 more)

### Community 2 - "HTTP Status Codes"
Cohesion: 0.03
Nodes (57): HttpStatus, ACCEPTED, ALREADY_REPORTED, AMBIGUOUS, BAD_GATEWAY, BAD_REQUEST, CONFLICT, CONTENT_DIFFERENT (+49 more)

### Community 3 - "OpenAPI Response Decorators"
Cohesion: 0.11
Nodes (37): AnyAdvancedClass, OpenapiBadRequestResponse(), OpenapiConflictResponse(), OpenapiConsumes(), OpenapiCreatedResponse(), OpenapiExclude(), OpenapiForbiddenResponse(), OpenapiNoContentResponse() (+29 more)

### Community 4 - "Lambda Config & IAM"
Cohesion: 0.08
Nodes (21): IamResource, IamStatement, LambdaConfig(), LambdaConfigOptions, Decorated, modeCProject, options, otherModeCProjects (+13 more)

### Community 5 - "DI Provider Definitions"
Cohesion: 0.09
Nodes (20): ClassProvider, ExistingProvider, FactoryProvider, Forbid, OnModuleDestroy, OnModuleInit, Provider, UseKey (+12 more)

### Community 6 - "Root TypeScript Config"
Cohesion: 0.07
Nodes (29): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, emitDecoratorMetadata, esModuleInterop (+21 more)

### Community 7 - "DI Tokens & Pipeline Contracts"
Cohesion: 0.12
Nodes (17): InjectionToken, TokenValue, Type, HttpArgumentsHost, Interceptor, APP_FILTER, APP_GUARD, APP_INTERCEPTOR (+9 more)

### Community 8 - "Mode-C DI TS Config"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames (+19 more)

### Community 9 - "Mode-C HTTP TS Config"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames (+19 more)

### Community 10 - "Mode-C Lambda TS Config"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames (+19 more)

### Community 11 - "Mode-C TS Config"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames (+19 more)

### Community 12 - "Advanced Class Types"
Cohesion: 0.10
Nodes (16): AbstractConstructor, AdvancedClass, AdvancedClassGuard, InstanceSchemaFactory, AbstractEntity, AdminEntity, CreateUserBody, CreateUserResponse (+8 more)

### Community 13 - "Pipeline Metadata Decorators"
Cohesion: 0.20
Nodes (14): Catch(), SetMetadata(), UseFilters(), UseGuards(), UseInterceptors(), DecoratedController, NoopFilter, TypeErrorFilter (+6 more)

### Community 14 - "Exception Filters"
Cohesion: 0.10
Nodes (9): ArgumentsHost, ExceptionFilter, AllErrorsFilter, CatchAllFilter, DomainErrorFilter, DomainFilter, Filter, AllErrorsFilter (+1 more)

### Community 15 - "Decorator Test Fixtures"
Cohesion: 0.19
Nodes (9): classDecorator(), classOrMethodDecorator(), methodDecorator(), BaseGreeter, Greeter, BaseGreeter, ClassDecoratorOnMethod, Greeter (+1 more)

### Community 16 - "Injectable DI Decorators"
Cohesion: 0.15
Nodes (15): Injectable(), AbstractService, Config, FunctionToken, LiteralScope, Logger, Mixed, NumberToken (+7 more)

### Community 17 - "Package Manifest Config"
Cohesion: 0.11
Nodes (18): engines, node, imports, name, packageManager, peerDependencies, zod, type (+10 more)

### Community 18 - "Module System"
Cohesion: 0.14
Nodes (15): Global(), Module(), DynamicModule, classDecorators(), Decorated, AmbiguousProvider, AppModule, EmptyModule (+7 more)

### Community 19 - "DI Decorator Mode Specs"
Cohesion: 0.12
Nodes (14): CONFIG, descriptorsOf(), modeCInvalidProject, modeCProject, Plain, projectRoot, require, shapeOf() (+6 more)

### Community 20 - "Public API Inventory Tests"
Cohesion: 0.16
Nodes (15): typescript, compare(), declarationUrlOf(), declaredNames(), dist, FileIndex, indexDeclarationFile(), isExported() (+7 more)

### Community 21 - "Metadata Reflection Registry"
Cohesion: 0.22
Nodes (11): defineReflectMetadata(), getReflectMetadata(), ReflectTarget, registry, AnyReflectableDecorator, isArray(), isObject(), keyOf() (+3 more)

### Community 22 - "Dev Tooling Dependencies"
Cohesion: 0.12
Nodes (16): devDependencies, @commitlint/cli, @commitlint/config-conventional, @commitlint/types, esbuild, eslint-plugin-sonarjs, lefthook, oxfmt (+8 more)

### Community 23 - "DI Decorators & Markers"
Cohesion: 0.12
Nodes (11): API_KEY, AppModule, BaseRepository, ClassDecoratorOnMethod, CONFIG, InvalidModule, InvalidScope, LOGGER (+3 more)

### Community 24 - "Parameter Injection Decorators"
Cohesion: 0.19
Nodes (6): Inject(), Optional(), parameterDecorators(), Undecorated, Config, UsersService

### Community 25 - "Auth Guards"
Cohesion: 0.13
Nodes (8): CanActivate, AllowGuard, AbstractGuard, ApiKeyGuard, RolesGuard, ApiKeyGuard, RolesGuard, StringGuard

### Community 26 - "Decorator Mode Specs"
Cohesion: 0.14
Nodes (9): descriptorsOf(), modeCInvalidProject, modeCProject, Plain, projectRoot, require, shapeOf(), Target (+1 more)

### Community 27 - "Package Entry Exports"
Cohesion: 0.15
Nodes (13): exports, ./plugin, ./runtime, ./testing, default, require, types, default (+5 more)

### Community 28 - "Invalid TS Config Fixtures"
Cohesion: 0.15
Nodes (10): extends, include, $schema, extends, include, $schema, extends, include (+2 more)

### Community 29 - "Request Interceptors"
Cohesion: 0.29
Nodes (5): CallHandler, ExecutionContext, LoggingInterceptor, WrapInterceptor, handle()

### Community 30 - "Dual Class/Method Decorators"
Cohesion: 0.24
Nodes (6): DecoratableClass, DecoratableMethod, DualClassOrMethodDecorator, DualMethodDecorator, ClassDecoratorOnMethod, MethodDecoratorOnClass

### Community 31 - "Invalid Parameter Decorator Fixture"
Cohesion: 0.29
Nodes (3): parameterDecorator(), Decorated, Greeter

### Community 32 - "NPM Build Scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, format, lint, lint:ci, prepare, test (+1 more)

### Community 33 - "Build Boundary Tests"
Cohesion: 0.25
Nodes (5): esbuild, vitest, root, dist, root

### Community 34 - "Core DI Module"
Cohesion: 0.33
Nodes (6): DualClassDecorator, ModuleMetadata, Scope, DEFAULT, REQUEST, Token

### Community 35 - "Build Tooling Config"
Cohesion: 0.33
Nodes (3): tsdown, buildTimeOnly, shared

## Knowledge Gaps
- **355 isolated node(s):** `CreateUserBody`, `CreateUserResponse`, `ListUsersQuery`, `Plain`, `UploadAvatarForm` (+350 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 474 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Build Boundary Tests` to `HTTP Route Decorators`, `HTTP Exception Classes`, `OpenAPI Response Decorators`, `Lambda Config & IAM`, `DI Provider Definitions`, `DI Tokens & Pipeline Contracts`, `Advanced Class Types`, `Pipeline Metadata Decorators`, `Injectable DI Decorators`, `Package Manifest Config`, `DI Decorator Mode Specs`, `Public API Inventory Tests`, `Decorator Mode Specs`, `Dual Class/Method Decorators`?**
  _High betweenness centrality (0.173) - this node is a cross-community bridge._
- **Why does `HttpStatus` connect `HTTP Status Codes` to `HTTP Route Decorators`, `HTTP Exception Classes`, `OpenAPI Response Decorators`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Dev Tooling Dependencies` to `Package Manifest Config`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `CreateUserBody`, `CreateUserResponse`, `ListUsersQuery` to the rest of the system?**
  _355 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HTTP Route Decorators` be split into smaller, more focused modules?**
  _Cohesion score 0.05154639175257732 - nodes in this community are weakly interconnected._
- **Should `HTTP Exception Classes` be split into smaller, more focused modules?**
  _Cohesion score 0.05971173644474949 - nodes in this community are weakly interconnected._
- **Should `HTTP Status Codes` be split into smaller, more focused modules?**
  _Cohesion score 0.034482758620689655 - nodes in this community are weakly interconnected._
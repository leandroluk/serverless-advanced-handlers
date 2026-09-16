# Graph Report - serverless-advanced-handlers  (2026-09-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1042 nodes · 2074 edges · 47 communities (39 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c90f7988`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- openapi-decorators.test-d.ts
- http/index.ts
- HttpStatus
- LambdaConfig
- di.test-d.ts
- v.ts
- src/index.ts
- pipeline-decorators.test-d.ts
- compilerOptions
- users-controller.ts
- compilerOptions
- compilerOptions
- compilerOptions
- compilerOptions
- di-decorators.test-d.ts
- pipeline.test-d.ts
- Inject
- package.json
- zod
- http-decorators.test-d.ts
- class-factory.spec.ts
- di-decorators-and-markers.ts
- ExecutionContext
- reflector.ts
- di-decorators-modes.spec.ts
- devDependencies
- public-api.spec.ts
- HttpBody
- http-decorators-modes.spec.ts
- parameterDecorator
- ArgumentsHost
- advanced-class.test-d.ts
- CanActivate
- exports
- mode-c-di/invalid/tsconfig.json
- vitest
- scripts
- HttpParams
- tsdown
- Plain
- UsersService
- UsersService
- boundaries.spec.ts
- commitlint.config.ts
- vitest.config.ts

## God Nodes (most connected - your core abstractions)
1. `HttpStatus` - 73 edges
2. `HttpException` - 41 edges
3. `methodDecorator()` - 39 edges
4. `classOrMethodDecorator()` - 34 edges
5. `vitest` - 27 edges
6. `compilerOptions` - 26 edges
7. `parameterDecorator()` - 25 edges
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

## Communities (47 total, 6 thin omitted)

### Community 0 - "openapi-decorators.test-d.ts"
Cohesion: 0.05
Nodes (61): classDecorator(), classOrMethodDecorator(), DecoratableClass, DecoratableMethod, DualClassOrMethodDecorator, DualMethodDecorator, methodDecorator(), OpenapiBadRequestResponse() (+53 more)

### Community 1 - "http/index.ts"
Cohesion: 0.05
Nodes (44): BadGatewayException, BadRequestException, ConflictException, ExpectationFailedException, FailedDependencyException, ForbiddenException, GatewayTimeoutException, getReasonPhrase() (+36 more)

### Community 2 - "HttpStatus"
Cohesion: 0.03
Nodes (57): HttpStatus, ACCEPTED, ALREADY_REPORTED, AMBIGUOUS, BAD_GATEWAY, BAD_REQUEST, CONFLICT, CONTENT_DIFFERENT (+49 more)

### Community 3 - "LambdaConfig"
Cohesion: 0.08
Nodes (21): IamResource, IamStatement, LambdaConfig(), LambdaConfigOptions, Decorated, modeCProject, options, otherModeCProjects (+13 more)

### Community 4 - "di.test-d.ts"
Cohesion: 0.08
Nodes (25): ClassProvider, ExistingProvider, FactoryProvider, Forbid, ModuleMetadata, OnModuleDestroy, OnModuleInit, Provider (+17 more)

### Community 5 - "v.ts"
Cohesion: 0.10
Nodes (34): boolish(), BoolishOptions, BYTE_UNITS, ByteUnit, datetime(), DEFAULT_FALSY, DEFAULT_TRUTHY, delimited() (+26 more)

### Community 6 - "src/index.ts"
Cohesion: 0.12
Nodes (20): Class(), CLASS_MARK, instance(), Instantiable, isServerlessAdvancedHandlersClass(), markOf(), Shape, AbstractConstructor (+12 more)

### Community 7 - "pipeline-decorators.test-d.ts"
Cohesion: 0.14
Nodes (18): DualClassDecorator, Catch(), SetMetadata(), UseFilters(), UseGuards(), UseInterceptors(), DecoratedController, NoopFilter (+10 more)

### Community 8 - "compilerOptions"
Cohesion: 0.07
Nodes (29): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, emitDecoratorMetadata, esModuleInterop (+21 more)

### Community 9 - "users-controller.ts"
Cohesion: 0.13
Nodes (17): HttpCode(), HttpCookies(), HttpDelete(), HttpHeaders(), HttpOptions(), HttpPatch(), HttpPut(), HttpResponseHeader() (+9 more)

### Community 10 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames (+19 more)

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames (+19 more)

### Community 12 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames (+19 more)

### Community 13 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames (+19 more)

### Community 14 - "di-decorators.test-d.ts"
Cohesion: 0.13
Nodes (24): Global(), Injectable(), Module(), classDecorators(), AbstractService, AmbiguousProvider, AppModule, Config (+16 more)

### Community 15 - "pipeline.test-d.ts"
Cohesion: 0.14
Nodes (15): InjectionToken, TokenValue, Type, HttpResponseState, ExceptionFilter, HttpArgumentsHost, APP_FILTER, APP_GUARD (+7 more)

### Community 16 - "Inject"
Cohesion: 0.11
Nodes (11): Inject(), Optional(), Decorated, parameterDecorators(), Mixed, Target, Undecorated, UsersController (+3 more)

### Community 17 - "package.json"
Cohesion: 0.09
Nodes (22): dependencies, ms, engines, node, imports, name, packageManager, peerDependencies (+14 more)

### Community 18 - "zod"
Cohesion: 0.16
Nodes (20): zod, AnySchema, defOf(), isSchema(), RESERVED_META_KEYS, resolveMeta(), validateMeta(), validateNode() (+12 more)

### Community 19 - "http-decorators.test-d.ts"
Cohesion: 0.12
Nodes (14): HttpGet(), HttpQuery(), CreateUserBody, CreateUserResponse, _Invalid, ListUsersQuery, Plain, _RouteOnClass (+6 more)

### Community 20 - "class-factory.spec.ts"
Cohesion: 0.10
Nodes (17): AdminEntity, AdminOrder, Bar, Composed, CreateUserBody, Foo, Invoice, OrderEntity (+9 more)

### Community 21 - "di-decorators-and-markers.ts"
Cohesion: 0.12
Nodes (12): DynamicModule, API_KEY, AppModule, BaseRepository, ClassDecoratorOnMethod, CONFIG, InvalidModule, InvalidScope (+4 more)

### Community 22 - "ExecutionContext"
Cohesion: 0.18
Nodes (9): CallHandler, ExecutionContext, Interceptor, PassInterceptor, LoggingInterceptor, WrapInterceptor, handle(), LoggingInterceptor (+1 more)

### Community 23 - "reflector.ts"
Cohesion: 0.20
Nodes (11): defineReflectMetadata(), getReflectMetadata(), ReflectTarget, registry, AnyReflectableDecorator, isArray(), isObject(), keyOf() (+3 more)

### Community 24 - "di-decorators-modes.spec.ts"
Cohesion: 0.12
Nodes (14): CONFIG, descriptorsOf(), modeCInvalidProject, modeCProject, Plain, projectRoot, require, shapeOf() (+6 more)

### Community 25 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, @commitlint/cli, @commitlint/config-conventional, @commitlint/types, esbuild, eslint-plugin-sonarjs, lefthook, oxfmt (+9 more)

### Community 26 - "public-api.spec.ts"
Cohesion: 0.16
Nodes (15): typescript, compare(), declarationUrlOf(), declaredNames(), dist, FileIndex, indexDeclarationFile(), isExported() (+7 more)

### Community 27 - "HttpBody"
Cohesion: 0.20
Nodes (7): HttpBody(), HttpController(), HttpPost(), Decorated, MiscController, _Misplaced, UsersController

### Community 28 - "http-decorators-modes.spec.ts"
Cohesion: 0.13
Nodes (15): classDecorators, decoratorModesInvalidProject, decoratorModesProject, descriptorsOf(), methodDecorators, modeCInvalidProject, modeCProject, parameterDecorators (+7 more)

### Community 29 - "parameterDecorator"
Cohesion: 0.23
Nodes (9): parameterDecorator(), HttpHead(), HttpMethod, HttpRequest(), LambdaContext(), UploadedFile, HttpRequest, ../../src/http/types (+1 more)

### Community 30 - "ArgumentsHost"
Cohesion: 0.14
Nodes (5): ArgumentsHost, AllErrorsFilter, DomainErrorFilter, AllErrorsFilter, DomainErrorFilter

### Community 31 - "advanced-class.test-d.ts"
Cohesion: 0.13
Nodes (12): AbstractEntity, AdminEntity, CreateUserBody, CreateUserResponse, Customer, customerSchema, Order, orderSchema (+4 more)

### Community 32 - "CanActivate"
Cohesion: 0.13
Nodes (8): CanActivate, AllowGuard, AbstractGuard, ApiKeyGuard, RolesGuard, ApiKeyGuard, RolesGuard, StringGuard

### Community 33 - "exports"
Cohesion: 0.15
Nodes (13): exports, ./plugin, ./runtime, ./testing, default, require, types, default (+5 more)

### Community 34 - "mode-c-di/invalid/tsconfig.json"
Cohesion: 0.15
Nodes (10): extends, include, $schema, extends, include, $schema, extends, include (+2 more)

### Community 35 - "vitest"
Cohesion: 0.22
Nodes (7): vitest, ByteSize, getJsonSchemaOverride(), V, dist, root, overrideOf()

### Community 36 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, format, lint, lint:ci, prepare, test (+1 more)

### Community 37 - "HttpParams"
Cohesion: 0.38
Nodes (3): HttpForm(), HttpParams(), UsersController

### Community 38 - "tsdown"
Cohesion: 0.33
Nodes (3): tsdown, buildTimeOnly, shared

## Knowledge Gaps
- **402 isolated node(s):** `DecoratableClass`, `DecoratableMethod`, `OpenapiOperationOptions`, `AbstractDto`, `CreateUserBody` (+397 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 529 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `openapi-decorators.test-d.ts`, `http/index.ts`, `LambdaConfig`, `di.test-d.ts`, `v.ts`, `src/index.ts`, `pipeline-decorators.test-d.ts`, `di-decorators.test-d.ts`, `pipeline.test-d.ts`, `package.json`, `zod`, `http-decorators.test-d.ts`, `class-factory.spec.ts`, `di-decorators-modes.spec.ts`, `public-api.spec.ts`, `http-decorators-modes.spec.ts`, `parameterDecorator`, `advanced-class.test-d.ts`, `boundaries.spec.ts`?**
  _High betweenness centrality (0.207) - this node is a cross-community bridge._
- **Why does `HttpStatus` connect `HttpStatus` to `openapi-decorators.test-d.ts`, `http/index.ts`, `users-controller.ts`, `http-decorators.test-d.ts`, `http-decorators-modes.spec.ts`, `parameterDecorator`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `DecoratableClass`, `DecoratableMethod`, `OpenapiOperationOptions` to the rest of the system?**
  _402 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `openapi-decorators.test-d.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.051329622758194186 - nodes in this community are weakly interconnected._
- **Should `http/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05479818230419674 - nodes in this community are weakly interconnected._
- **Should `HttpStatus` be split into smaller, more focused modules?**
  _Cohesion score 0.034482758620689655 - nodes in this community are weakly interconnected._
# Graph Report - serverless-advanced-handlers  (2026-09-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1033 nodes · 2058 edges · 49 communities (40 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8d4e3353`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- http/index.ts
- openapi-decorators.test-d.ts
- extensions.ts
- HttpStatus
- Lambda Config & IAM
- di.test-d.ts
- src/index.ts
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
- http-decorators.test-d.ts
- di-decorators-and-markers.ts
- ExecutionContext
- di-decorators-modes.spec.ts
- devDependencies
- public-api.spec.ts
- HttpBody
- reflector.ts
- http-decorators-modes.spec.ts
- parameterDecorator
- ArgumentsHost
- advanced-class.test-d.ts
- CanActivate
- decorator-modes.spec.ts
- class-factory.spec.ts
- exports
- mode-c-di/invalid/tsconfig.json
- scripts
- class-factory.ts
- class-factory.test-d.ts
- HttpParams
- tsdown
- class/types.ts
- Plain
- UsersService
- UsersService
- boundaries.spec.ts
- AdvancedClass
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

## Communities (49 total, 7 thin omitted)

### Community 0 - "http/index.ts"
Cohesion: 0.05
Nodes (44): BadGatewayException, BadRequestException, ConflictException, ExpectationFailedException, FailedDependencyException, ForbiddenException, GatewayTimeoutException, getReasonPhrase() (+36 more)

### Community 1 - "openapi-decorators.test-d.ts"
Cohesion: 0.06
Nodes (53): AnyAdvancedClass, classDecorator(), classOrMethodDecorator(), DecoratableClass, DecoratableMethod, DualClassOrMethodDecorator, DualMethodDecorator, methodDecorator() (+45 more)

### Community 2 - "extensions.ts"
Cohesion: 0.06
Nodes (61): vitest, zod, boolish(), BoolishOptions, BYTE_UNITS, ByteSize, ByteUnit, datetime() (+53 more)

### Community 3 - "HttpStatus"
Cohesion: 0.03
Nodes (57): HttpStatus, ACCEPTED, ALREADY_REPORTED, AMBIGUOUS, BAD_GATEWAY, BAD_REQUEST, CONFLICT, CONTENT_DIFFERENT (+49 more)

### Community 4 - "Lambda Config & IAM"
Cohesion: 0.08
Nodes (21): IamResource, IamStatement, LambdaConfig(), LambdaConfigOptions, Decorated, modeCProject, options, otherModeCProjects (+13 more)

### Community 5 - "di.test-d.ts"
Cohesion: 0.08
Nodes (25): ClassProvider, ExistingProvider, FactoryProvider, Forbid, ModuleMetadata, OnModuleDestroy, OnModuleInit, Provider (+17 more)

### Community 6 - "src/index.ts"
Cohesion: 0.15
Nodes (18): DualClassDecorator, Catch(), SetMetadata(), UseFilters(), UseGuards(), UseInterceptors(), DecoratedController, NoopFilter (+10 more)

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (29): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, emitDecoratorMetadata, esModuleInterop (+21 more)

### Community 8 - "users-controller.ts"
Cohesion: 0.13
Nodes (17): HttpCode(), HttpCookies(), HttpDelete(), HttpHeaders(), HttpOptions(), HttpPatch(), HttpPut(), HttpResponseHeader() (+9 more)

### Community 9 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames (+19 more)

### Community 10 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames (+19 more)

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames (+19 more)

### Community 12 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames (+19 more)

### Community 13 - "di-decorators.test-d.ts"
Cohesion: 0.13
Nodes (24): Global(), Injectable(), Module(), classDecorators(), AbstractService, AmbiguousProvider, AppModule, Config (+16 more)

### Community 14 - "pipeline.test-d.ts"
Cohesion: 0.14
Nodes (15): InjectionToken, TokenValue, Type, HttpResponseState, ExceptionFilter, HttpArgumentsHost, APP_FILTER, APP_GUARD (+7 more)

### Community 15 - "Inject"
Cohesion: 0.11
Nodes (11): Inject(), Optional(), Decorated, parameterDecorators(), Mixed, Target, Undecorated, UsersController (+3 more)

### Community 16 - "package.json"
Cohesion: 0.09
Nodes (22): dependencies, ms, engines, node, imports, name, packageManager, peerDependencies (+14 more)

### Community 17 - "http-decorators.test-d.ts"
Cohesion: 0.12
Nodes (14): HttpGet(), HttpQuery(), CreateUserBody, CreateUserResponse, _Invalid, ListUsersQuery, Plain, _RouteOnClass (+6 more)

### Community 18 - "di-decorators-and-markers.ts"
Cohesion: 0.12
Nodes (12): DynamicModule, API_KEY, AppModule, BaseRepository, ClassDecoratorOnMethod, CONFIG, InvalidModule, InvalidScope (+4 more)

### Community 19 - "ExecutionContext"
Cohesion: 0.18
Nodes (9): CallHandler, ExecutionContext, Interceptor, PassInterceptor, LoggingInterceptor, WrapInterceptor, handle(), LoggingInterceptor (+1 more)

### Community 20 - "di-decorators-modes.spec.ts"
Cohesion: 0.12
Nodes (14): CONFIG, descriptorsOf(), modeCInvalidProject, modeCProject, Plain, projectRoot, require, shapeOf() (+6 more)

### Community 21 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, @commitlint/cli, @commitlint/config-conventional, @commitlint/types, esbuild, eslint-plugin-sonarjs, lefthook, oxfmt (+9 more)

### Community 22 - "public-api.spec.ts"
Cohesion: 0.16
Nodes (15): typescript, compare(), declarationUrlOf(), declaredNames(), dist, FileIndex, indexDeclarationFile(), isExported() (+7 more)

### Community 23 - "HttpBody"
Cohesion: 0.20
Nodes (7): HttpBody(), HttpController(), HttpPost(), Decorated, MiscController, _Misplaced, UsersController

### Community 24 - "reflector.ts"
Cohesion: 0.22
Nodes (11): defineReflectMetadata(), getReflectMetadata(), ReflectTarget, registry, AnyReflectableDecorator, isArray(), isObject(), keyOf() (+3 more)

### Community 25 - "http-decorators-modes.spec.ts"
Cohesion: 0.13
Nodes (15): classDecorators, decoratorModesInvalidProject, decoratorModesProject, descriptorsOf(), methodDecorators, modeCInvalidProject, modeCProject, parameterDecorators (+7 more)

### Community 26 - "parameterDecorator"
Cohesion: 0.23
Nodes (9): parameterDecorator(), HttpHead(), HttpMethod, HttpRequest(), LambdaContext(), UploadedFile, HttpRequest, ../../src/http/types (+1 more)

### Community 27 - "ArgumentsHost"
Cohesion: 0.14
Nodes (5): ArgumentsHost, AllErrorsFilter, DomainErrorFilter, AllErrorsFilter, DomainErrorFilter

### Community 28 - "advanced-class.test-d.ts"
Cohesion: 0.13
Nodes (12): AbstractEntity, AdminEntity, CreateUserBody, CreateUserResponse, Customer, customerSchema, Order, orderSchema (+4 more)

### Community 29 - "CanActivate"
Cohesion: 0.13
Nodes (8): CanActivate, AllowGuard, AbstractGuard, ApiKeyGuard, RolesGuard, ApiKeyGuard, RolesGuard, StringGuard

### Community 30 - "decorator-modes.spec.ts"
Cohesion: 0.14
Nodes (9): descriptorsOf(), modeCInvalidProject, modeCProject, Plain, projectRoot, require, shapeOf(), Target (+1 more)

### Community 31 - "class-factory.spec.ts"
Cohesion: 0.15
Nodes (11): AdminEntity, Bar, Composed, CreateUserBody, Foo, Person, Plain, raw (+3 more)

### Community 32 - "exports"
Cohesion: 0.15
Nodes (13): exports, ./plugin, ./runtime, ./testing, default, require, types, default (+5 more)

### Community 33 - "mode-c-di/invalid/tsconfig.json"
Cohesion: 0.15
Nodes (10): extends, include, $schema, extends, include, $schema, extends, include (+2 more)

### Community 34 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, format, lint, lint:ci, prepare, test (+1 more)

### Community 35 - "class-factory.ts"
Cohesion: 0.28
Nodes (6): Class(), CLASS_MARK, Instantiable, isServerlessAdvancedHandlersClass(), markOf(), Shape

### Community 36 - "class-factory.test-d.ts"
Cohesion: 0.25
Nodes (6): AdminEntity, CreateUserBody, CreateUserResponse, PlainClass, UserEntity, userSchema

### Community 37 - "HttpParams"
Cohesion: 0.38
Nodes (3): HttpForm(), HttpParams(), UsersController

### Community 38 - "tsdown"
Cohesion: 0.33
Nodes (3): tsdown, buildTimeOnly, shared

### Community 39 - "class/types.ts"
Cohesion: 0.40
Nodes (4): AbstractConstructor, AdvancedClassGuard, ClassFactory, InstanceSchemaFactory

## Knowledge Gaps
- **396 isolated node(s):** `ExceptionCtor`, `DecoratableClass`, `DecoratableMethod`, `OpenapiOperationOptions`, `AbstractDto` (+391 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 522 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `extensions.ts` to `http/index.ts`, `openapi-decorators.test-d.ts`, `Lambda Config & IAM`, `class-factory.test-d.ts`, `src/index.ts`, `di.test-d.ts`, `boundaries.spec.ts`, `di-decorators.test-d.ts`, `pipeline.test-d.ts`, `package.json`, `http-decorators.test-d.ts`, `di-decorators-modes.spec.ts`, `public-api.spec.ts`, `http-decorators-modes.spec.ts`, `parameterDecorator`, `advanced-class.test-d.ts`, `decorator-modes.spec.ts`, `class-factory.spec.ts`?**
  _High betweenness centrality (0.206) - this node is a cross-community bridge._
- **Why does `HttpStatus` connect `HttpStatus` to `http/index.ts`, `openapi-decorators.test-d.ts`, `users-controller.ts`, `http-decorators.test-d.ts`, `http-decorators-modes.spec.ts`, `parameterDecorator`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `zod` connect `extensions.ts` to `openapi-decorators.test-d.ts`, `class-factory.ts`, `class-factory.test-d.ts`, `class/types.ts`, `users-controller.ts`, `package.json`, `http-decorators.test-d.ts`, `advanced-class.test-d.ts`, `class-factory.spec.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `ExceptionCtor`, `DecoratableClass`, `DecoratableMethod` to the rest of the system?**
  _396 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `http/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05479818230419674 - nodes in this community are weakly interconnected._
- **Should `openapi-decorators.test-d.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06347469220246238 - nodes in this community are weakly interconnected._
- **Should `extensions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05875251509054326 - nodes in this community are weakly interconnected._
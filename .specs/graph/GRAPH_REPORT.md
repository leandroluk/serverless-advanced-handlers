# Graph Report - serverless-advanced-handlers  (2026-09-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1829 nodes · 3204 edges · 148 communities (136 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.83)
- Token cost: 220,083 input · 8,693 output

## Graph Freshness
- Built from commit: `70b8f551`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Dual Class/Method Decorators
- HTTP Exception Classes
- AST Analysis & Decorator Modes
- HTTP Status Codes
- Dependency Injection Core
- DI Provider Types
- Array Provider Test Fixtures
- DI Decorator Type Tests
- Lambda Config Decorators
- Validation Extensions
- Class Factory Core
- Root TS Config
- Mode-C DI TS Config
- Mode-C HTTP TS Config
- Mode-C Lambda TS Config
- Mode-C Types TS Config
- Pipeline Contracts
- Package Dependencies
- DI Decorator Mode Tests
- OpenAPI Schema Validation
- Pipeline Decorators
- DI Scope Test Fixtures
- HTTP Decorator Mode Tests
- Class Factory Tests
- DI Decorator Marker Fixtures
- HTTP Parameter Decorators
- Config Module DI
- Dev Tooling Dependencies
- HTTP Controller Decorators
- Users Controller Fixtures
- DI Cycle Detection Tests
- Metadata Reflection Registry
- HTTP Types
- Public API Surface Tests
- Advanced Class Type Tests
- HTTP Decorator Type Tests
- Arguments Host & Exception Filters
- Auth Guards
- DI Parameter Injection Tests
- Execution Context Interceptors
- DI Module Visibility Tests
- Package Entry Points
- DI Scope Computation
- Invalid Mode-C TS Configs
- Zod Metadata Validation
- Mode-B TS Config
- Invalid Provider Array Fixtures
- Mutual Module Dependency Tests
- Mode-A TS Config
- Base TS Config
- HTTP Route Decorator Tests
- Exception Filter Fixtures
- Module Re-export Tests
- Mode-C Fixture TS Config
- NPM Scripts
- DI Module Import Tests
- Extended TS Configs
- Build Configuration
- Code Graph Manifest
- Mode-B-Extends TS Config
- Commitlint Config File
- Oxfmt Config File
- Oxlint Config File
- Package Manifest File
- Class Factory Source File
- Class Types Source File
- DI Decorators Source File
- Dual Decorators Source File
- HTTP Decorators Source File
- Lambda Decorators Source File
- OpenAPI Decorators Source File
- Pipeline Decorators Source File
- DI Providers Source File
- DI Tokens Source File
- HTTP Exceptions Source File
- HTTP Index Source File
- HTTP Result Source File
- HTTP Status Source File
- HTTP Types Source File
- Package Index Source File
- Pipeline Contracts Source File
- Pipeline Index Source File
- Pipeline Reflector Source File
- Pipeline Tokens Source File
- Plugin Index Source File
- Runtime Index Source File
- Testing Index Source File
- Validation Extensions Source File
- Validation Meta Source File
- Validation OpenAPI Source File
- Validation V Source File
- Boundaries Test File
- Class Factory Test File
- Decorator Modes Test File
- DI Decorator Modes Test File
- Entrypoints Test File
- HTTP Decorator Modes Test File
- HTTP Exceptions Test File
- Lambda Config Modes Test File
- OpenAPI Decorators Test File
- Public API Tests
- Reflector Tests
- Build Dist Setup
- Advanced Class Type Tests
- Class Factory Type Tests
- DI Decorators Type Tests
- DI Type Tests
- Dual Decorators Type Tests
- HTTP Decorators Type Tests
- HTTP Types Tests
- Lambda Config Type Tests
- Mode C Class/Method Decorators
- Mode C DI Decorators
- Invalid Inject Decorator Test
- Mode C DI Invalid Config
- Mode C DI Config
- Invalid HTTP Decorator Test
- Mode C HTTP Invalid Config
- Mode C HTTP Config
- Mode C Users Controller
- Invalid Mode C Decorator Test
- Mode C Invalid Config
- Mode C Lambda Config Test
- Mode C Lambda Config
- Mode C Config
- OpenAPI Decorators Type Tests
- Pipeline Decorators Type Tests
- Pipeline Type Tests
- Validation Type Tests
- Validation Extensions Tests
- Validation Meta Tests
- Validation OpenAPI Tests
- TypeScript Config
- Tsdown Build Config
- Vitest Config
- Sample DI Provider
- Build Bundling Boundaries
- DI Injection Sample
- Mailer Service Sample
- Commitlint Config
- Mode A Extends Sample Service
- Mode A Sample Service
- Mode B Extends Sample Service
- Mode B Sample Service
- Mode C Sample Service
- Dist Test Config

## God Nodes (most connected - your core abstractions)
1. `HttpStatus` - 74 edges
2. `HttpException` - 42 edges
3. `methodDecorator()` - 39 edges
4. `classOrMethodDecorator()` - 34 edges
5. `vitest` - 31 edges
6. `AppGraphBuilder` - 30 edges
7. `compilerOptions` - 26 edges
8. `parameterDecorator()` - 25 edges
9. `compilerOptions` - 25 edges
10. `compilerOptions` - 25 edges

## Surprising Connections (you probably didn't know these)
- `AuthenticatedRequest` --inherits--> `HttpRequest()`  [EXTRACTED]
  test/types/pipeline.test-d.ts → src/http/types.ts
- `MethodDecoratorOnClass` --references--> `methodDecorator()`  [EXTRACTED]
  test/types/dual-decorators.test-d.ts → src/decorators/dual.ts
- `MethodDecoratorOnClass` --references--> `methodDecorator()`  [EXTRACTED]
  test/types/mode-c/class-and-method-decorators.ts → src/decorators/dual.ts
- `OkResponseOnClass` --references--> `OpenapiOkResponse()`  [EXTRACTED]
  test/types/openapi-decorators.test-d.ts → src/decorators/openapi.ts
- `OperationOnClass` --references--> `OpenapiOperation()`  [EXTRACTED]
  test/types/openapi-decorators.test-d.ts → src/decorators/openapi.ts

## Import Cycles
- None detected.

## Communities (148 total, 10 thin omitted)

### Community 0 - "Dual Class/Method Decorators"
Cohesion: 0.05
Nodes (62): classDecorator(), classOrMethodDecorator(), DecoratableClass, DecoratableMethod, DualClassDecorator, DualClassOrMethodDecorator, DualMethodDecorator, methodDecorator() (+54 more)

### Community 1 - "HTTP Exception Classes"
Cohesion: 0.06
Nodes (45): BadGatewayException, BadRequestException, ConflictException, ExpectationFailedException, FailedDependencyException, ForbiddenException, GatewayTimeoutException, getReasonPhrase() (+37 more)

### Community 2 - "AST Analysis & Decorator Modes"
Cohesion: 0.06
Nodes (46): ts-morph, findClassDeclaration(), kindName(), readAnalyzableArray(), readDecoratorArgument(), resolveIdentifierToClass(), resolveTypeToClass(), DecoratorMode (+38 more)

### Community 3 - "HTTP Status Codes"
Cohesion: 0.03
Nodes (57): HttpStatus, ACCEPTED, ALREADY_REPORTED, AMBIGUOUS, BAD_GATEWAY, BAD_REQUEST, CONFLICT, CONTENT_DIFFERENT (+49 more)

### Community 4 - "Dependency Injection Core"
Cohesion: 0.08
Nodes (33): Inject(), Injectable(), Module(), AppModule, Inject, Module, UsersController, AuditBuffer (+25 more)

### Community 5 - "DI Provider Types"
Cohesion: 0.07
Nodes (31): ClassProvider, DynamicModule, ExistingProvider, FactoryProvider, Forbid, ModuleMetadata, OnModuleDestroy, OnModuleInit (+23 more)

### Community 6 - "Array Provider Test Fixtures"
Cohesion: 0.08
Nodes (30): Alpha, Beta, ConditionalArrayModule, EmptyArrayModule, EXTRA, FirstOffenderModule, FLAG, MixedKindsModule (+22 more)

### Community 7 - "DI Decorator Type Tests"
Cohesion: 0.08
Nodes (31): Global(), Optional(), parameterDecorators(), Inject, AbstractService, AmbiguousProvider, AppModule, Config (+23 more)

### Community 8 - "Lambda Config Decorators"
Cohesion: 0.08
Nodes (21): IamResource, IamStatement, LambdaConfig(), LambdaConfigOptions, Decorated, modeCProject, options, otherModeCProjects (+13 more)

### Community 9 - "Validation Extensions"
Cohesion: 0.10
Nodes (34): boolish(), BoolishOptions, BYTE_UNITS, ByteUnit, datetime(), DEFAULT_FALSY, DEFAULT_TRUTHY, delimited() (+26 more)

### Community 10 - "Class Factory Core"
Cohesion: 0.11
Nodes (20): Class(), CLASS_MARK, instance(), Instantiable, isServerlessAdvancedHandlersClass(), markOf(), Shape, AbstractConstructor (+12 more)

### Community 11 - "Root TS Config"
Cohesion: 0.07
Nodes (29): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, emitDecoratorMetadata, esModuleInterop (+21 more)

### Community 12 - "Mode-C DI TS Config"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames (+19 more)

### Community 13 - "Mode-C HTTP TS Config"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames (+19 more)

### Community 14 - "Mode-C Lambda TS Config"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames (+19 more)

### Community 15 - "Mode-C Types TS Config"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames (+19 more)

### Community 16 - "Pipeline Contracts"
Cohesion: 0.14
Nodes (14): HttpResponseState, ExceptionFilter, HttpArgumentsHost, Interceptor, APP_FILTER, APP_GUARD, APP_INTERCEPTOR, PassInterceptor (+6 more)

### Community 17 - "Package Dependencies"
Cohesion: 0.08
Nodes (23): dependencies, ms, engines, node, imports, name, packageManager, peerDependencies (+15 more)

### Community 18 - "DI Decorator Mode Tests"
Cohesion: 0.10
Nodes (18): classDecorators(), CONFIG, Decorated, descriptorsOf(), modeCInvalidProject, modeCProject, Plain, projectRoot (+10 more)

### Community 19 - "OpenAPI Schema Validation"
Cohesion: 0.14
Nodes (17): vitest, ByteSize, getJsonSchemaOverride(), ANNOTATION_KEYS, AnySchema, applyExtensionOverride(), defOf(), findJsonSchemaOverride() (+9 more)

### Community 20 - "Pipeline Decorators"
Cohesion: 0.21
Nodes (12): SetMetadata(), UseFilters(), UseGuards(), UseInterceptors(), ReflectableDecorator, DecoratedController, Cache, Controller (+4 more)

### Community 21 - "DI Scope Test Fixtures"
Cohesion: 0.14
Nodes (17): DeepConsumer, HiddenConsumer, HiddenModule, MissingTokenModule, NotExportedModule, NotTransitiveModule, ORPHAN_TOKEN, OrphanConsumer (+9 more)

### Community 22 - "HTTP Decorator Mode Tests"
Cohesion: 0.10
Nodes (16): classDecorators, decoratorModesInvalidProject, decoratorModesProject, descriptorsOf(), methodDecorators, modeCInvalidProject, modeCProject, parameterDecorators (+8 more)

### Community 23 - "Class Factory Tests"
Cohesion: 0.10
Nodes (17): AdminEntity, AdminOrder, Bar, Composed, CreateUserBody, Foo, Invoice, OrderEntity (+9 more)

### Community 24 - "DI Decorator Marker Fixtures"
Cohesion: 0.12
Nodes (14): API_KEY, AppModule, BaseRepository, ClassDecoratorOnMethod, CONFIG, InvalidModule, InvalidScope, LOGGER (+6 more)

### Community 25 - "HTTP Parameter Decorators"
Cohesion: 0.22
Nodes (9): parameterDecorator(), HttpCookies(), HttpDelete(), HttpForm(), HttpHeaders(), HttpPatch(), HttpQuery(), MiscController (+1 more)

### Community 26 - "Config Module DI"
Cohesion: 0.11
Nodes (12): InjectionToken, CONFIG_OPTIONS, ConfigModule, ConfigOptions, ConfigService, FALLBACK_OPTIONS, Inject, Injectable (+4 more)

### Community 27 - "Dev Tooling Dependencies"
Cohesion: 0.11
Nodes (18): devDependencies, @commitlint/cli, @commitlint/config-conventional, @commitlint/types, esbuild, eslint-plugin-sonarjs, lefthook, oxfmt (+10 more)

### Community 28 - "HTTP Controller Decorators"
Cohesion: 0.19
Nodes (8): HttpBody(), HttpCode(), HttpController(), HttpPost(), Decorated, _Misplaced, UsersController, UsersController

### Community 29 - "Users Controller Fixtures"
Cohesion: 0.12
Nodes (11): HttpPut(), HttpResponseHeader(), CreateUserBody, CreateUserResponse, ListUsersQuery, UploadAvatarForm, UserCookies, UserEntity (+3 more)

### Community 30 - "DI Cycle Detection Tests"
Cohesion: 0.16
Nodes (11): Alpha, Beta, CycleOfThreeModule, CycleOfTwoModule, One, SelfCycleModule, SelfReferencing, Three (+3 more)

### Community 31 - "Metadata Reflection Registry"
Cohesion: 0.22
Nodes (10): defineReflectMetadata(), getReflectMetadata(), ReflectTarget, registry, AnyReflectableDecorator, isArray(), isObject(), keyOf() (+2 more)

### Community 32 - "HTTP Types"
Cohesion: 0.21
Nodes (8): HttpHead(), HttpOptions(), HttpRequest(), LambdaContext(), UploadedFile, HttpRequest, ../../src/http/types, MiscController

### Community 33 - "Public API Surface Tests"
Cohesion: 0.17
Nodes (14): compare(), declarationUrlOf(), declaredNames(), dist, FileIndex, indexDeclarationFile(), isExported(), parseDeclarationFile() (+6 more)

### Community 34 - "Advanced Class Type Tests"
Cohesion: 0.13
Nodes (12): AbstractEntity, AdminEntity, CreateUserBody, CreateUserResponse, Customer, customerSchema, Order, orderSchema (+4 more)

### Community 35 - "HTTP Decorator Type Tests"
Cohesion: 0.12
Nodes (10): CreateUserBody, CreateUserResponse, ListUsersQuery, Plain, UploadAvatarForm, UserCookies, UserEntity, UserRequestHeaders (+2 more)

### Community 36 - "Arguments Host & Exception Filters"
Cohesion: 0.15
Nodes (5): ArgumentsHost, AllErrorsFilter, DomainErrorFilter, AllErrorsFilter, DomainErrorFilter

### Community 37 - "Auth Guards"
Cohesion: 0.13
Nodes (8): CanActivate, AllowGuard, AbstractGuard, ApiKeyGuard, RolesGuard, ApiKeyGuard, RolesGuard, StringGuard

### Community 38 - "DI Parameter Injection Tests"
Cohesion: 0.17
Nodes (10): CLOCK, InjectedConsumer, InjectedParameterModule, InterfaceConsumer, InterfaceParameterModule, PrimitiveConsumer, PrimitiveParameterModule, Inject (+2 more)

### Community 39 - "Execution Context Interceptors"
Cohesion: 0.23
Nodes (7): CallHandler, ExecutionContext, LoggingInterceptor, WrapInterceptor, handle(), LoggingInterceptor, WrapInterceptor

### Community 40 - "DI Module Visibility Tests"
Cohesion: 0.22
Nodes (11): GlobalHidden, GlobalShared, HiddenGlobalChildModule, HiddenGlobalConsumer, HiddenGlobalRootModule, PartialGlobalModule, SharedGlobalChildModule, SharedGlobalConsumer (+3 more)

### Community 41 - "Package Entry Points"
Cohesion: 0.15
Nodes (13): exports, ./plugin, ./runtime, ./testing, default, require, types, default (+5 more)

### Community 42 - "DI Scope Computation"
Cohesion: 0.18
Nodes (11): Scope, DEFAULT, REQUEST, InjectWithoutFactoryModule, METADATA_TOKEN, MetadataService, NoUseKeyModule, RuntimeScopeModule (+3 more)

### Community 43 - "Invalid Mode-C TS Configs"
Cohesion: 0.15
Nodes (10): extends, include, $schema, extends, include, $schema, extends, include (+2 more)

### Community 44 - "Zod Metadata Validation"
Cohesion: 0.29
Nodes (10): zod, AnySchema, defOf(), isSchema(), RESERVED_META_KEYS, resolveMeta(), validateMeta(), validateNode() (+2 more)

### Community 45 - "Mode-B TS Config"
Cohesion: 0.17
Nodes (11): compilerOptions, emitDecoratorMetadata, experimentalDecorators, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 46 - "Invalid Provider Array Fixtures"
Cohesion: 0.24
Nodes (9): Provider, ArrayService, CallProvidersModule, EXTRA_PROVIDERS, NotAnArrayModule, SpreadProvidersModule, Injectable, Module (+1 more)

### Community 47 - "Mutual Module Dependency Tests"
Cohesion: 0.25
Nodes (8): LeftService, MutualLeftModule, Injectable, Module, MutualRightModule, RightService, Injectable, Module

### Community 48 - "Mode-A TS Config"
Cohesion: 0.18
Nodes (10): compilerOptions, experimentalDecorators, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 49 - "Base TS Config"
Cohesion: 0.18
Nodes (10): compilerOptions, emitDecoratorMetadata, experimentalDecorators, module, moduleResolution, noEmit, skipLibCheck, strict (+2 more)

### Community 50 - "HTTP Route Decorator Tests"
Cohesion: 0.24
Nodes (5): HttpGet(), HttpParams(), _Invalid, _RouteOnClass, UsersController

### Community 51 - "Exception Filter Fixtures"
Cohesion: 0.20
Nodes (6): Catch(), NoopFilter, TypeErrorFilter, CatchAllFilter, DomainFilter, Filter

### Community 52 - "Module Re-export Tests"
Cohesion: 0.27
Nodes (7): Clock, ClockFacadeModule, ClockModule, ReExportRootModule, Scheduler, Injectable, Module

### Community 53 - "Mode-C Fixture TS Config"
Cohesion: 0.20
Nodes (9): compilerOptions, module, moduleResolution, noEmit, skipLibCheck, strict, target, include (+1 more)

### Community 54 - "NPM Scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, format, lint, lint:ci, prepare, test (+1 more)

### Community 55 - "DI Module Import Tests"
Cohesion: 0.28
Nodes (7): ImportedService, MissingModuleDecoratorModule, PlainClass, RealModule, Injectable, Module, UnknownCallModule

### Community 56 - "Extended TS Configs"
Cohesion: 0.29
Nodes (6): ../mode-b-extends/tsconfig.base.json, compilerOptions, emitDecoratorMetadata, extends, include, $schema

### Community 57 - "Build Configuration"
Cohesion: 0.33
Nodes (3): tsdown, buildTimeOnly, shared

### Community 58 - "Code Graph Manifest"
Cohesion: 0.33
Nodes (5): src/pipeline/metadata-registry.ts, ast_hash, mtime, seen, semantic_hash

### Community 59 - "Mode-B-Extends TS Config"
Cohesion: 0.40
Nodes (4): ./tsconfig.base.json, extends, include, $schema

### Community 60 - "Commitlint Config File"
Cohesion: 0.40
Nodes (5): commitlint.config.ts, ast_hash, mtime, seen, semantic_hash

### Community 61 - "Oxfmt Config File"
Cohesion: 0.40
Nodes (5): .oxfmtrc.json, ast_hash, mtime, seen, semantic_hash

### Community 62 - "Oxlint Config File"
Cohesion: 0.40
Nodes (5): .oxlintrc.json, ast_hash, mtime, seen, semantic_hash

### Community 63 - "Package Manifest File"
Cohesion: 0.40
Nodes (5): package.json, ast_hash, mtime, seen, semantic_hash

### Community 64 - "Class Factory Source File"
Cohesion: 0.40
Nodes (5): src/class/class-factory.ts, ast_hash, mtime, seen, semantic_hash

### Community 65 - "Class Types Source File"
Cohesion: 0.40
Nodes (5): src/class/types.ts, ast_hash, mtime, seen, semantic_hash

### Community 66 - "DI Decorators Source File"
Cohesion: 0.40
Nodes (5): src/decorators/di.ts, ast_hash, mtime, seen, semantic_hash

### Community 67 - "Dual Decorators Source File"
Cohesion: 0.40
Nodes (5): src/decorators/dual.ts, ast_hash, mtime, seen, semantic_hash

### Community 68 - "HTTP Decorators Source File"
Cohesion: 0.40
Nodes (5): src/decorators/http.ts, ast_hash, mtime, seen, semantic_hash

### Community 69 - "Lambda Decorators Source File"
Cohesion: 0.40
Nodes (5): src/decorators/lambda.ts, ast_hash, mtime, seen, semantic_hash

### Community 70 - "OpenAPI Decorators Source File"
Cohesion: 0.40
Nodes (5): src/decorators/openapi.ts, ast_hash, mtime, seen, semantic_hash

### Community 71 - "Pipeline Decorators Source File"
Cohesion: 0.40
Nodes (5): src/decorators/pipeline.ts, ast_hash, mtime, seen, semantic_hash

### Community 72 - "DI Providers Source File"
Cohesion: 0.40
Nodes (5): src/di/providers.ts, ast_hash, mtime, seen, semantic_hash

### Community 73 - "DI Tokens Source File"
Cohesion: 0.40
Nodes (5): src/di/tokens.ts, ast_hash, mtime, seen, semantic_hash

### Community 74 - "HTTP Exceptions Source File"
Cohesion: 0.40
Nodes (5): src/http/exceptions.ts, ast_hash, mtime, seen, semantic_hash

### Community 75 - "HTTP Index Source File"
Cohesion: 0.40
Nodes (5): src/http/index.ts, ast_hash, mtime, seen, semantic_hash

### Community 76 - "HTTP Result Source File"
Cohesion: 0.40
Nodes (5): src/http/result.ts, ast_hash, mtime, seen, semantic_hash

### Community 77 - "HTTP Status Source File"
Cohesion: 0.40
Nodes (5): src/http/status.ts, ast_hash, mtime, seen, semantic_hash

### Community 78 - "HTTP Types Source File"
Cohesion: 0.40
Nodes (5): src/http/types.ts, ast_hash, mtime, seen, semantic_hash

### Community 79 - "Package Index Source File"
Cohesion: 0.40
Nodes (5): src/index.ts, ast_hash, mtime, seen, semantic_hash

### Community 80 - "Pipeline Contracts Source File"
Cohesion: 0.40
Nodes (5): src/pipeline/contracts.ts, ast_hash, mtime, seen, semantic_hash

### Community 81 - "Pipeline Index Source File"
Cohesion: 0.40
Nodes (5): src/pipeline/index.ts, ast_hash, mtime, seen, semantic_hash

### Community 82 - "Pipeline Reflector Source File"
Cohesion: 0.40
Nodes (5): src/pipeline/reflector.ts, ast_hash, mtime, seen, semantic_hash

### Community 83 - "Pipeline Tokens Source File"
Cohesion: 0.40
Nodes (5): src/pipeline/tokens.ts, ast_hash, mtime, seen, semantic_hash

### Community 84 - "Plugin Index Source File"
Cohesion: 0.40
Nodes (5): src/plugin/index.ts, ast_hash, mtime, seen, semantic_hash

### Community 85 - "Runtime Index Source File"
Cohesion: 0.40
Nodes (5): src/runtime/index.ts, ast_hash, mtime, seen, semantic_hash

### Community 86 - "Testing Index Source File"
Cohesion: 0.40
Nodes (5): src/testing/index.ts, ast_hash, mtime, seen, semantic_hash

### Community 87 - "Validation Extensions Source File"
Cohesion: 0.40
Nodes (5): src/validation/extensions.ts, ast_hash, mtime, seen, semantic_hash

### Community 88 - "Validation Meta Source File"
Cohesion: 0.40
Nodes (5): src/validation/meta.ts, ast_hash, mtime, seen, semantic_hash

### Community 89 - "Validation OpenAPI Source File"
Cohesion: 0.40
Nodes (5): src/validation/openapi.ts, ast_hash, mtime, seen, semantic_hash

### Community 90 - "Validation V Source File"
Cohesion: 0.40
Nodes (5): src/validation/v.ts, ast_hash, mtime, seen, semantic_hash

### Community 91 - "Boundaries Test File"
Cohesion: 0.40
Nodes (5): test/boundaries.spec.ts, ast_hash, mtime, seen, semantic_hash

### Community 92 - "Class Factory Test File"
Cohesion: 0.40
Nodes (5): test/class-factory.spec.ts, ast_hash, mtime, seen, semantic_hash

### Community 93 - "Decorator Modes Test File"
Cohesion: 0.40
Nodes (5): test/decorator-modes.spec.ts, ast_hash, mtime, seen, semantic_hash

### Community 94 - "DI Decorator Modes Test File"
Cohesion: 0.40
Nodes (5): test/di-decorators-modes.spec.ts, ast_hash, mtime, seen, semantic_hash

### Community 95 - "Entrypoints Test File"
Cohesion: 0.40
Nodes (5): test/entrypoints.spec.ts, ast_hash, mtime, seen, semantic_hash

### Community 96 - "HTTP Decorator Modes Test File"
Cohesion: 0.40
Nodes (5): test/http-decorators-modes.spec.ts, ast_hash, mtime, seen, semantic_hash

### Community 97 - "HTTP Exceptions Test File"
Cohesion: 0.40
Nodes (5): test/http-exceptions.spec.ts, ast_hash, mtime, seen, semantic_hash

### Community 98 - "Lambda Config Modes Test File"
Cohesion: 0.40
Nodes (5): test/lambda-config-modes.spec.ts, ast_hash, mtime, seen, semantic_hash

### Community 99 - "OpenAPI Decorators Test File"
Cohesion: 0.40
Nodes (5): test/openapi-decorators.spec.ts, ast_hash, mtime, seen, semantic_hash

### Community 100 - "Public API Tests"
Cohesion: 0.40
Nodes (5): test/public-api.spec.ts, ast_hash, mtime, seen, semantic_hash

### Community 101 - "Reflector Tests"
Cohesion: 0.40
Nodes (5): test/reflector.spec.ts, ast_hash, mtime, seen, semantic_hash

### Community 102 - "Build Dist Setup"
Cohesion: 0.40
Nodes (5): test/setup/build-dist.ts, ast_hash, mtime, seen, semantic_hash

### Community 103 - "Advanced Class Type Tests"
Cohesion: 0.40
Nodes (5): test/types/advanced-class.test-d.ts, ast_hash, mtime, seen, semantic_hash

### Community 104 - "Class Factory Type Tests"
Cohesion: 0.40
Nodes (5): test/types/class-factory.test-d.ts, ast_hash, mtime, seen, semantic_hash

### Community 105 - "DI Decorators Type Tests"
Cohesion: 0.40
Nodes (5): test/types/di-decorators.test-d.ts, ast_hash, mtime, seen, semantic_hash

### Community 106 - "DI Type Tests"
Cohesion: 0.40
Nodes (5): test/types/di.test-d.ts, ast_hash, mtime, seen, semantic_hash

### Community 107 - "Dual Decorators Type Tests"
Cohesion: 0.40
Nodes (5): test/types/dual-decorators.test-d.ts, ast_hash, mtime, seen, semantic_hash

### Community 108 - "HTTP Decorators Type Tests"
Cohesion: 0.40
Nodes (5): test/types/http-decorators.test-d.ts, ast_hash, mtime, seen, semantic_hash

### Community 109 - "HTTP Types Tests"
Cohesion: 0.40
Nodes (5): test/types/http-types.test-d.ts, ast_hash, mtime, seen, semantic_hash

### Community 110 - "Lambda Config Type Tests"
Cohesion: 0.40
Nodes (5): test/types/lambda-config.test-d.ts, ast_hash, mtime, seen, semantic_hash

### Community 111 - "Mode C Class/Method Decorators"
Cohesion: 0.40
Nodes (5): test/types/mode-c/class-and-method-decorators.ts, ast_hash, mtime, seen, semantic_hash

### Community 112 - "Mode C DI Decorators"
Cohesion: 0.40
Nodes (5): test/types/mode-c-di/di-decorators-and-markers.ts, ast_hash, mtime, seen, semantic_hash

### Community 113 - "Invalid Inject Decorator Test"
Cohesion: 0.40
Nodes (5): test/types/mode-c-di/invalid/inject-parameter-decorator.ts, ast_hash, mtime, seen, semantic_hash

### Community 114 - "Mode C DI Invalid Config"
Cohesion: 0.40
Nodes (5): test/types/mode-c-di/invalid/tsconfig.json, ast_hash, mtime, seen, semantic_hash

### Community 115 - "Mode C DI Config"
Cohesion: 0.40
Nodes (5): test/types/mode-c-di/tsconfig.json, ast_hash, mtime, seen, semantic_hash

### Community 116 - "Invalid HTTP Decorator Test"
Cohesion: 0.40
Nodes (5): test/types/mode-c-http/invalid/parameter-decorator.ts, ast_hash, mtime, seen, semantic_hash

### Community 117 - "Mode C HTTP Invalid Config"
Cohesion: 0.40
Nodes (5): test/types/mode-c-http/invalid/tsconfig.json, ast_hash, mtime, seen, semantic_hash

### Community 118 - "Mode C HTTP Config"
Cohesion: 0.40
Nodes (5): test/types/mode-c-http/tsconfig.json, ast_hash, mtime, seen, semantic_hash

### Community 119 - "Mode C Users Controller"
Cohesion: 0.40
Nodes (5): test/types/mode-c-http/users-controller.ts, ast_hash, mtime, seen, semantic_hash

### Community 120 - "Invalid Mode C Decorator Test"
Cohesion: 0.40
Nodes (5): test/types/mode-c/invalid/parameter-decorator.ts, ast_hash, mtime, seen, semantic_hash

### Community 121 - "Mode C Invalid Config"
Cohesion: 0.40
Nodes (5): test/types/mode-c/invalid/tsconfig.json, ast_hash, mtime, seen, semantic_hash

### Community 122 - "Mode C Lambda Config Test"
Cohesion: 0.40
Nodes (5): test/types/mode-c-lambda/lambda-config.ts, ast_hash, mtime, seen, semantic_hash

### Community 123 - "Mode C Lambda Config"
Cohesion: 0.40
Nodes (5): test/types/mode-c-lambda/tsconfig.json, ast_hash, mtime, seen, semantic_hash

### Community 124 - "Mode C Config"
Cohesion: 0.40
Nodes (5): test/types/mode-c/tsconfig.json, ast_hash, mtime, seen, semantic_hash

### Community 125 - "OpenAPI Decorators Type Tests"
Cohesion: 0.40
Nodes (5): test/types/openapi-decorators.test-d.ts, ast_hash, mtime, seen, semantic_hash

### Community 126 - "Pipeline Decorators Type Tests"
Cohesion: 0.40
Nodes (5): test/types/pipeline-decorators.test-d.ts, ast_hash, mtime, seen, semantic_hash

### Community 127 - "Pipeline Type Tests"
Cohesion: 0.40
Nodes (5): test/types/pipeline.test-d.ts, ast_hash, mtime, seen, semantic_hash

### Community 128 - "Validation Type Tests"
Cohesion: 0.40
Nodes (5): test/types/validation.test-d.ts, ast_hash, mtime, seen, semantic_hash

### Community 129 - "Validation Extensions Tests"
Cohesion: 0.40
Nodes (5): test/validation-extensions.spec.ts, ast_hash, mtime, seen, semantic_hash

### Community 130 - "Validation Meta Tests"
Cohesion: 0.40
Nodes (5): test/validation-meta.spec.ts, ast_hash, mtime, seen, semantic_hash

### Community 131 - "Validation OpenAPI Tests"
Cohesion: 0.40
Nodes (5): test/validation-openapi.spec.ts, ast_hash, mtime, seen, semantic_hash

### Community 132 - "TypeScript Config"
Cohesion: 0.40
Nodes (5): tsconfig.json, ast_hash, mtime, seen, semantic_hash

### Community 133 - "Tsdown Build Config"
Cohesion: 0.40
Nodes (5): tsdown.config.ts, ast_hash, mtime, seen, semantic_hash

### Community 134 - "Vitest Config"
Cohesion: 0.40
Nodes (5): vitest.config.ts, ast_hash, mtime, seen, semantic_hash

### Community 137 - "DI Injection Sample"
Cohesion: 0.50
Nodes (3): Connection, Inject, Injectable

## Knowledge Gaps
- **786 isolated node(s):** `DecoratableClass`, `DecoratableMethod`, `OpenapiOperationOptions`, `AbstractDto`, `CreateUserBody` (+781 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 980 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `OpenAPI Schema Validation` to `Dual Class/Method Decorators`, `HTTP Exception Classes`, `AST Analysis & Decorator Modes`, `DI Provider Types`, `DI Decorator Type Tests`, `Build Bundling Boundaries`, `Lambda Config Decorators`, `Class Factory Core`, `Validation Extensions`, `Pipeline Contracts`, `Package Dependencies`, `DI Decorator Mode Tests`, `Pipeline Decorators`, `HTTP Decorator Mode Tests`, `Class Factory Tests`, `HTTP Types`, `Public API Surface Tests`, `Advanced Class Type Tests`, `HTTP Decorator Type Tests`, `Zod Metadata Validation`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Why does `HttpStatus` connect `HTTP Status Codes` to `Dual Class/Method Decorators`, `HTTP Exception Classes`, `HTTP Types`, `HTTP Decorator Type Tests`, `HTTP Decorator Mode Tests`, `HTTP Parameter Decorators`, `Users Controller Fixtures`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Dev Tooling Dependencies` to `Package Dependencies`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `DecoratableClass`, `DecoratableMethod`, `OpenapiOperationOptions` to the rest of the system?**
  _786 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dual Class/Method Decorators` be split into smaller, more focused modules?**
  _Cohesion score 0.05070707070707071 - nodes in this community are weakly interconnected._
- **Should `HTTP Exception Classes` be split into smaller, more focused modules?**
  _Cohesion score 0.06281920326864147 - nodes in this community are weakly interconnected._
- **Should `AST Analysis & Decorator Modes` be split into smaller, more focused modules?**
  _Cohesion score 0.05554035567715458 - nodes in this community are weakly interconnected._
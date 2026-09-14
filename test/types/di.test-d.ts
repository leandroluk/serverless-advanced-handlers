import {describe, expectTypeOf, it} from 'vitest';
import {
  InjectionToken,
  Scope,
  type ClassProvider,
  type DynamicModule,
  type ExistingProvider,
  type FactoryProvider,
  type ModuleMetadata,
  type OnModuleDestroy,
  type OnModuleInit,
  type Provider,
  type Token,
  type TokenValue,
  type Type,
  type ValueProvider,
} from '#/index';

class ConfigService {
  readonly url: string = 'postgres://localhost';
}

class DatabaseService {
  constructor(readonly config: ConfigService) {}

  query(sql: string): Promise<string[]> {
    return Promise.resolve([sql]);
  }
}

class InMemoryDatabaseService extends DatabaseService {}

class LoggerService {
  log(message: string): void {
    void message;
  }
}

abstract class Repository {
  abstract find(): string[];
}

class UsersModule {}

const DATABASE_URL = new InjectionToken<string>('DATABASE_URL');
const DATABASE = new InjectionToken<DatabaseService>('DATABASE');
const LOGGER = Symbol('LOGGER');

describe('tokens', () => {
  it('Type accepts concrete classes with constructor parameters and abstract classes', () => {
    expectTypeOf(DatabaseService).toExtend<Type<DatabaseService>>();
    expectTypeOf(Repository).toExtend<Type<Repository>>();
    expectTypeOf(InMemoryDatabaseService).toExtend<Type<DatabaseService>>();
    expectTypeOf(LoggerService).not.toExtend<Type<DatabaseService>>();
    expectTypeOf<() => DatabaseService>().not.toExtend<Type<DatabaseService>>();
  });

  it('InjectionToken keeps the description and the type parameter', () => {
    expectTypeOf(DATABASE_URL.description).toEqualTypeOf<string>();
    expectTypeOf(DATABASE_URL).toEqualTypeOf<InjectionToken<string>>();
    expectTypeOf(DATABASE_URL).not.toExtend<InjectionToken<number>>();
    expectTypeOf<ConstructorParameters<typeof InjectionToken>>().toEqualTypeOf<[description: string]>();
  });

  it('Token accepts classes, InjectionToken, strings and symbols', () => {
    expectTypeOf(DatabaseService).toExtend<Token>();
    expectTypeOf(DATABASE_URL).toExtend<Token>();
    expectTypeOf('DATABASE_URL').toExtend<Token>();
    expectTypeOf(LOGGER).toExtend<Token>();
    expectTypeOf(DATABASE).toExtend<Token<DatabaseService>>();
    expectTypeOf(DATABASE_URL).not.toExtend<Token<DatabaseService>>();
    expectTypeOf<number>().not.toExtend<Token>();
  });

  it('TokenValue resolves the instance of a class', () => {
    expectTypeOf<TokenValue<typeof DatabaseService>>().toEqualTypeOf<DatabaseService>();
    expectTypeOf<TokenValue<typeof Repository>>().toEqualTypeOf<Repository>();
  });

  it('TokenValue resolves the T of an InjectionToken<T>', () => {
    expectTypeOf<TokenValue<typeof DATABASE_URL>>().toEqualTypeOf<string>();
    expectTypeOf<TokenValue<typeof DATABASE>>().toEqualTypeOf<DatabaseService>();
    expectTypeOf<TokenValue<InjectionToken<{port: number}>>>().toEqualTypeOf<{port: number}>();
  });

  it('TokenValue is unknown for string and symbol tokens', () => {
    expectTypeOf<TokenValue<'DATABASE_URL'>>().toEqualTypeOf<unknown>();
    expectTypeOf<TokenValue<string>>().toEqualTypeOf<unknown>();
    expectTypeOf<TokenValue<typeof LOGGER>>().toEqualTypeOf<unknown>();
    expectTypeOf<TokenValue<symbol>>().toEqualTypeOf<unknown>();
  });
});

describe('Scope', () => {
  it('exposes DEFAULT and REQUEST', () => {
    expectTypeOf<`${Scope.DEFAULT}`>().toEqualTypeOf<'default'>();
    expectTypeOf<`${Scope.REQUEST}`>().toEqualTypeOf<'request'>();
    expectTypeOf<`${Scope}`>().toEqualTypeOf<'default' | 'request'>();
    expectTypeOf(Scope.DEFAULT).toExtend<Scope>();
  });
});

describe('providers', () => {
  it('accepts the 5 valid provider shapes', () => {
    const classShorthand: Provider = DatabaseService;
    const useClass: Provider = {provide: DatabaseService, useClass: InMemoryDatabaseService, scope: Scope.REQUEST};
    const useValue: Provider = {provide: DATABASE_URL, useValue: 'postgres://localhost'};
    const useFactory: Provider = {
      provide: DATABASE,
      useFactory: (config: ConfigService): DatabaseService => new DatabaseService(config),
      inject: [ConfigService],
      scope: Scope.DEFAULT,
    };
    const useExisting: Provider = {provide: 'DB', useExisting: DatabaseService};

    expectTypeOf([classShorthand, useClass, useValue, useFactory, useExisting]).toExtend<readonly Provider[]>();
  });

  it('narrows each object shape to its own provider type', () => {
    expectTypeOf({provide: DatabaseService, useClass: InMemoryDatabaseService}).toExtend<
      ClassProvider<DatabaseService>
    >();
    expectTypeOf({provide: DATABASE_URL, useValue: 'postgres://localhost'}).toExtend<ValueProvider<string>>();
    expectTypeOf({provide: LOGGER, useFactory: (): LoggerService => new LoggerService()}).toExtend<
      FactoryProvider<LoggerService>
    >();
    expectTypeOf({provide: 'DB', useExisting: DATABASE}).toExtend<ExistingProvider<DatabaseService>>();
  });

  it('accepts sync and async factories with optional dependencies', () => {
    const sync: FactoryProvider<string> = {provide: DATABASE_URL, useFactory: (): string => 'postgres://localhost'};
    const asyncFactory: FactoryProvider<DatabaseService> = {
      provide: DATABASE,
      useFactory: async (config: ConfigService, logger?: LoggerService): Promise<DatabaseService> => {
        logger?.log('connecting');
        return new DatabaseService(config);
      },
      inject: [ConfigService, {token: LOGGER, optional: true}, DATABASE_URL, 'RAW'] as const,
    };

    expectTypeOf(sync).toExtend<Provider<string>>();
    expectTypeOf(asyncFactory).toExtend<Provider<DatabaseService>>();
  });

  it('rejects an optional dependency not marked optional: true', () => {
    const provider: FactoryProvider = {
      provide: LOGGER,
      useFactory: (): LoggerService => new LoggerService(),
      // @ts-expect-error `optional` only accepts `true`
      inject: [{token: ConfigService, optional: false}],
    };

    expectTypeOf(provider).toExtend<Provider>();
  });

  it('rejects two use* keys in the same provider', () => {
    // @ts-expect-error useClass and useValue are mutually exclusive
    const classAndValue: Provider = {provide: DatabaseService, useClass: DatabaseService, useValue: {}};
    // @ts-expect-error useFactory and useExisting are mutually exclusive
    const factoryAndExisting: Provider = {provide: 'DB', useFactory: (): number => 1, useExisting: DATABASE};
    // @ts-expect-error useValue and useExisting are mutually exclusive
    const valueAndExisting: Provider = {provide: 'DB', useValue: 1, useExisting: 'OTHER'};
    // @ts-expect-error useClass and useFactory are mutually exclusive
    const classAndFactory: Provider = {provide: 'DB', useClass: LoggerService, useFactory: (): number => 1};

    expectTypeOf([classAndValue, factoryAndExisting, valueAndExisting, classAndFactory]).toExtend<Provider[]>();
  });

  it('rejects an object provider without any use* key', () => {
    // @ts-expect-error an object provider needs one of useClass, useValue, useFactory or useExisting
    const onlyProvide: Provider = {provide: DatabaseService};
    // @ts-expect-error scope alone does not define a provider
    const provideAndScope: Provider = {provide: DatabaseService, scope: Scope.REQUEST};

    expectTypeOf([onlyProvide, provideAndScope]).toExtend<Provider[]>();
  });

  it('rejects inject outside useFactory', () => {
    // @ts-expect-error inject is only allowed with useFactory
    const classWithInject: Provider = {provide: DatabaseService, useClass: DatabaseService, inject: [ConfigService]};
    // @ts-expect-error inject is only allowed with useFactory
    const valueWithInject: Provider = {provide: DATABASE_URL, useValue: 'x', inject: []};
    // @ts-expect-error inject is only allowed with useFactory
    const existingWithInject: Provider = {provide: 'DB', useExisting: DATABASE, inject: [ConfigService]};

    expectTypeOf([classWithInject, valueWithInject, existingWithInject]).toExtend<Provider[]>();
  });

  it('rejects scope on providers that do not accept it', () => {
    // @ts-expect-error scope is not allowed with useValue
    const valueWithScope: Provider = {provide: DATABASE_URL, useValue: 'x', scope: Scope.REQUEST};
    // @ts-expect-error scope is not allowed with useExisting
    const existingWithScope: Provider = {provide: 'DB', useExisting: DATABASE, scope: Scope.REQUEST};

    expectTypeOf([valueWithScope, existingWithScope]).toExtend<Provider[]>();
  });

  it('rejects useClass and useValue incompatible with T', () => {
    // @ts-expect-error LoggerService is not a DatabaseService
    const wrongClass: Provider<DatabaseService> = {provide: DatabaseService, useClass: LoggerService};
    // @ts-expect-error a number is not a DatabaseService
    const wrongValue: Provider<DatabaseService> = {provide: DatabaseService, useValue: 42};
    // @ts-expect-error the factory result is not a DatabaseService
    const wrongFactory: Provider<DatabaseService> = {provide: DATABASE, useFactory: (): string => 'x'};
    // @ts-expect-error a class token of another type is not a Token<DatabaseService>
    const wrongProvide: Provider<DatabaseService> = {provide: LoggerService, useExisting: DATABASE};
    // @ts-expect-error LoggerService is not a DatabaseService
    const wrongShorthand: Provider<DatabaseService> = LoggerService;

    expectTypeOf([wrongClass, wrongValue, wrongFactory, wrongProvide, wrongShorthand]).toExtend<
      Provider<DatabaseService>[]
    >();
  });

  it('typed providers are assignable to Provider<unknown>', () => {
    expectTypeOf<ClassProvider<DatabaseService>>().toExtend<Provider>();
    expectTypeOf<ValueProvider<string>>().toExtend<Provider>();
    expectTypeOf<FactoryProvider<DatabaseService>>().toExtend<Provider>();
    expectTypeOf<ExistingProvider<DatabaseService>>().toExtend<Provider>();
    expectTypeOf<Type<DatabaseService>>().toExtend<Provider>();
  });
});

describe('modules', () => {
  it('ModuleMetadata accepts imports, controllers, providers and exports', () => {
    const configModule: DynamicModule = {
      module: UsersModule,
      global: true,
      providers: [{provide: DATABASE_URL, useValue: 'postgres://localhost'}],
      exports: [DATABASE_URL],
    };
    const metadata: ModuleMetadata = {
      imports: [UsersModule, configModule],
      controllers: [LoggerService],
      providers: [ConfigService, {provide: DATABASE, useExisting: DatabaseService}],
      exports: [DATABASE, 'RAW', LOGGER, configModule],
    };

    expectTypeOf(metadata).toExtend<ModuleMetadata>();
    expectTypeOf<DynamicModule>().toExtend<ModuleMetadata>();
    expectTypeOf<DynamicModule['module']>().toEqualTypeOf<Type>();
    expectTypeOf<DynamicModule['global']>().toEqualTypeOf<boolean | undefined>();
  });

  it('DynamicModule requires module', () => {
    // @ts-expect-error module is required
    const withoutModule: DynamicModule = {providers: [ConfigService]};

    expectTypeOf(withoutModule).toExtend<ModuleMetadata>();
  });

  it('ModuleMetadata rejects invalid entries', () => {
    // @ts-expect-error an object without use* is not a provider
    const badProviders: ModuleMetadata = {providers: [{provide: ConfigService}]};
    // @ts-expect-error a string is not a module
    const badImports: ModuleMetadata = {imports: ['UsersModule']};
    // @ts-expect-error a number is not a token
    const badExports: ModuleMetadata = {exports: [42]};

    expectTypeOf([badProviders, badImports, badExports]).toExtend<ModuleMetadata[]>();
  });
});

describe('lifecycle', () => {
  it('OnModuleInit and OnModuleDestroy accept sync and async hooks', () => {
    class SyncHooks implements OnModuleInit, OnModuleDestroy {
      onModuleInit(): void {}
      onModuleDestroy(): void {}
    }
    class AsyncHooks implements OnModuleInit, OnModuleDestroy {
      async onModuleInit(): Promise<void> {}
      async onModuleDestroy(): Promise<void> {}
    }

    expectTypeOf<OnModuleInit['onModuleInit']>().toEqualTypeOf<() => void | Promise<void>>();
    expectTypeOf<OnModuleDestroy['onModuleDestroy']>().toEqualTypeOf<() => void | Promise<void>>();
    expectTypeOf(new SyncHooks()).toExtend<OnModuleInit & OnModuleDestroy>();
    expectTypeOf(new AsyncHooks()).toExtend<OnModuleInit & OnModuleDestroy>();
  });

  it('rejects hooks with a non-void result', () => {
    // @ts-expect-error onModuleInit must return void or Promise<void>
    const badInit: OnModuleInit = {onModuleInit: (): Promise<number> => Promise.resolve(1)};

    expectTypeOf(badInit).toExtend<OnModuleInit>();
  });
});

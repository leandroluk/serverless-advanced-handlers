// Testes de tipo dos decorators e marcadores de DI no modo B (tsconfig do repositório).
// Tudo é importado do barrel raiz: `Inject` e `Optional` servem como valor e como tipo no mesmo import.
import {describe, expectTypeOf, test} from 'vitest';
import {
  Global,
  Inject,
  Injectable,
  InjectionToken,
  Module,
  Optional,
  Scope,
  type DualClassDecorator,
  type DynamicModule,
  type ModuleMetadata,
  type Token,
} from '#/index';

interface Config {
  readonly url: string;
}

interface Logger {
  log(message: string): void;
}

const CONFIG = new InjectionToken<Config>('CONFIG');
const LOGGER = Symbol('LOGGER');
const API_KEY = 'API_KEY';

@Injectable()
class UsersService {
  findAll(): string[] {
    return [];
  }
}

@Module({providers: [UsersService], exports: [UsersService]})
class UsersModule {
  static forRoot(): DynamicModule {
    return {module: UsersModule, global: true, providers: [{provide: CONFIG, useValue: {url: ''}}]};
  }
}

describe('assinaturas', () => {
  test('Module, Global e Injectable retornam DualClassDecorator', () => {
    expectTypeOf(Module).parameters.toEqualTypeOf<[ModuleMetadata]>();
    expectTypeOf(Module).returns.toEqualTypeOf<DualClassDecorator>();
    expectTypeOf(Global).parameters.toEqualTypeOf<[]>();
    expectTypeOf(Global).returns.toEqualTypeOf<DualClassDecorator>();
    expectTypeOf(Injectable).parameters.toEqualTypeOf<[options?: {scope?: Scope}]>();
    expectTypeOf(Injectable).returns.toEqualTypeOf<DualClassDecorator>();
  });

  test('Inject e Optional retornam ParameterDecorator', () => {
    expectTypeOf(Inject).parameters.toEqualTypeOf<[Token]>();
    expectTypeOf(Inject).returns.toEqualTypeOf<ParameterDecorator>();
    expectTypeOf(Optional).parameters.toEqualTypeOf<[]>();
    expectTypeOf(Optional).returns.toEqualTypeOf<ParameterDecorator>();
  });
});

describe('decorators de classe', () => {
  test('@Module aceita ModuleMetadata completo, inclusive DynamicModule em imports e exports', () => {
    @Global()
    @Module({
      imports: [UsersModule, UsersModule.forRoot()],
      controllers: [UsersService],
      providers: [
        UsersService,
        {provide: CONFIG, useValue: {url: 'postgres://localhost'}},
        {provide: API_KEY, useFactory: (): string => 'secret', inject: [CONFIG, {token: LOGGER, optional: true}]},
        {provide: LOGGER, useClass: UsersService, scope: Scope.REQUEST},
        {provide: 'USERS', useExisting: UsersService},
      ],
      exports: [UsersService, CONFIG, API_KEY, LOGGER, UsersModule.forRoot()],
    })
    class AppModule {}

    @Module({})
    class EmptyModule {}

    expectTypeOf(AppModule).toBeConstructibleWith();
    expectTypeOf(EmptyModule).toBeConstructibleWith();
  });

  test('@Module rejeita metadados com tipos errados', () => {
    // @ts-expect-error controllers aceita apenas classes
    @Module({controllers: ['x']})
    class StringController {}

    // @ts-expect-error imports não aceita tokens InjectionToken
    @Module({imports: [CONFIG]})
    class TokenImport {}

    // @ts-expect-error providers exige formas exclusivas (useValue e useClass juntos)
    @Module({providers: [{provide: CONFIG, useValue: {url: ''}, useClass: UsersService}]})
    class AmbiguousProvider {}

    // @ts-expect-error chave desconhecida em ModuleMetadata
    @Module({services: [UsersService]})
    class UnknownKey {}

    // @ts-expect-error metadados são obrigatórios
    @Module()
    class MissingMetadata {}

    expectTypeOf(StringController).toBeConstructibleWith();
    expectTypeOf(TokenImport).toBeConstructibleWith();
    expectTypeOf(AmbiguousProvider).toBeConstructibleWith();
    expectTypeOf(UnknownKey).toBeConstructibleWith();
    expectTypeOf(MissingMetadata).toBeConstructibleWith();
  });

  test('@Injectable aceita Scope.DEFAULT e Scope.REQUEST e rejeita valores inválidos', () => {
    @Injectable({scope: Scope.DEFAULT})
    class SingletonService {}

    @Injectable({scope: Scope.REQUEST})
    class RequestService {}

    @Injectable({})
    abstract class AbstractService {}

    // @ts-expect-error string literal não é Scope
    @Injectable({scope: 'request'})
    class LiteralScope {}

    // @ts-expect-error scope inexistente
    @Injectable({scope: 'transient'})
    class TransientScope {}

    // @ts-expect-error chave desconhecida nas opções
    @Injectable({durable: true})
    class UnknownOption {}

    // @ts-expect-error Global não recebe argumentos
    @Global(true)
    class GlobalWithArgument {}

    expectTypeOf(SingletonService).toBeConstructibleWith();
    expectTypeOf(RequestService).toBeConstructibleWith();
    expectTypeOf(AbstractService).toExtend<abstract new () => AbstractService>();
    expectTypeOf(LiteralScope).toBeConstructibleWith();
    expectTypeOf(TransientScope).toBeConstructibleWith();
    expectTypeOf(UnknownOption).toBeConstructibleWith();
    expectTypeOf(GlobalWithArgument).toBeConstructibleWith();
  });

  test('decorators de DI de classe não se aplicam a métodos', () => {
    class Target {
      // @ts-expect-error decorator de classe não se aplica a método
      @Injectable()
      run(): void {}
    }

    expectTypeOf<Target['run']>().returns.toBeVoid();
  });
});

describe('decorators de parâmetro', () => {
  test('@Inject e @Optional se aplicam a parâmetros de construtor, inclusive parameter properties', () => {
    @Injectable()
    class UsersController {
      constructor(
        @Inject(CONFIG) private readonly config: Config,
        @Inject(UsersService) readonly users: UsersService,
        @Inject(LOGGER) @Optional() private readonly logger: Logger | undefined,
        @Inject(API_KEY) apiKey: string,
        @Optional() readonly fallback?: UsersService
      ) {
        void apiKey;
      }

      url(): string {
        this.logger?.log(this.config.url);
        return this.config.url;
      }
    }

    expectTypeOf(UsersController).constructorParameters.toEqualTypeOf<
      [Config, UsersService, Logger | undefined, string, (UsersService | undefined)?]
    >();
  });

  test('@Inject exige um Token e @Optional não recebe argumentos', () => {
    class Target {
      constructor(
        // @ts-expect-error número não é Token
        @Inject(42) readonly value: number,
        // @ts-expect-error Inject exige o token
        @Inject() readonly missing: unknown,
        // @ts-expect-error Optional não recebe argumentos
        @Optional(CONFIG) readonly optional?: Config
      ) {}
    }

    expectTypeOf(Target).constructorParameters.toEqualTypeOf<[number, unknown, (Config | undefined)?]>();
  });
});

describe('marcadores de tipo', () => {
  test('Inject<typeof TOKEN> infere T de InjectionToken<T> e a instância de classes', () => {
    expectTypeOf<Inject<typeof CONFIG>>().toEqualTypeOf<Config>();
    expectTypeOf<Inject<typeof UsersService>>().toEqualTypeOf<UsersService>();
    expectTypeOf<Inject<InjectionToken<string>>>().toEqualTypeOf<string>();
  });

  test('tokens string e symbol exigem T explícito, senão resolvem unknown', () => {
    expectTypeOf<Inject<typeof LOGGER>>().toEqualTypeOf<unknown>();
    expectTypeOf<Inject<typeof API_KEY>>().toEqualTypeOf<unknown>();
    expectTypeOf<Inject<typeof LOGGER, Logger>>().toEqualTypeOf<Logger>();
    expectTypeOf<Inject<typeof API_KEY, string>>().toEqualTypeOf<string>();
  });

  test('T explícito sobrescreve o tipo inferido', () => {
    expectTypeOf<Inject<typeof CONFIG, Partial<Config>>>().toEqualTypeOf<Partial<Config>>();
  });

  test('Inject rejeita K que não seja Token', () => {
    // @ts-expect-error número não é Token
    type NumberToken = Inject<number>;
    // @ts-expect-error função que não é construtor não é Token
    type FunctionToken = Inject<() => Config>;

    expectTypeOf<NumberToken>().toBeUnknown();
    expectTypeOf<FunctionToken>().toBeUnknown();
  });

  test('Optional<T> inclui undefined', () => {
    expectTypeOf<Optional<Config>>().toEqualTypeOf<Config | undefined>();
    expectTypeOf<Optional<Inject<typeof CONFIG>>>().toEqualTypeOf<Config | undefined>();
    expectTypeOf<Optional<undefined>>().toEqualTypeOf<undefined>();
  });

  test('marcadores em parâmetros de construtor, com e sem decorator de classe', () => {
    @Injectable({scope: Scope.REQUEST})
    class UsersController {
      constructor(
        private readonly config: Inject<typeof CONFIG>,
        readonly users: Inject<typeof UsersService>,
        private readonly logger: Optional<Inject<typeof LOGGER, Logger>>,
        readonly apiKey: Inject<typeof API_KEY, string>
      ) {}

      url(): string {
        this.logger?.log(this.config.url);
        return this.config.url;
      }
    }

    class Undecorated {
      constructor(readonly config: Inject<typeof CONFIG>) {}
    }

    expectTypeOf(UsersController).constructorParameters.toEqualTypeOf<
      [Config, UsersService, Logger | undefined, string]
    >();
    expectTypeOf(Undecorated).constructorParameters.toEqualTypeOf<[Config]>();
  });

  test('decorator e marcador com o mesmo identificador convivem no mesmo parâmetro', () => {
    @Injectable()
    class Mixed {
      constructor(
        @Inject(CONFIG) readonly config: Inject<typeof CONFIG>,
        @Optional() readonly logger: Optional<Inject<typeof LOGGER, Logger>>
      ) {}
    }

    expectTypeOf(Mixed).constructorParameters.toEqualTypeOf<[Config, Logger | undefined]>();
  });
});

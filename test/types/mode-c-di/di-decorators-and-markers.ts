// Fixture do modo C (decorators TC39): compilada por test/di-decorators-modes.spec.ts com
// test/types/mode-c-di/tsconfig.json e deve passar sem erros. Decorators de classe de DI são os mesmos
// dos modos A e B; dependências de construtor usam os marcadores `Inject<...>` e `Optional<...>`.
import {Global, Inject, Injectable, InjectionToken, Module, Optional, Scope, type DynamicModule} from '#/index';

interface Config {
  readonly url: string;
}

interface Logger {
  log(message: string): void;
}

export const CONFIG = new InjectionToken<Config>('CONFIG');
export const LOGGER = Symbol('LOGGER');
export const API_KEY = 'API_KEY';

@Injectable()
export class UsersService {
  findAll(): string[] {
    return [];
  }
}

@Injectable({scope: Scope.REQUEST})
export class UsersController {
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

@Injectable({scope: Scope.DEFAULT})
export abstract class BaseRepository {
  abstract find(): string[];
}

@Global()
@Module({
  providers: [UsersService, {provide: CONFIG, useValue: {url: 'postgres://localhost'}}],
  exports: [UsersService, CONFIG],
})
export class UsersModule {
  static forRoot(): DynamicModule {
    return {module: UsersModule, global: true};
  }
}

@Module({
  imports: [UsersModule, UsersModule.forRoot()],
  controllers: [UsersController],
  providers: [{provide: API_KEY, useFactory: (): string => 'secret'}],
})
export class AppModule {}

// Os marcadores resolvem os tipos esperados também no modo C.
const config: Inject<typeof CONFIG> = {url: ''};
const logger: Optional<Inject<typeof LOGGER, Logger>> = undefined;
export const resolved: [Config, Logger | undefined] = [config, logger];

// @ts-expect-error controllers aceita apenas classes
@Module({controllers: ['x']})
export class InvalidModule {}

// @ts-expect-error string literal não é Scope
@Injectable({scope: 'request'})
export class InvalidScope {}

export class ClassDecoratorOnMethod {
  // @ts-expect-error decorator de classe não se aplica a método
  @Injectable()
  run(): void {}
}

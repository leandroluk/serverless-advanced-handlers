// Módulo dinâmico (REQ-034): `forRoot` recebe configuração analisável, mas a DI continua vindo do
// `@Module` estático da classe — os argumentos do `forRoot` só são validados (design, decisão 3).
import {Inject, Injectable, Module} from '#/decorators/di';
import type {DynamicModule} from '#/di/providers';
import {InjectionToken} from '#/di/tokens';

/** Contrato sem classe concreta: só resolve porque o parâmetro usa `@Inject(...)` (REQ-033). */
export interface ConfigOptions {
  url?: string;
  retries: number;
  debug: boolean;
  tags: readonly string[];
  nested: {region?: string};
}

export const CONFIG_OPTIONS = new InjectionToken<ConfigOptions>('CONFIG_OPTIONS');

const FALLBACK_OPTIONS: ConfigOptions = {retries: 0, debug: false, tags: [], nested: {}};

@Injectable()
export class ConfigService {
  constructor(@Inject(CONFIG_OPTIONS) readonly options: ConfigOptions) {}
}

@Module({
  providers: [{provide: CONFIG_OPTIONS, useValue: FALLBACK_OPTIONS}, ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {
  static forRoot(options: ConfigOptions): DynamicModule {
    return {module: ConfigModule, providers: [{provide: CONFIG_OPTIONS, useValue: options}]};
  }
}

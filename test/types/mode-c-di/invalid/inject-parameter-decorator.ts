// Fixture inválida do modo C (decorators TC39): compilada por test/di-decorators-modes.spec.ts com
// test/types/mode-c-di/invalid/tsconfig.json e deve falhar com TS1206, pois decorators TC39 não se
// aplicam a parâmetros (o equivalente são os marcadores `Inject<...>`). No modo B ela compila normalmente.
import {Inject, InjectionToken} from '#/index';

interface Config {
  readonly url: string;
}

const CONFIG = new InjectionToken<Config>('CONFIG');

export class UsersService {
  constructor(@Inject(CONFIG) private readonly config: Config) {}

  url(): string {
    return this.config.url;
  }
}

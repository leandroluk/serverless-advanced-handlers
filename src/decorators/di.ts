// Decorators e marcadores de tipo da injeção de dependência (REQ-030, REQ-031, REQ-033, REQ-007).
//
// Todos são no-op em runtime (Decision Log 1): o compilador extrai módulos, providers e tokens do
// código-fonte. Decorators de parâmetro compartilham o identificador com o marcador de tipo equivalente
// (Decision Log 2), então um único import serve aos três modos de decorators.
import {classDecorator, parameterDecorator, type DualClassDecorator} from '#/decorators/dual';
import type {ModuleMetadata, Scope} from '#/di/providers';
import type {Token, TokenValue} from '#/di/tokens';

/**
 * Declara um módulo com seus imports, controllers, providers e exports.
 *
 * @example
 * @Module({imports: [DatabaseModule], controllers: [UsersController], providers: [UsersService]})
 * export class UsersModule {}
 */
export function Module(metadata: ModuleMetadata): DualClassDecorator {
  void metadata;
  return classDecorator();
}

/** Torna os exports do módulo visíveis a todos os módulos sem precisar importá-lo. */
export function Global(): DualClassDecorator {
  return classDecorator();
}

/**
 * Marca a classe como provider injetável. `scope` define o ciclo de vida da instância: `Scope.DEFAULT`
 * (default, singleton por Lambda) ou `Scope.REQUEST` (instância por invocação).
 */
export function Injectable(options?: {scope?: Scope}): DualClassDecorator {
  void options;
  return classDecorator();
}

/**
 * Injeta o valor de `token` no parâmetro de construtor (modos A e B). No modo C, use o marcador de tipo
 * `Inject<typeof TOKEN>`.
 *
 * @example
 * constructor(@Inject(CONFIG) private readonly config: Config) {}
 */
export function Inject(token: Token): ParameterDecorator {
  void token;
  return parameterDecorator();
}

/**
 * Marcador de tipo equivalente a `@Inject(token)`, válido nos três modos. `T` é inferido de classes e de
 * `InjectionToken<T>`; tokens string e symbol precisam informar `T` explicitamente (senão `unknown`).
 *
 * @example
 * constructor(private readonly config: Inject<typeof CONFIG>) {}
 * constructor(private readonly logger: Inject<typeof LOGGER, Logger>) {}
 */
export type Inject<K extends Token, T = TokenValue<K>> = T;

/** Torna a dependência do parâmetro de construtor opcional (modos A e B); ausente, recebe `undefined`. */
export function Optional(): ParameterDecorator {
  return parameterDecorator();
}

/** Marcador de tipo equivalente a `@Optional()`, válido nos três modos. */
export type Optional<T> = T | undefined;

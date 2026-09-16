// Arrays de metadados fora do subconjunto analisável (REQ-036) — cada módulo dispara um `SAH100`.
// O teste calcula as linhas esperadas pelo conteúdo, então mover as declarações aqui é seguro.
import {Injectable, Module} from '#/decorators/di';
import type {Provider} from '#/di/providers';

@Injectable()
export class ArrayService {}

/** Lista montada em runtime: o compilador não sabe o conteúdo (`SpreadElement`). */
export const EXTRA_PROVIDERS: readonly Provider[] = [];

/** Chamada que não é `X.staticMethod(...)`: não é reconhecida em `providers`. */
export function makeProvider(): Provider {
  return ArrayService;
}

@Module({providers: [ArrayService, ...EXTRA_PROVIDERS]})
export class SpreadProvidersModule {}

@Module({providers: [makeProvider()]})
export class CallProvidersModule {}

// @ts-expect-error `providers` precisa ser um array literal — a fixture existe para provar o SAH100.
@Module({providers: ArrayService})
export class NotAnArrayModule {}

// @ts-expect-error `@Module` só aceita imports/controllers/providers/exports — a fixture prova o SAH100.
@Module({providers: [], extras: [ArrayService]})
export class UnknownKeyModule {}

// Metadados de provider fora do subconjunto analisável (REQ-032, REQ-036) — `SAH100`.
import {Injectable, Module} from '#/decorators/di';
import {Scope} from '#/di/providers';
import {InjectionToken} from '#/di/tokens';

export const METADATA_TOKEN = new InjectionToken<string>('METADATA_TOKEN');

/** Escopo decidido em runtime: o compilador precisa do valor literal. */
export function computeScope(): Scope {
  return Scope.REQUEST;
}

@Injectable({scope: computeScope()})
export class RuntimeScopeService {}

@Module({providers: [RuntimeScopeService]})
export class RuntimeScopeModule {}

export class MetadataService {}

// @ts-expect-error um provider objeto precisa de exatamente uma chave `use*` — a fixture prova o SAH100.
@Module({providers: [{provide: METADATA_TOKEN}]})
export class NoUseKeyModule {}

// @ts-expect-error `inject` só é válido junto de `useFactory` — a fixture prova o SAH100.
@Module({providers: [{provide: METADATA_TOKEN, useClass: MetadataService, inject: [MetadataService]}]})
export class InjectWithoutFactoryModule {}

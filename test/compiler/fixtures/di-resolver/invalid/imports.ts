// Elementos de `imports` que o compilador não consegue resolver a um módulo (REQ-036) — `SAH100`.
import {Injectable, Module} from '#/decorators/di';
import type {Type} from '#/di/tokens';

@Injectable()
export class ImportedService {}

@Module({providers: [ImportedService]})
export class RealModule {}

/** Classe sem `@Module`: não pode aparecer em `imports`. */
export class PlainClass {}

/** Fábrica de módulo: chamada que não é `X.staticMethod(...)`. */
export function makeModule(): Type {
  return RealModule;
}

@Module({imports: [PlainClass]})
export class MissingModuleDecoratorModule {}

@Module({imports: [makeModule()]})
export class UnknownCallModule {}

// Reexport explícito: `exports` não é transitivo, mas um módulo pode reexportar o token de um módulo
// que ele importa, e aí quem o importa passa a enxergar o provider (design, decisão 2).
import {Injectable, Module} from '#/decorators/di';

@Injectable()
export class Clock {
  now(): number {
    return 0;
  }
}

@Module({providers: [Clock], exports: [Clock]})
export class ClockModule {}

@Module({imports: [ClockModule], exports: [Clock]})
export class ClockFacadeModule {}

@Injectable()
export class Scheduler {
  constructor(readonly clock: Clock) {}
}

@Module({imports: [ClockFacadeModule], providers: [Scheduler]})
export class ReExportRootModule {}

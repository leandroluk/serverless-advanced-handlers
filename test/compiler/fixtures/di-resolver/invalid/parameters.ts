// Parâmetros de construtor que não resolvem a uma classe e não têm `@Inject` (REQ-033) — `SAH103`.
import {Inject, Injectable, Module} from '#/decorators/di';
import {InjectionToken} from '#/di/tokens';

export interface Clock {
  now(): number;
}

export const CLOCK = new InjectionToken<Clock>('CLOCK');

@Injectable()
export class InterfaceConsumer {
  constructor(readonly clock: Clock) {}
}

@Module({providers: [InterfaceConsumer]})
export class InterfaceParameterModule {}

@Injectable()
export class PrimitiveConsumer {
  constructor(readonly retries: number) {}
}

@Module({providers: [PrimitiveConsumer]})
export class PrimitiveParameterModule {}

/** Mesmo parâmetro de interface do primeiro caso, agora com `@Inject(TOKEN)`: resolve sem erro. */
@Injectable()
export class InjectedConsumer {
  constructor(@Inject(CLOCK) readonly clock: Clock) {}
}

@Module({providers: [{provide: CLOCK, useValue: {now: (): number => 0}}, InjectedConsumer]})
export class InjectedParameterModule {}

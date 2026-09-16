// Ciclos de dependência de 2 e de 3 classes (REQ-037) — `SAH102` com o ciclo completo na mensagem.
import {Injectable, Module} from '#/decorators/di';

@Injectable()
export class Alpha {
  constructor(readonly beta: Beta) {}
}

@Injectable()
export class Beta {
  constructor(readonly alpha: Alpha) {}
}

@Module({providers: [Alpha, Beta]})
export class CycleOfTwoModule {}

@Injectable()
export class One {
  constructor(readonly two: Two) {}
}

@Injectable()
export class Two {
  constructor(readonly three: Three) {}
}

@Injectable()
export class Three {
  constructor(readonly one: One) {}
}

@Module({providers: [One, Two, Three]})
export class CycleOfThreeModule {}

@Injectable()
export class SelfReferencing {
  constructor(readonly itself: SelfReferencing) {}
}

@Module({providers: [SelfReferencing]})
export class SelfCycleModule {}

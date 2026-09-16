// `@Global()` publica exatamente o que está em `exports` (REQ-030): `GlobalShared` fica visível de um
// módulo que não importa `PartialGlobalModule`; `GlobalHidden`, não.
import {Global, Injectable, Module} from '#/decorators/di';

@Injectable()
export class GlobalShared {}

@Injectable()
export class GlobalHidden {}

@Global()
@Module({providers: [GlobalShared, GlobalHidden], exports: [GlobalShared]})
export class PartialGlobalModule {}

@Injectable()
export class SharedGlobalConsumer {
  constructor(readonly shared: GlobalShared) {}
}

@Module({providers: [SharedGlobalConsumer]})
export class SharedGlobalChildModule {}

/** Raiz válida: o filho enxerga `GlobalShared` sem importar o módulo global. */
@Module({imports: [PartialGlobalModule, SharedGlobalChildModule]})
export class SharedGlobalRootModule {}

@Injectable()
export class HiddenGlobalConsumer {
  constructor(readonly hidden: GlobalHidden) {}
}

@Module({providers: [HiddenGlobalConsumer]})
export class HiddenGlobalChildModule {}

/** Raiz inválida: `GlobalHidden` não está em `exports`, então o `@Global()` não o publica. */
@Module({imports: [PartialGlobalModule, HiddenGlobalChildModule]})
export class HiddenGlobalRootModule {}

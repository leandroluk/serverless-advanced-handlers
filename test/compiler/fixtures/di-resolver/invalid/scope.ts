// Falhas do lookup de escopo: token inexistente (`SAH101`) e provider existente mas não exportado
// (`SAH104`), que precisam ser distinguíveis um do outro.
import {Inject, Injectable, Module} from '#/decorators/di';
import {InjectionToken} from '#/di/tokens';

export const ORPHAN_TOKEN = new InjectionToken<string>('ORPHAN_TOKEN');

@Injectable()
export class OrphanConsumer {
  constructor(@Inject(ORPHAN_TOKEN) readonly value: string) {}
}

@Module({providers: [OrphanConsumer]})
export class MissingTokenModule {}

@Injectable()
export class Secret {}

/** Provê `Secret`, mas não o exporta. */
@Module({providers: [Secret]})
export class SecretModule {}

@Injectable()
export class SecretConsumer {
  constructor(readonly secret: Secret) {}
}

@Module({imports: [SecretModule], providers: [SecretConsumer]})
export class NotExportedModule {}

@Injectable()
export class HiddenConsumer {
  constructor(readonly secret: Secret) {}
}

/** Não importa `SecretModule`: o provider não existe no escopo (`SAH101`, não `SAH104`). */
@Module({providers: [HiddenConsumer]})
export class HiddenModule {}

@Injectable()
export class Shared {}

@Module({providers: [Shared], exports: [Shared]})
export class SharedModule {}

/** Importa `SharedModule` sem reexportar `Shared`: `exports` não é transitivo (design, decisão 2). */
@Module({imports: [SharedModule]})
export class PassThroughModule {}

@Injectable()
export class DeepConsumer {
  constructor(readonly shared: Shared) {}
}

@Module({imports: [PassThroughModule], providers: [DeepConsumer]})
export class NotTransitiveModule {}

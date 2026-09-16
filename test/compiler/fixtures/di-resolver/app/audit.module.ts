// Módulo `@Global()` (REQ-030): só o que está em `exports` fica visível de qualquer módulo.
import {Global, Injectable, Module} from '#/decorators/di';
import {AUDIT_SINK, TRACE_ID} from './tokens';

@Injectable()
export class AuditLogger {
  audit(message: string): string {
    return message;
  }
}

/** Provider do módulo global fora de `exports`: continua invisível para quem não o importa. */
@Injectable()
export class AuditBuffer {
  readonly entries: string[] = [];
}

@Global()
@Module({
  providers: [AuditLogger, AuditBuffer, {provide: AUDIT_SINK, useValue: 'stdout'}, {provide: TRACE_ID, useValue: 'tr'}],
  exports: [AuditLogger, AUDIT_SINK, TRACE_ID],
})
export class AuditModule {}

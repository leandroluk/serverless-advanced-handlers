// Camada mais funda da cadeia `AppModule → UsersModule → DatabaseModule`.
import {Inject, Injectable, Module} from '#/decorators/di';
import {AuditLogger} from './audit.module';
import {DATABASE_URL, TRACE_ID} from './tokens';

@Injectable()
export class Connection {
  constructor(
    @Inject(DATABASE_URL) readonly url: string,
    @Inject(TRACE_ID) readonly traceId: string
  ) {}
}

@Injectable()
export class Database {
  /** `auditLogger` vem do módulo `@Global()`, que `DatabaseModule` nunca importa (REQ-030). */
  constructor(
    readonly connection: Connection,
    readonly auditLogger: AuditLogger
  ) {}
}

@Module({
  providers: [{provide: DATABASE_URL, useValue: 'postgres://localhost/app'}, Connection, Database],
  exports: [Database],
})
export class DatabaseModule {}

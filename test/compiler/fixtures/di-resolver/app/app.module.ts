// Módulo raiz da aplicação de fixture: encadeia `AppModule → UsersModule → DatabaseModule`, importa um
// módulo `@Global()` e um módulo dinâmico, e declara o único controller.
import {Inject, Module, Optional} from '#/decorators/di';
import {HttpController} from '#/decorators/http';
import {AuditModule} from './audit.module';
import {ConfigModule, ConfigService} from './config.module';
import {MAX_RETRIES} from './constants';
import {ReportsModule, ReportsService} from './reports.module';
import {FEATURE_FLAGS} from './tokens';
import {UsersModule, UsersService} from './users.module';

@HttpController('/users')
export class UsersController {
  constructor(
    readonly users: UsersService,
    readonly reports: ReportsService,
    readonly config: ConfigService,
    @Optional() @Inject(FEATURE_FLAGS) readonly flags?: readonly string[]
  ) {}
}

@Module({
  imports: [
    AuditModule,
    ConfigModule.forRoot({
      url: process.env.DATABASE_URL,
      retries: MAX_RETRIES,
      debug: false,
      tags: ['users', 'reports'],
      nested: {region: process.env.AWS_REGION},
    }),
    UsersModule,
    ReportsModule,
  ],
  controllers: [UsersController],
  providers: [],
})
export class AppModule {}

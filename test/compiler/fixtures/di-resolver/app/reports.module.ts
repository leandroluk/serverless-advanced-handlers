// As quatro formas de provider objeto (REQ-032): `useValue`, `useClass`, `useExisting` e `useFactory`
// com `inject` (incluindo uma entrada `{token, optional: true}`).
import {Inject, Injectable, Module} from '#/decorators/di';
import {InjectionToken} from '#/di/tokens';
import {Database, DatabaseModule} from './database.module';
import {FEATURE_FLAGS} from './tokens';

export interface Mailer {
  send(to: string): string;
}

export const MAILER = new InjectionToken<Mailer>('MAILER');
export const LEGACY_MAILER = new InjectionToken<Mailer>('LEGACY_MAILER');
export const REPORT_BUILDER = new InjectionToken<ReportBuilder>('REPORT_BUILDER');

export class SmtpMailer implements Mailer {
  send(to: string): string {
    return to;
  }
}

export class ReportBuilder {
  constructor(
    readonly database: Database,
    readonly flags?: readonly string[]
  ) {}
}

@Injectable()
export class ReportsService {
  constructor(
    @Inject(REPORT_BUILDER) readonly builder: ReportBuilder,
    @Inject(LEGACY_MAILER) readonly mailer: Mailer,
    @Inject('reports.version') readonly version: string
  ) {}
}

@Module({
  imports: [DatabaseModule],
  providers: [
    {provide: 'reports.version', useValue: '1.0.0'},
    {provide: MAILER, useClass: SmtpMailer},
    {provide: LEGACY_MAILER, useExisting: MAILER},
    {
      provide: REPORT_BUILDER,
      useFactory: (database: Database, flags?: readonly string[]): ReportBuilder => new ReportBuilder(database, flags),
      inject: [Database, {token: FEATURE_FLAGS, optional: true}],
    },
    ReportsService,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}

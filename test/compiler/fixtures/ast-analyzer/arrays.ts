// Cenários de array de metadados (analisáveis e não-analisáveis) lidos por `readAnalyzableArray`.
// O teste calcula as linhas esperadas pelo conteúdo, então mover as declarações aqui é seguro.
import {Logger} from './barrel';
import {Module} from './decorators';

export class Alpha {
  readonly alpha = 'alpha';
}

export class Beta {
  readonly beta = 'beta';
}

/** Valor espalhado num array: o compilador não sabe o conteúdo (`SpreadElement`). */
export const EXTRA: ReadonlyArray<unknown> = [];

/** Condição decidida em runtime: o array deixa de ser estático (`ConditionalExpression`). */
export const FLAG: boolean = true;

export function makeProvider(): unknown {
  return Alpha;
}

@Module({providers: [Alpha, Beta, Logger]})
export class ValidArrayModule {}

@Module({providers: [Alpha, {provide: Alpha, useClass: Beta}, makeProvider()]})
export class MixedKindsModule {}

@Module({providers: [Alpha, ...EXTRA]})
export class SpreadArrayModule {}

@Module({providers: [Alpha, FLAG ? Alpha : Beta]})
export class ConditionalArrayModule {}

@Module({providers: [Alpha, FLAG ? Beta : Alpha, ...EXTRA]})
export class FirstOffenderModule {}

@Module({providers: Alpha})
export class NotAnArrayModule {}

@Module({providers: []})
export class EmptyArrayModule {}

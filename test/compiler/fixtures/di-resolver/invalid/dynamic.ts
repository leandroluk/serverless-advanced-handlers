// Argumentos de módulo dinâmico fora do subconjunto analisável (REQ-034) — `SAH105`.
import {Module} from '#/decorators/di';
import type {DynamicModule} from '#/di/providers';

export interface FeatureOptions {
  name: string;
  retries: number;
  nested?: {region: string};
}

/** Objeto de configuração montado fora da chamada: o argumento deixa de ser um literal. */
export const FEATURE_OPTIONS: FeatureOptions = {name: 'feature', retries: 1};

export function computeRetries(): number {
  return 2;
}

@Module({})
export class FeatureModule {
  static forRoot(options: FeatureOptions): DynamicModule {
    void options;
    return {module: FeatureModule};
  }
}

@Module({imports: [FeatureModule.forRoot(FEATURE_OPTIONS)]})
export class IdentifierArgumentModule {}

@Module({imports: [FeatureModule.forRoot({name: 'feature', retries: computeRetries()})]})
export class ComputedArgumentModule {}

@Module({imports: [FeatureModule.forRoot({name: 'feature', retries: 1, nested: {region: computeRetries.name}})]})
export class NestedArgumentModule {}

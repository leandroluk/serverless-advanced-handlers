// Fixture usada por test/compiler/errors.spec.ts: fornece nós reais (em linhas diferentes) para o
// CompilerError extrair arquivo e linha. O teste calcula a linha esperada pelo conteúdo, então mover
// as declarações dentro do arquivo é seguro.
export const SAMPLE_TOKEN = Symbol('sample');

export class SampleProvider {
  constructor(readonly token: symbol) {}

  run(): string {
    return 'sample';
  }
}

// Fixture do modo B (`experimentalDecorators` + `emitDecoratorMetadata`, o padrão do framework): existe para
// o `ts-morph` ter ao menos um arquivo no Project criado a partir de test/compiler/fixtures/mode-b/tsconfig.json.
export class SampleServiceB {
  label(): string {
    return 'mode-b';
  }
}

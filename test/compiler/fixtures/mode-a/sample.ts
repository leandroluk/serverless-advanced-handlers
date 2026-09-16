// Fixture do modo A (só `experimentalDecorators`): existe para o `ts-morph` ter ao menos um arquivo no
// Project criado a partir de test/compiler/fixtures/mode-a/tsconfig.json.
export class SampleServiceA {
  label(): string {
    return 'mode-a';
  }
}

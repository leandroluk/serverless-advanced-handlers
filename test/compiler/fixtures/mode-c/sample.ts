// Fixture do modo C (decorators TC39, nenhum dos dois flags legados): existe para o `ts-morph` ter ao menos um
// arquivo no Project criado a partir de test/compiler/fixtures/mode-c/tsconfig.json.
export class SampleServiceC {
  label(): string {
    return 'mode-c';
  }
}

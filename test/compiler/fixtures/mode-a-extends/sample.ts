// Fixture do modo A obtido por override: herda os dois flags legados da base do modo B e desliga
// `emitDecoratorMetadata` — o efetivo (A) tem de vencer o que a base declara (B).
export class SampleServiceAExtends {
  label(): string {
    return 'mode-a-extends';
  }
}

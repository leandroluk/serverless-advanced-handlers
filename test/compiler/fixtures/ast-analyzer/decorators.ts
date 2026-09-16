// Fixture de test/compiler/ast-analyzer.spec.ts: decorators locais, sem depender da API pública do
// pacote. O analisador só lê o nome e o argumento na AST — nenhum decorator daqui é executado.

/** Equivalente local a `@Module({...})`: recebe metadados arbitrários para serem lidos da AST. */
export function Module(metadata: unknown): ClassDecorator {
  void metadata;
  return (): void => {};
}

/** Equivalente local a `@Injectable()`: decorator chamado, porém sem nenhum argumento. */
export function Injectable(): ClassDecorator {
  return (): void => {};
}

/** Decorator usado sem chamada (`@Marker`), para cobrir o caso sem `CallExpression`. */
export function Marker(_target: unknown): void {}

/** Equivalente local a `@Inject(TOKEN)`, para cobrir decorator de parâmetro. */
export function Inject(token: unknown): ParameterDecorator {
  void token;
  return (): void => {};
}

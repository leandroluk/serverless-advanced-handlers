/** Contrato sem classe concreta: a resolução precisa devolver `undefined`, não lançar. */
export interface Config {
  readonly url: string;
}

/** Type alias sem classe concreta. */
export type ConfigAlias = {readonly port: number};

/** Token string: identificador que resolve a uma `VariableDeclaration`, nunca a uma `ClassDeclaration`. */
export const CONFIG_TOKEN = 'ast-analyzer.config';

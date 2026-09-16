/** Classe concreta alvo das resoluções através do barrel encadeado (`services/index.ts` → `barrel.ts`). */
export class Logger {
  log(message: string): string {
    return message;
  }
}

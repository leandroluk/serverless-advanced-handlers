// Fixture inválida do modo C (decorators TC39): compilada por test/decorator-modes.spec.ts com
// test/types/mode-c/invalid/tsconfig.json e deve falhar com TS1206, pois decorators TC39 não se
// aplicam a parâmetros. No modo B (tsconfig do repositório) ela compila normalmente.
import {parameterDecorator} from '#/decorators/dual';

export class Greeter {
  constructor(@parameterDecorator() readonly prefix: string) {}

  greet(@parameterDecorator() name: string): string {
    return `${this.prefix} ${name}`;
  }
}

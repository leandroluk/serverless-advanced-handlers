// Fixture do modo C (decorators TC39): compilada por test/decorator-modes.spec.ts com
// test/types/mode-c/tsconfig.json e deve passar sem erros.
import {classDecorator, classOrMethodDecorator, methodDecorator} from '#/decorators/dual';

@classDecorator()
@classOrMethodDecorator()
export class Greeter {
  constructor(readonly prefix: string) {}

  @methodDecorator()
  @classOrMethodDecorator()
  greet(name: string): string {
    return `${this.prefix} ${name}`;
  }

  @methodDecorator()
  @classOrMethodDecorator()
  static create(prefix: string): Greeter {
    return new Greeter(prefix);
  }

  // `this` explícito: exige que a assinatura TC39 seja genérica em `This`.
  @methodDecorator()
  @classOrMethodDecorator()
  withThis(this: Greeter): string {
    return this.prefix;
  }

  @methodDecorator()
  @classOrMethodDecorator()
  static withStaticThis(this: typeof Greeter): string {
    return this.name;
  }
}

@classDecorator()
@classOrMethodDecorator()
export abstract class BaseGreeter {
  @methodDecorator()
  describe(): string {
    return 'base';
  }
}

export class ClassDecoratorOnMethod {
  // @ts-expect-error decorator de classe não se aplica a método
  @classDecorator()
  run(): void {}
}

// @ts-expect-error decorator de método não se aplica a classe
@methodDecorator()
export class MethodDecoratorOnClass {}

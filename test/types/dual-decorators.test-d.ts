// Testes de tipo dos decorators duais no modo B (tsconfig do repositório).
import {describe, expectTypeOf, test} from 'vitest';
import {
  classDecorator,
  classOrMethodDecorator,
  methodDecorator,
  parameterDecorator,
  type DualClassDecorator,
  type DualClassOrMethodDecorator,
  type DualMethodDecorator,
} from '#/decorators/dual';

describe('factories de decorators duais', () => {
  test('retornam os tipos duais e o ParameterDecorator legado', () => {
    expectTypeOf(classDecorator()).toEqualTypeOf<DualClassDecorator>();
    expectTypeOf(methodDecorator()).toEqualTypeOf<DualMethodDecorator>();
    expectTypeOf(classOrMethodDecorator()).toEqualTypeOf<DualClassOrMethodDecorator>();
    expectTypeOf(parameterDecorator()).toEqualTypeOf<ParameterDecorator>();
    expectTypeOf<DualClassOrMethodDecorator>().toEqualTypeOf<DualClassDecorator & DualMethodDecorator>();
  });
});

describe('aplicação no modo B', () => {
  test('decorators de classe, método, classe-ou-método e parâmetro se aplicam sem erro', () => {
    @classDecorator()
    @classOrMethodDecorator()
    class Greeter {
      constructor(@parameterDecorator() readonly prefix: string) {}

      @methodDecorator()
      @classOrMethodDecorator()
      greet(@parameterDecorator() name: string): string {
        return `${this.prefix} ${name}`;
      }

      @methodDecorator()
      @classOrMethodDecorator()
      static create(@parameterDecorator() prefix: string): Greeter {
        return new Greeter(prefix);
      }

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
    abstract class BaseGreeter {
      @methodDecorator()
      describe(): string {
        return 'base';
      }
    }

    expectTypeOf(Greeter.create('olá').greet('mundo')).toEqualTypeOf<string>();
    expectTypeOf<BaseGreeter['describe']>().returns.toEqualTypeOf<string>();
  });

  test('decorator de classe em método e decorator de método em classe geram erro', () => {
    class ClassDecoratorOnMethod {
      // @ts-expect-error decorator de classe não se aplica a método
      @classDecorator()
      run(): void {}
    }

    // @ts-expect-error decorator de método não se aplica a classe
    @methodDecorator()
    class MethodDecoratorOnClass {}

    expectTypeOf<ClassDecoratorOnMethod['run']>().returns.toBeVoid();
    expectTypeOf(MethodDecoratorOnClass).toBeConstructibleWith();
  });
});

// Primitivas dos decorators duais (REQ-005).
//
// Cada decorator público do framework é uma função no-op com assinatura dupla: a forma legada
// (`experimentalDecorators`, modos A e B) e a forma TC39 (modo C). A semântica é extraída pelo
// compilador a partir do código-fonte, então nada acontece em runtime.

/** Construtor de classe decorável, incluindo classes abstratas. */
type DecoratableClass = abstract new (...args: never[]) => unknown;

/** Método de classe decorável, com `this` explícito ou inferido do contexto do decorator. */
type DecoratableMethod<This> = (this: This, ...args: never[]) => unknown;

/**
 * Decorator de classe aceito nos dois modos de decorators:
 * - legado: `(target) => void`;
 * - TC39: `(value, context: ClassDecoratorContext) => void`.
 */
export type DualClassDecorator = ((target: DecoratableClass) => void) &
  ((value: DecoratableClass, context: ClassDecoratorContext) => void);

/**
 * Decorator de método aceito nos dois modos de decorators:
 * - legado: `(target, propertyKey, descriptor) => void`;
 * - TC39: `(value, context: ClassMethodDecoratorContext) => void`.
 *
 * A forma TC39 é genérica em `This`: com o default `unknown` de `ClassMethodDecoratorContext`, métodos com
 * parâmetro `this` explícito seriam rejeitados no modo C, embora aceitos nos modos A e B.
 */
export type DualMethodDecorator = ((
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
) => void) &
  (<This>(value: DecoratableMethod<This>, context: ClassMethodDecoratorContext<This>) => void);

/** Decorator aplicável tanto a classes quanto a métodos, nos dois modos de decorators. */
export type DualClassOrMethodDecorator = DualClassDecorator & DualMethodDecorator;

const noop = (): undefined => undefined;

/** Cria um decorator de classe dual no-op. */
export function classDecorator(): DualClassDecorator {
  return noop;
}

/** Cria um decorator de método dual no-op. */
export function methodDecorator(): DualMethodDecorator {
  return noop;
}

/** Cria um decorator dual no-op aplicável a classes e a métodos. */
export function classOrMethodDecorator(): DualClassOrMethodDecorator {
  return noop;
}

/**
 * Cria um decorator de parâmetro no-op. Só existe na forma legada: decorators TC39 não se aplicam a
 * parâmetros (`TS1206` no modo C), onde o equivalente são os marcadores de tipo (REQ-007).
 */
export function parameterDecorator(): ParameterDecorator {
  return noop;
}

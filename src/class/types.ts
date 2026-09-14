import type * as z from 'zod';

/**
 * Construtor de qualquer aridade, inclusive abstrato.
 *
 * Os argumentos são `never` (e não `any`): com `strictFunctionTypes` o parâmetro de um construtor é contravariante,
 * e `never` é atribuível a qualquer parâmetro, então toda classe satisfaz esta restrição.
 */
type AbstractConstructor = abstract new (...args: never) => object;

/**
 * Classe base criada por `Class(source)` a partir de um `ZodObject` (REQ-020..REQ-024).
 *
 * Os estáticos que dependem da subclasse chamadora (`parse`/`safeParse`) usam `this` genérico, porque o TypeScript
 * não tem `this` polimórfico em membros estáticos.
 */
export interface AdvancedClass<S extends z.ZodObject = z.ZodObject> {
  /** Atribui os dados sem validar (REQ-024). Para validar, use `parse`. */
  new (data: z.output<S>): z.output<S>;
  /** `ZodObject` puro: base para composição e OpenAPI. */
  readonly object: S;
  readonly shape: S['shape'];
  /** Codec objeto → instância, tipado como campos. Para tipar um campo aninhado como instância, use `instance(Cls)`. */
  readonly schema: z.ZodCodec<S, z.ZodType<z.output<S>>>;
  omit: S['omit'];
  pick: S['pick'];
  partial: S['partial'];
  extend: S['extend'];
  /** Valida e retorna instância da subclasse chamadora (REQ-022). */
  parse<T extends AbstractConstructor>(this: T, input: unknown): InstanceType<T>;
  /** Valida sem lançar erro e retorna instância da subclasse chamadora (REQ-022). */
  safeParse<T extends AbstractConstructor>(this: T, input: unknown): z.ZodSafeParseResult<InstanceType<T>>;
  /** Serializa instância ou objeto plano (inclusive com classes aninhadas) para o formato de transporte (REQ-023). */
  encode(value: z.output<S> | z.input<S>): z.input<S>;
}

/**
 * Supertipo de toda classe `Class()` e de suas subclasses, para uso como restrição genérica.
 *
 * `AdvancedClass` sem argumento não serve para isso: o parâmetro do construtor é contravariante, e
 * `z.output<z.ZodObject>` (`Record<string, unknown>`) não é atribuível aos campos de um schema concreto. Por isso o
 * construtor aceita `never`, e os estáticos vêm de `AdvancedClass`.
 */
export type AnyAdvancedClass = AbstractConstructor & Pick<AdvancedClass, keyof AdvancedClass>;

/** Assinatura de `Class(source)`: aceita um `ZodObject` ou outra classe `Class()` (REQ-020). */
export type ClassFactory = <S extends z.ZodObject>(source: S | AdvancedClass<S>) => AdvancedClass<S>;

/** Assinatura de `instance(Cls)`: campo que referencia outra classe `Class()`, tipado como instância (REQ-026). */
export type InstanceSchemaFactory = <T extends AnyAdvancedClass>(
  cls: T
) => z.ZodCodec<T['object'], z.ZodType<InstanceType<T>>>;

/** Assinatura de `isServerlessAdvancedHandlersClass(value)`: type guard de classes `Class()` (REQ-025). */
export type AdvancedClassGuard = (value: unknown) => value is AdvancedClass;

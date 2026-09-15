/**
 * Constructor of `T`, including abstract classes and classes whose constructor takes parameters.
 */
export type Type<T = unknown> = abstract new (...args: never[]) => T;

/**
 * Typed token for values that have no class of their own (configuration, primitives, interfaces).
 *
 * @example
 * const DATABASE_URL = new InjectionToken<string>('DATABASE_URL');
 */
export class InjectionToken<T> {
  /**
   * Phantom marker of `T`: exists only at the type level, so `TokenValue` can infer it.
   * `private` makes `InjectionToken` nominal — without it, any `{ description: string }`
   * object structurally satisfies `Token<T>`, defeating the point of a typed token.
   */
  declare private readonly __type: T;

  readonly description: string;

  constructor(description: string) {
    this.description = description;
  }
}

/**
 * Anything accepted as a DI token: a class, an `InjectionToken<T>`, a string or a symbol.
 */
export type Token<T = unknown> = Type<T> | InjectionToken<T> | string | symbol;

/**
 * Value resolved by a token: the instance of a class, the `T` of an `InjectionToken<T>`,
 * and `unknown` for string and symbol tokens (which must state the type explicitly).
 */
export type TokenValue<K> = K extends Type<infer T> ? T : K extends InjectionToken<infer T> ? T : unknown;

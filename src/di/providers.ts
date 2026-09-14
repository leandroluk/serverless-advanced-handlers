import type {Token, Type} from '#/di/tokens';

/**
 * Lifetime of a provider instance.
 */
export enum Scope {
  /** Singleton per Lambda, created at top level (cold start). */
  DEFAULT = 'default',
  /** New instance per invocation. */
  REQUEST = 'request',
}

type UseKey = 'useClass' | 'useValue' | 'useFactory' | 'useExisting' | 'inject';

/** Forbids every provider key except `K`, making the provider shapes mutually exclusive. */
type Forbid<K extends UseKey> = {[P in Exclude<UseKey, K>]?: never};

/** `{provide, useClass}`: instantiates `useClass` for the token. */
export type ClassProvider<T = unknown> = {
  provide: Token<T>;
  useClass: Type<T>;
  scope?: Scope;
} & Forbid<'useClass'>;

/** `{provide, useValue}`: binds a ready-made value to the token. */
export type ValueProvider<T = unknown> = {
  provide: Token<T>;
  useValue: T;
} & Forbid<'useValue'>;

/**
 * `{provide, useFactory, inject?}`: the (sync or async) factory result is bound to the token.
 * Each `inject` entry is a token, or `{token, optional: true}` for an optional dependency.
 */
export type FactoryProvider<T = unknown> = {
  provide: Token<T>;
  useFactory: (...deps: never[]) => T | Promise<T>;
  inject?: readonly (Token | {token: Token; optional: true})[];
  scope?: Scope;
} & Forbid<'useFactory' | 'inject'>;

/** `{provide, useExisting}`: aliases the token to another token. */
export type ExistingProvider<T = unknown> = {
  provide: Token<T>;
  useExisting: Token<T>;
} & Forbid<'useExisting'>;

/** Every accepted provider shape: a class or one of the mutually exclusive object forms. */
export type Provider<T = unknown> =
  | Type<T>
  | ClassProvider<T>
  | ValueProvider<T>
  | FactoryProvider<T>
  | ExistingProvider<T>;

/** Metadata of a module (`@Module`). */
export interface ModuleMetadata {
  imports?: readonly (Type | DynamicModule)[];
  controllers?: readonly Type[];
  providers?: readonly Provider[];
  exports?: readonly (Token | DynamicModule)[];
}

/** Module configured at build time, returned by a static method of the module class. */
export interface DynamicModule extends ModuleMetadata {
  module: Type;
  global?: boolean;
}

/** Hook awaited during cold start, after the module's providers are created. */
export interface OnModuleInit {
  onModuleInit(): void | Promise<void>;
}

/** Best-effort hook invoked when the module is torn down. */
export interface OnModuleDestroy {
  onModuleDestroy(): void | Promise<void>;
}

import {classOrMethodDecorator, type DualClassOrMethodDecorator} from '#/decorators/dual';
import {getReflectMetadata, type ReflectTarget} from '#/pipeline/metadata-registry';

export type {ReflectTarget} from '#/pipeline/metadata-registry';

/**
 * Typed metadata decorator created by `Reflector.createDecorator<T>()` (REQ-063).
 *
 * It is a no-op at runtime: the compiler reads the statically analyzable `value` and writes it to the generated handler
 * under `key`.
 */
export interface ReflectableDecorator<T> {
  (value: T): DualClassOrMethodDecorator;
  /** Unique metadata key of this decorator. */
  readonly key: symbol;
}

type MetadataKey = string | symbol;

/** Supertype of every `ReflectableDecorator<T>`, whatever its `T`. */
type AnyReflectableDecorator = ((value: never) => DualClassOrMethodDecorator) & {readonly key: symbol};

const keyOf = (decoratorOrKey: AnyReflectableDecorator | MetadataKey): MetadataKey =>
  typeof decoratorOrKey === 'function' ? decoratorOrKey.key : decoratorOrKey;

const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

const isObject = (value: unknown): value is Record<PropertyKey, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Reads custom metadata of controllers and handlers (REQ-063, NestJS parity).
 *
 * @example
 * const Roles = Reflector.createDecorator<string[]>();
 *
 * class RolesGuard implements CanActivate {
 *   constructor(private readonly reflector: Reflector) {}
 *
 *   canActivate(context: ExecutionContext): boolean {
 *     const roles = this.reflector.getAllAndOverride(Roles, [context.getHandler(), context.getClass()]);
 *     return roles === undefined || roles.includes('admin');
 *   }
 * }
 */
export class Reflector {
  /**
   * Creates a typed metadata decorator with a unique `symbol` key. `options.key` only names the symbol (its
   * description): two decorators created with the same `options.key` still have distinct keys.
   */
  static createDecorator<T>(options?: {key?: string}): ReflectableDecorator<T> {
    const key = Symbol(options?.key ?? 'ReflectableDecorator');
    const decorator = (): DualClassOrMethodDecorator => classOrMethodDecorator();
    return Object.freeze(Object.assign(decorator, {key}));
  }

  /** Reads the metadata of `decorator` (typed by it) or of a string/symbol `key` on `target`. */
  get<T>(decorator: ReflectableDecorator<T>, target: ReflectTarget): T | undefined;
  get<T = unknown>(key: MetadataKey, target: ReflectTarget): T | undefined;
  get(decoratorOrKey: AnyReflectableDecorator | MetadataKey, target: ReflectTarget): unknown {
    return getReflectMetadata(target, keyOf(decoratorOrKey));
  }

  /**
   * Returns the first value different from `undefined`, in the order of `targets`. Pass the handler before the class so
   * that method metadata overrides controller metadata.
   */
  getAllAndOverride<T>(
    decoratorOrKey: ReflectableDecorator<T> | MetadataKey,
    targets: readonly ReflectTarget[]
  ): T | undefined {
    const key = keyOf(decoratorOrKey);
    for (const target of targets) {
      const value = getReflectMetadata(target, key);
      if (value !== undefined) {
        return value as T;
      }
    }
    return undefined;
  }

  /**
   * Merges the values of all `targets`, in their order, ignoring `undefined`:
   * - no value: `[]`;
   * - all values are arrays: their concatenation;
   * - all values are objects (non-null, non-array): `[merged]`, a shallow merge where later targets override earlier
   *   ones;
   * - otherwise: the list of values.
   *
   * Stored values are never mutated. An object-valued `ReflectableDecorator` is passed by its `key`.
   */
  getAllAndMerge<T>(decoratorOrKey: ReflectableDecorator<T[]> | MetadataKey, targets: readonly ReflectTarget[]): T[] {
    const key = keyOf(decoratorOrKey);
    const values = targets.map(target => getReflectMetadata(target, key)).filter(value => value !== undefined);

    if (values.every(isArray)) {
      return values.flat() as T[];
    }
    if (values.every(isObject)) {
      return [values.reduce<Record<PropertyKey, unknown>>((merged, value) => ({...merged, ...value}), {})] as T[];
    }
    return values as T[];
  }
}

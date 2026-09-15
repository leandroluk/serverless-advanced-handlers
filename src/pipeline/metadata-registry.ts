import type {Type} from '#/di/tokens';

/** Target that carries custom metadata: a controller class or a handler function (REQ-063). */
export type ReflectTarget = Type | ((...args: never[]) => unknown);

/**
 * Metadata registry read by `Reflector` (REQ-063).
 *
 * Decorators are no-ops and are stripped from the bundles, so the metadata is written by the code generated at build
 * time (through `defineReflectMetadata`, exposed by `/runtime`), indexed by the references returned by
 * `ExecutionContext.getClass()` and `getHandler()`. A `WeakMap` keeps the targets collectable.
 */
const registry = new WeakMap<ReflectTarget, Map<string | symbol, unknown>>();

/**
 * Stores `value` under `key` for `target`, replacing any previous value of the same key.
 *
 * Internal API for generated handlers; application code declares metadata with `SetMetadata` or
 * `Reflector.createDecorator` (whose key is `decorator.key`).
 */
export function defineReflectMetadata(target: ReflectTarget, key: string | symbol, value: unknown): void {
  let metadata = registry.get(target);
  if (metadata === undefined) {
    metadata = new Map();
    registry.set(target, metadata);
  }
  metadata.set(key, value);
}

/** Reads the value stored under `key` for `target`, or `undefined` when there is none. */
export function getReflectMetadata(target: ReflectTarget, key: string | symbol): unknown {
  return registry.get(target)?.get(key);
}

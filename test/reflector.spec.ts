import {describe, expect, it} from 'vitest';
import {Catch, SetMetadata, UseFilters, UseGuards, UseInterceptors} from '#/decorators/pipeline';
import type {ArgumentsHost, CanActivate, ExceptionFilter, Interceptor} from '#/pipeline/contracts';
import {getReflectMetadata} from '#/pipeline/metadata-registry';
import {Reflector} from '#/pipeline/reflector';
import * as root from '#/index';
import * as runtime from '#/runtime/index';

const {defineReflectMetadata} = runtime;

class AllowGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

class PassInterceptor implements Interceptor {
  intercept(_context: never, next: {handle(): Promise<unknown>}): Promise<unknown> {
    return next.handle();
  }
}

class NoopFilter implements ExceptionFilter {
  catch(_exception: unknown, _host: ArgumentsHost): void {}
}

/** Fresh controller class and handler for each test, so the registry never leaks between tests. */
const fixture = () => {
  class UsersController {
    findAll(): string[] {
      return [];
    }

    create(): void {}
  }

  return {
    controller: UsersController,
    findAll: UsersController.prototype.findAll,
    create: UsersController.prototype.create,
  };
};

/** Own property descriptors, in key order. */
const descriptorsOf = (target: object) =>
  Reflect.ownKeys(target).map(key => [key, Object.getOwnPropertyDescriptor(target, key)] as const);

describe('pipeline decorators (REQ-060, REQ-063, REQ-066)', () => {
  const decorators = {
    UseGuards: UseGuards(AllowGuard),
    UseInterceptors: UseInterceptors(PassInterceptor),
    UseFilters: UseFilters(NoopFilter),
    SetMetadata: SetMetadata('isPublic', true),
    'Reflector.createDecorator': Reflector.createDecorator<string[]>()(['admin']),
  };

  it.each(Object.entries(decorators))('%s returns a no-op for classes and methods', (_name, decorator) => {
    const {controller} = fixture();
    const classBefore = descriptorsOf(controller);
    const prototypeBefore = descriptorsOf(controller.prototype);
    const descriptor = Object.getOwnPropertyDescriptor(controller.prototype, 'findAll')!;

    expect(decorator(controller)).toBeUndefined();
    expect(decorator(controller.prototype, 'findAll', descriptor)).toBeUndefined();
    expect(descriptorsOf(controller)).toStrictEqual(classBefore);
    expect(descriptorsOf(controller.prototype)).toStrictEqual(prototypeBefore);
    expect(Object.getOwnPropertyDescriptor(controller.prototype, 'findAll')).toStrictEqual(descriptor);
  });

  it('Catch returns a no-op class decorator, with or without exception types', () => {
    const {controller} = fixture();
    const before = descriptorsOf(controller);

    expect(Catch()(controller)).toBeUndefined();
    expect(Catch(TypeError, RangeError)(controller)).toBeUndefined();
    expect(descriptorsOf(controller)).toStrictEqual(before);
  });

  it('decorators applied with the @ syntax leave the class and the registry untouched', () => {
    const Roles = Reflector.createDecorator<string[]>();

    @UseGuards(AllowGuard)
    @UseInterceptors(PassInterceptor)
    @UseFilters(NoopFilter)
    @SetMetadata('isPublic', false)
    @Roles(['user'])
    class DecoratedController {
      @UseGuards(AllowGuard)
      @SetMetadata('isPublic', true)
      @Roles(['admin'])
      findAll(): string[] {
        return ['a'];
      }
    }

    @Catch(TypeError)
    class TypeErrorFilter extends NoopFilter {}

    const reflector = new Reflector();

    expect(new DecoratedController().findAll()).toEqual(['a']);
    expect(new TypeErrorFilter()).toBeInstanceOf(NoopFilter);
    expect(reflector.get(Roles, DecoratedController)).toBeUndefined();
    expect(reflector.get('isPublic', DecoratedController.prototype.findAll)).toBeUndefined();
  });
});

describe('metadata registry', () => {
  it('stores values per target and key, replacing previous values of the same key', () => {
    const {controller, findAll} = fixture();
    const key = Symbol('roles');

    defineReflectMetadata(controller, 'isPublic', true);
    defineReflectMetadata(controller, key, ['user']);
    defineReflectMetadata(findAll, 'isPublic', false);
    defineReflectMetadata(findAll, 'isPublic', 'replaced');

    expect(getReflectMetadata(controller, 'isPublic')).toBe(true);
    expect(getReflectMetadata(controller, key)).toEqual(['user']);
    expect(getReflectMetadata(findAll, 'isPublic')).toBe('replaced');
    expect(getReflectMetadata(findAll, key)).toBeUndefined();
    expect(getReflectMetadata(fixture().controller, 'isPublic')).toBeUndefined();
  });

  it('is exposed by /runtime and not by the root entry', () => {
    expect(runtime.defineReflectMetadata).toBeTypeOf('function');
    expect(root).not.toHaveProperty('defineReflectMetadata');
    expect(root).not.toHaveProperty('getReflectMetadata');
    expect(runtime).not.toHaveProperty('getReflectMetadata');
  });
});

describe('Reflector.createDecorator', () => {
  it('creates decorators with distinct symbol keys', () => {
    const Roles = Reflector.createDecorator<string[]>();
    const Permissions = Reflector.createDecorator<string[]>();
    const NamedA = Reflector.createDecorator<string>({key: 'named'});
    const NamedB = Reflector.createDecorator<string>({key: 'named'});

    expect(Roles.key).toBeTypeOf('symbol');
    expect(new Set([Roles.key, Permissions.key, NamedA.key, NamedB.key]).size).toBe(4);
    expect(NamedA.key.description).toBe('named');
    expect(NamedB.key.description).toBe('named');
    expect(Roles).toBeTypeOf('function');
  });

  it('keeps the key read-only', () => {
    const Roles = Reflector.createDecorator<string[]>();
    const key = Roles.key;

    expect(() => Object.assign(Roles, {key: Symbol('other')})).toThrow(TypeError);
    expect(Roles.key).toBe(key);
  });
});

describe('Reflector.get', () => {
  it('reads by string key, symbol key and decorator', () => {
    const {controller, findAll} = fixture();
    const reflector = new Reflector();
    const symbolKey = Symbol('feature');
    const Roles = Reflector.createDecorator<string[]>({key: 'roles'});

    defineReflectMetadata(controller, 'isPublic', true);
    defineReflectMetadata(controller, symbolKey, 'beta');
    defineReflectMetadata(findAll, Roles.key, ['admin']);

    expect(reflector.get('isPublic', controller)).toBe(true);
    expect(reflector.get(symbolKey, controller)).toBe('beta');
    expect(reflector.get(Roles, findAll)).toEqual(['admin']);
    expect(reflector.get(Roles.key, findAll)).toEqual(['admin']);
  });

  it('does not confuse a decorator with a string key equal to its description', () => {
    const {findAll} = fixture();
    const reflector = new Reflector();
    const Roles = Reflector.createDecorator<string[]>({key: 'roles'});

    defineReflectMetadata(findAll, 'roles', ['from-string']);

    expect(reflector.get(Roles, findAll)).toBeUndefined();
    expect(reflector.get('roles', findAll)).toEqual(['from-string']);
  });

  it('isolates targets and decorators', () => {
    const users = fixture();
    const orders = fixture();
    const reflector = new Reflector();
    const Roles = Reflector.createDecorator<string[]>();
    const Permissions = Reflector.createDecorator<string[]>();

    defineReflectMetadata(users.controller, Roles.key, ['user']);
    defineReflectMetadata(users.findAll, Roles.key, ['admin']);

    expect(reflector.get(Roles, orders.controller)).toBeUndefined();
    expect(reflector.get(Roles, orders.findAll)).toBeUndefined();
    expect(reflector.get(Roles, users.create)).toBeUndefined();
    expect(reflector.get(Permissions, users.controller)).toBeUndefined();
    expect(reflector.get(Roles, users.controller)).toEqual(['user']);
  });
});

describe('Reflector.getAllAndOverride', () => {
  it('handler metadata overrides class metadata', () => {
    const {controller, findAll} = fixture();
    const reflector = new Reflector();
    const Roles = Reflector.createDecorator<string[]>();

    defineReflectMetadata(controller, Roles.key, ['user']);
    defineReflectMetadata(findAll, Roles.key, ['admin']);

    expect(reflector.getAllAndOverride(Roles, [findAll, controller])).toEqual(['admin']);
    expect(reflector.getAllAndOverride(Roles, [controller, findAll])).toEqual(['user']);
  });

  it('falls back to the class and returns undefined when no target has the key', () => {
    const {controller, findAll, create} = fixture();
    const reflector = new Reflector();

    defineReflectMetadata(controller, 'isPublic', true);

    expect(reflector.getAllAndOverride('isPublic', [findAll, controller])).toBe(true);
    expect(reflector.getAllAndOverride('missing', [findAll, controller])).toBeUndefined();
    expect(reflector.getAllAndOverride('isPublic', [])).toBeUndefined();
    expect(reflector.getAllAndOverride('isPublic', [create])).toBeUndefined();
  });

  it('keeps falsy values other than undefined', () => {
    const {controller, findAll} = fixture();
    const reflector = new Reflector();

    defineReflectMetadata(controller, 'isPublic', true);
    defineReflectMetadata(findAll, 'isPublic', false);
    defineReflectMetadata(findAll, 'limit', 0);
    defineReflectMetadata(controller, 'limit', 10);
    defineReflectMetadata(findAll, 'nullable', null);
    defineReflectMetadata(controller, 'nullable', 'class');

    expect(reflector.getAllAndOverride('isPublic', [findAll, controller])).toBe(false);
    expect(reflector.getAllAndOverride('limit', [findAll, controller])).toBe(0);
    expect(reflector.getAllAndOverride('nullable', [findAll, controller])).toBeNull();
  });
});

describe('Reflector.getAllAndMerge', () => {
  it('concatenates arrays in target order', () => {
    const {controller, findAll, create} = fixture();
    const reflector = new Reflector();
    const Roles = Reflector.createDecorator<string[]>();

    defineReflectMetadata(controller, Roles.key, ['user', 'guest']);
    defineReflectMetadata(findAll, Roles.key, ['admin']);

    expect(reflector.getAllAndMerge(Roles, [findAll, controller])).toEqual(['admin', 'user', 'guest']);
    expect(reflector.getAllAndMerge(Roles, [controller, create, findAll])).toEqual(['user', 'guest', 'admin']);
  });

  it('shallow-merges objects into a single-element array, later targets overriding earlier ones', () => {
    const {controller, findAll} = fixture();
    const reflector = new Reflector();
    const nested = {deep: 1};

    defineReflectMetadata(controller, 'cache', {ttl: 60, scope: 'class', nested});
    defineReflectMetadata(findAll, 'cache', {ttl: 5});

    expect(reflector.getAllAndMerge('cache', [controller, findAll])).toEqual([{ttl: 5, scope: 'class', nested}]);
    expect(reflector.getAllAndMerge('cache', [findAll, controller])).toEqual([{ttl: 60, scope: 'class', nested}]);
    expect(reflector.getAllAndMerge<{nested: object}>('cache', [controller])[0]?.nested).toBe(nested);
  });

  it('returns the list of primitive or mixed values in target order', () => {
    const {controller, findAll, create} = fixture();
    const reflector = new Reflector();

    defineReflectMetadata(controller, 'version', 1);
    defineReflectMetadata(findAll, 'version', 2);
    defineReflectMetadata(controller, 'mixed', ['a']);
    defineReflectMetadata(findAll, 'mixed', 'b');
    defineReflectMetadata(create, 'mixed', {c: true});
    defineReflectMetadata(controller, 'nulls', null);
    defineReflectMetadata(findAll, 'nulls', {a: 1});

    expect(reflector.getAllAndMerge('version', [findAll, controller])).toEqual([2, 1]);
    expect(reflector.getAllAndMerge('mixed', [controller, findAll, create])).toEqual([['a'], 'b', {c: true}]);
    expect(reflector.getAllAndMerge('nulls', [controller, findAll])).toEqual([null, {a: 1}]);
  });

  it('ignores undefined values and returns [] when there is nothing to merge', () => {
    const {controller, findAll, create} = fixture();
    const reflector = new Reflector();

    defineReflectMetadata(controller, 'tags', ['a']);
    defineReflectMetadata(findAll, 'tags', undefined);
    defineReflectMetadata(controller, 'version', 1);

    expect(reflector.getAllAndMerge('tags', [findAll, controller, create])).toEqual(['a']);
    expect(reflector.getAllAndMerge('version', [findAll, controller])).toEqual([1]);
    expect(reflector.getAllAndMerge('missing', [findAll, controller])).toEqual([]);
    expect(reflector.getAllAndMerge('tags', [])).toEqual([]);
  });

  it('never mutates the stored values', () => {
    const {controller, findAll} = fixture();
    const reflector = new Reflector();
    const classRoles = ['user'];
    const handlerRoles = ['admin'];
    const classCache = {ttl: 60};

    defineReflectMetadata(controller, 'roles', classRoles);
    defineReflectMetadata(findAll, 'roles', handlerRoles);
    defineReflectMetadata(controller, 'cache', classCache);

    const roles = reflector.getAllAndMerge<string>('roles', [controller, findAll]);
    roles.push('mutated');
    const [cache] = reflector.getAllAndMerge<{ttl: number}>('cache', [controller]);
    cache!.ttl = 0;
    const [single] = reflector.getAllAndMerge<string>('roles', [controller]).splice(0);

    expect(single).toBe('user');
    expect(classRoles).toEqual(['user']);
    expect(handlerRoles).toEqual(['admin']);
    expect(classCache).toEqual({ttl: 60});
    expect(reflector.getAllAndMerge('roles', [controller])).not.toBe(classRoles);
  });
});

describe('root entry', () => {
  it('exports the pipeline decorators and Reflector', () => {
    expect(root.UseGuards).toBe(UseGuards);
    expect(root.UseInterceptors).toBe(UseInterceptors);
    expect(root.UseFilters).toBe(UseFilters);
    expect(root.Catch).toBe(Catch);
    expect(root.SetMetadata).toBe(SetMetadata);
    expect(root.Reflector).toBe(Reflector);
  });
});

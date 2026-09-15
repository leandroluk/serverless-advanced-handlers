import {describe, expectTypeOf, it} from 'vitest';
import {Catch, SetMetadata, UseFilters, UseGuards, UseInterceptors} from '#/decorators/pipeline';
import type {DualClassDecorator, DualClassOrMethodDecorator} from '#/decorators/dual';
import type {
  ArgumentsHost,
  CallHandler,
  CanActivate,
  ExceptionFilter,
  ExecutionContext,
  Interceptor,
} from '#/pipeline/contracts';
import {Reflector, type ReflectableDecorator, type ReflectTarget} from '#/pipeline/reflector';
import type {Type} from '#/di/tokens';
import * as root from '#/index';
import * as runtime from '#/runtime/index';

class DomainError extends Error {}

class RolesGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}

class ApiKeyGuard implements CanActivate {
  async canActivate(_context: ExecutionContext): Promise<boolean> {
    return true;
  }
}

class LoggingInterceptor implements Interceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Promise<unknown> {
    return next.handle();
  }
}

class WrapInterceptor implements Interceptor<string[], {data: string[]}> {
  async intercept(_context: ExecutionContext, next: CallHandler<string[]>): Promise<{data: string[]}> {
    return {data: await next.handle()};
  }
}

class DomainErrorFilter implements ExceptionFilter<DomainError> {
  catch(exception: DomainError, _host: ArgumentsHost): string {
    return exception.message;
  }
}

class AllErrorsFilter implements ExceptionFilter {
  async catch(_exception: unknown, _host: ArgumentsHost): Promise<void> {}
}

/** Class that implements none of the pipeline contracts. */
class PlainService {
  run(): void {}
}

abstract class AbstractGuard implements CanActivate {
  abstract canActivate(context: ExecutionContext): boolean;
}

const Roles = Reflector.createDecorator<string[]>();
const Cache = Reflector.createDecorator<{ttl: number}>({key: 'cache'});

describe('UseGuards, UseInterceptors and UseFilters (REQ-060)', () => {
  it('return a dual class-or-method decorator', () => {
    expectTypeOf(UseGuards(RolesGuard)).toEqualTypeOf<DualClassOrMethodDecorator>();
    expectTypeOf(UseInterceptors(LoggingInterceptor)).toEqualTypeOf<DualClassOrMethodDecorator>();
    expectTypeOf(UseFilters(DomainErrorFilter)).toEqualTypeOf<DualClassOrMethodDecorator>();
    expectTypeOf(UseGuards).parameters.toEqualTypeOf<Type<CanActivate>[]>();
    expectTypeOf(UseInterceptors).parameters.toEqualTypeOf<Type<Interceptor>[]>();
    expectTypeOf(UseFilters).parameters.toEqualTypeOf<Type<ExceptionFilter>[]>();
  });

  it('accept classes that implement the contracts, including several and abstract ones', () => {
    expectTypeOf(UseGuards()).toEqualTypeOf<DualClassOrMethodDecorator>();
    expectTypeOf(UseGuards(RolesGuard, ApiKeyGuard, AbstractGuard)).toEqualTypeOf<DualClassOrMethodDecorator>();
    expectTypeOf(UseInterceptors(LoggingInterceptor, WrapInterceptor)).toEqualTypeOf<DualClassOrMethodDecorator>();
    expectTypeOf(UseFilters(DomainErrorFilter, AllErrorsFilter)).toEqualTypeOf<DualClassOrMethodDecorator>();
  });

  it('reject instances (Decision Log 6)', () => {
    // @ts-expect-error guards are referenced by class, not by instance
    expectTypeOf(UseGuards(new RolesGuard())).toEqualTypeOf<DualClassOrMethodDecorator>();
    // @ts-expect-error interceptors are referenced by class, not by instance
    expectTypeOf(UseInterceptors(new LoggingInterceptor())).toEqualTypeOf<DualClassOrMethodDecorator>();
    // @ts-expect-error filters are referenced by class, not by instance
    expectTypeOf(UseFilters(new DomainErrorFilter())).toEqualTypeOf<DualClassOrMethodDecorator>();
    // @ts-expect-error a plain object is not a class
    expectTypeOf(UseGuards({canActivate: (): boolean => true})).toEqualTypeOf<DualClassOrMethodDecorator>();
  });

  it('reject classes that do not implement the contract', () => {
    // @ts-expect-error PlainService does not implement CanActivate
    expectTypeOf(UseGuards(PlainService)).toEqualTypeOf<DualClassOrMethodDecorator>();
    // @ts-expect-error an interceptor is not a guard
    expectTypeOf(UseGuards(RolesGuard, LoggingInterceptor)).toEqualTypeOf<DualClassOrMethodDecorator>();
    // @ts-expect-error a guard is not an interceptor
    expectTypeOf(UseInterceptors(RolesGuard)).toEqualTypeOf<DualClassOrMethodDecorator>();
    // @ts-expect-error a guard is not an exception filter
    expectTypeOf(UseFilters(RolesGuard)).toEqualTypeOf<DualClassOrMethodDecorator>();
    // @ts-expect-error strings are not classes
    expectTypeOf(UseFilters('DomainErrorFilter')).toEqualTypeOf<DualClassOrMethodDecorator>();
  });

  it('apply to controllers and handlers in mode B', () => {
    @UseGuards(RolesGuard)
    @UseInterceptors(LoggingInterceptor)
    @UseFilters(AllErrorsFilter)
    class UsersController {
      @UseGuards(ApiKeyGuard)
      @UseInterceptors(WrapInterceptor)
      @UseFilters(DomainErrorFilter)
      findAll(): string[] {
        return [];
      }

      @UseGuards(RolesGuard)
      static health(this: typeof UsersController): string {
        return this.name;
      }
    }

    expectTypeOf(new UsersController().findAll()).toEqualTypeOf<string[]>();
  });
});

describe('Catch (REQ-066)', () => {
  it('accepts zero or more error types and returns a class decorator', () => {
    expectTypeOf(Catch()).toEqualTypeOf<DualClassDecorator>();
    expectTypeOf(Catch(DomainError, TypeError, Error)).toEqualTypeOf<DualClassDecorator>();
    expectTypeOf(Catch).parameters.toEqualTypeOf<Type<Error>[]>();

    @Catch(DomainError)
    class DomainFilter implements ExceptionFilter<DomainError> {
      catch(exception: DomainError): string {
        return exception.message;
      }
    }

    @Catch()
    class CatchAllFilter implements ExceptionFilter {
      catch(): void {}
    }

    expectTypeOf(new DomainFilter()).toExtend<ExceptionFilter<DomainError>>();
    expectTypeOf(new CatchAllFilter()).toExtend<ExceptionFilter>();
  });

  it('rejects instances, non-error classes and methods', () => {
    // @ts-expect-error exception types are classes, not instances
    Catch(new DomainError());
    // @ts-expect-error PlainService is not an Error
    Catch(PlainService);

    class Filter implements ExceptionFilter {
      // @ts-expect-error Catch applies only to classes
      @Catch(DomainError)
      catch(): void {}
    }

    expectTypeOf(Filter).toBeConstructibleWith();
  });
});

describe('SetMetadata (REQ-063)', () => {
  it('accepts string and symbol keys with any value and returns a class-or-method decorator', () => {
    const key = Symbol('feature');

    expectTypeOf(SetMetadata('isPublic', true)).toEqualTypeOf<DualClassOrMethodDecorator>();
    expectTypeOf(SetMetadata(key, {ttl: 60})).toEqualTypeOf<DualClassOrMethodDecorator>();
    SetMetadata<string[]>('roles', ['admin']);

    // @ts-expect-error the value must match the explicit V
    SetMetadata<string[]>('roles', 'admin');
    // @ts-expect-error keys are strings or symbols
    SetMetadata(1, true);

    @SetMetadata('isPublic', false)
    class Controller {
      @SetMetadata(key, true)
      handler(): void {}
    }

    expectTypeOf(Controller).toBeConstructibleWith();
  });
});

describe('ReflectableDecorator and Reflector.createDecorator (REQ-063)', () => {
  it('creates a callable decorator typed by T with a readonly symbol key', () => {
    expectTypeOf(Roles).toEqualTypeOf<ReflectableDecorator<string[]>>();
    expectTypeOf(Roles(['admin'])).toEqualTypeOf<DualClassOrMethodDecorator>();
    expectTypeOf(Roles.key).toEqualTypeOf<symbol>();
    expectTypeOf(Reflector.createDecorator<number>({key: 'limit'})).toEqualTypeOf<ReflectableDecorator<number>>();
    expectTypeOf(Reflector.createDecorator).parameters.toEqualTypeOf<[options?: {key?: string}]>();

    // @ts-expect-error the value must be a string[]
    Roles('admin');
    // @ts-expect-error the key is readonly
    Roles.key = Symbol('other');
    // @ts-expect-error options.key is a string
    Reflector.createDecorator<string>({key: Symbol('x')});

    @Roles(['user'])
    @Cache({ttl: 60})
    class Controller {
      @Roles(['admin'])
      // @ts-expect-error the value must be {ttl: number}
      @Cache({ttl: '5'})
      handler(): void {}
    }

    expectTypeOf(Controller).toBeConstructibleWith();
  });
});

describe('Reflector reads (REQ-063)', () => {
  class UsersController {
    findAll(): string[] {
      return [];
    }
  }

  const reflector = new Reflector();
  const handler = UsersController.prototype.findAll;

  it('accepts classes and handler functions as targets', () => {
    expectTypeOf(UsersController).toExtend<ReflectTarget>();
    expectTypeOf(handler).toExtend<ReflectTarget>();
    expectTypeOf<ReflectTarget>().toEqualTypeOf<Type | ((...args: never[]) => unknown)>();

    // @ts-expect-error an instance is not a target
    reflector.get(Roles, new UsersController());
    // @ts-expect-error a plain object is not a target
    reflector.get('roles', {});
  });

  it('get infers T from the decorator and takes an explicit T for keys', () => {
    expectTypeOf(reflector.get(Roles, handler)).toEqualTypeOf<string[] | undefined>();
    expectTypeOf(reflector.get(Cache, UsersController)).toEqualTypeOf<{ttl: number} | undefined>();
    expectTypeOf(reflector.get('isPublic', handler)).toEqualTypeOf<unknown>();
    expectTypeOf(reflector.get<boolean>('isPublic', handler)).toEqualTypeOf<boolean | undefined>();
    expectTypeOf(reflector.get<boolean>(Symbol('isPublic'), UsersController)).toEqualTypeOf<boolean | undefined>();

    // @ts-expect-error T of a decorator is inferred, not overridable with another type
    reflector.get<number>(Roles, handler);
    // @ts-expect-error keys are strings, symbols or decorators
    reflector.get(1, handler);
  });

  it('getAllAndOverride returns T | undefined', () => {
    expectTypeOf(reflector.getAllAndOverride(Roles, [handler, UsersController])).toEqualTypeOf<string[] | undefined>();
    expectTypeOf(reflector.getAllAndOverride<boolean>('isPublic', [handler])).toEqualTypeOf<boolean | undefined>();
    expectTypeOf(reflector.getAllAndOverride('isPublic', [])).toEqualTypeOf<unknown>();

    const context = {} as ExecutionContext;
    expectTypeOf(reflector.getAllAndOverride(Roles, [context.getHandler(), context.getClass()])).toEqualTypeOf<
      string[] | undefined
    >();

    // @ts-expect-error targets must be classes or functions
    reflector.getAllAndOverride(Roles, [new UsersController()]);
  });

  it('getAllAndMerge returns T[]', () => {
    expectTypeOf(reflector.getAllAndMerge(Roles, [handler, UsersController])).toEqualTypeOf<string[]>();
    expectTypeOf(reflector.getAllAndMerge<number>('versions', [handler])).toEqualTypeOf<number[]>();
    expectTypeOf(reflector.getAllAndMerge<{ttl: number}>(Cache.key, [handler])).toEqualTypeOf<{ttl: number}[]>();
  });
});

describe('entry points', () => {
  it('root exports the decorators, Reflector and the types', () => {
    expectTypeOf(root.UseGuards).toEqualTypeOf<typeof UseGuards>();
    expectTypeOf(root.UseInterceptors).toEqualTypeOf<typeof UseInterceptors>();
    expectTypeOf(root.UseFilters).toEqualTypeOf<typeof UseFilters>();
    expectTypeOf(root.Catch).toEqualTypeOf<typeof Catch>();
    expectTypeOf(root.SetMetadata).toEqualTypeOf<typeof SetMetadata>();
    expectTypeOf(root.Reflector).toEqualTypeOf<typeof Reflector>();
    expectTypeOf<root.ReflectableDecorator<string[]>>().toEqualTypeOf<ReflectableDecorator<string[]>>();
    expectTypeOf<root.ReflectTarget>().toEqualTypeOf<ReflectTarget>();
  });

  it('defineReflectMetadata lives only in /runtime', () => {
    expectTypeOf(runtime.defineReflectMetadata).toEqualTypeOf<
      (target: ReflectTarget, key: string | symbol, value: unknown) => void
    >();

    // @ts-expect-error the registry writer is not part of the root entry
    expectTypeOf(root.defineReflectMetadata).toBeFunction();
  });
});

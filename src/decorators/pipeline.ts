// Pipeline decorators (REQ-060, REQ-063, REQ-066).
//
// Like every framework decorator they are no-ops: the compiler reads the referenced classes and values from the
// source code. Each function is declared as an overload so the public signature keeps named parameters while the
// implementation ignores them.

import {
  classDecorator,
  classOrMethodDecorator,
  type DualClassDecorator,
  type DualClassOrMethodDecorator,
} from '#/decorators/dual';
import type {Type} from '#/di/tokens';
import type {CanActivate, ExceptionFilter, Interceptor} from '#/pipeline/contracts';

/**
 * Applies guards to a controller or handler (REQ-060). Guards are referenced by class only and resolved by the DI;
 * instances are not supported.
 *
 * @example
 * @UseGuards(AuthGuard, RolesGuard)
 * class UsersController {}
 */
export function UseGuards(...guards: Type<CanActivate>[]): DualClassOrMethodDecorator;
export function UseGuards(): DualClassOrMethodDecorator {
  return classOrMethodDecorator();
}

/**
 * Applies interceptors to a controller or handler (REQ-060). Interceptors are referenced by class only.
 *
 * @example
 * @UseInterceptors(LoggingInterceptor)
 * class UsersController {}
 */
export function UseInterceptors(...interceptors: Type<Interceptor>[]): DualClassOrMethodDecorator;
export function UseInterceptors(): DualClassOrMethodDecorator {
  return classOrMethodDecorator();
}

/**
 * Applies exception filters to a controller or handler (REQ-060). Filters are referenced by class only.
 *
 * @example
 * @UseFilters(HttpExceptionFilter)
 * class UsersController {}
 */
export function UseFilters(...filters: Type<ExceptionFilter>[]): DualClassOrMethodDecorator;
export function UseFilters(): DualClassOrMethodDecorator {
  return classOrMethodDecorator();
}

/**
 * Declares which exceptions an `ExceptionFilter` handles (REQ-066); without arguments it handles all of them.
 *
 * @example
 * @Catch(HttpException)
 * class HttpExceptionFilter implements ExceptionFilter<HttpException> {}
 */
export function Catch(...exceptions: Type<Error>[]): DualClassDecorator;
export function Catch(): DualClassDecorator {
  return classDecorator();
}

/**
 * Attaches custom metadata to a controller or handler (REQ-063), read with `Reflector`. The value must be statically
 * analyzable.
 *
 * @example
 * @SetMetadata('isPublic', true)
 * health(): string {}
 */
export function SetMetadata<V>(key: string | symbol, value: V): DualClassOrMethodDecorator;
export function SetMetadata(): DualClassOrMethodDecorator {
  return classOrMethodDecorator();
}

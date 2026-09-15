import {describe, expectTypeOf, it} from 'vitest';
import type {Provider} from '#/di/providers';
import {InjectionToken, type TokenValue, type Type} from '#/di/tokens';
import type {HttpRequest, HttpResponseState, LambdaContext} from '#/http/types';
import type {
  ArgumentsHost,
  CallHandler,
  CanActivate,
  ExceptionFilter,
  ExecutionContext,
  HttpArgumentsHost,
  Interceptor,
} from '#/pipeline/contracts';
import {APP_FILTER, APP_GUARD, APP_INTERCEPTOR} from '#/pipeline/tokens';
import * as root from '#/index';

/** Request shape populated by an authentication guard, read through `getRequest<T>()`. */
interface AuthenticatedRequest extends HttpRequest {
  readonly user?: {readonly id: string; readonly roles: readonly string[]};
}

interface User {
  readonly id: string;
}

class UsersController {
  findAll(): User[] {
    return [];
  }
}

/** Application error used by the filter example (`HttpException` is not available yet). */
class DomainError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/** NestJS-style roles guard. */
class RolesGuard implements CanActivate {
  private readonly requiredRoles: readonly string[] = ['admin'];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const roles = request.user?.roles ?? [];
    return this.requiredRoles.some(role => roles.includes(role));
  }
}

/** Async guard reading the default request and the Lambda context. */
class ApiKeyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const apiKey = context.switchToHttp().getRequest().headers['x-api-key'];
    const remaining = context.getLambdaContext().getRemainingTimeInMillis();
    return apiKey !== undefined && remaining > 0;
  }
}

/** NestJS-style async logging interceptor. */
class LoggingInterceptor implements Interceptor {
  readonly lines: string[] = [];

  async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
    const request = context.switchToHttp().getRequest();
    const started = Date.now();
    const result = await next.handle();
    const target = `${context.getClass().name}.${context.getHandler().name}`;
    this.lines.push(`${request.method} ${request.path} ${target} ${Date.now() - started}ms`);
    return result;
  }
}

/** Interceptor with typed input and output. */
class WrapInterceptor implements Interceptor<User[], {data: User[]}> {
  async intercept(_context: ExecutionContext, next: CallHandler<User[]>): Promise<{data: User[]}> {
    return {data: await next.handle()};
  }
}

/** NestJS-style exception filter writing the mutable response state. */
class DomainErrorFilter implements ExceptionFilter<DomainError> {
  catch(exception: DomainError, host: ArgumentsHost): {message: string} {
    const response = host.switchToHttp().getResponse();
    response.status = exception.status;
    response.headers['content-type'] = 'application/json';
    return {message: exception.message};
  }
}

/** Catch-all async filter. */
class AllErrorsFilter implements ExceptionFilter {
  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const response = host.switchToHttp().getResponse<HttpResponseState>();
    response.status = exception instanceof DomainError ? exception.status : 500;
    response.cookies.push('error=1');
  }
}

const context = {} as ExecutionContext;
const host = {} as ArgumentsHost;

describe('ArgumentsHost', () => {
  it('exposes the transport, arguments, HTTP view and Lambda context', () => {
    expectTypeOf(host.getType()).toEqualTypeOf<'http'>();
    expectTypeOf(host.getArgs()).toEqualTypeOf<unknown[]>();
    expectTypeOf(host.switchToHttp()).toEqualTypeOf<HttpArgumentsHost>();
    expectTypeOf(host.getLambdaContext()).toEqualTypeOf<LambdaContext>();

    // @ts-expect-error the only transport in v1 is 'http'
    const _rpc: 'rpc' = host.getType();
  });

  it('types switchToRpc() and switchToWs() as never', () => {
    expectTypeOf(host.switchToRpc).returns.toBeNever();
    expectTypeOf(host.switchToWs).returns.toBeNever();
    expectTypeOf<ReturnType<ArgumentsHost['switchToRpc']>>().toEqualTypeOf<never>();
    expectTypeOf<ReturnType<ExecutionContext['switchToWs']>>().toEqualTypeOf<never>();
  });
});

describe('HttpArgumentsHost', () => {
  it('defaults to HttpRequest and HttpResponseState', () => {
    const http = context.switchToHttp();

    expectTypeOf(http.getRequest()).toEqualTypeOf<HttpRequest>();
    expectTypeOf(http.getResponse()).toEqualTypeOf<HttpResponseState>();
  });

  it('accepts a custom request and response type', () => {
    const http = context.switchToHttp();

    expectTypeOf(http.getRequest<AuthenticatedRequest>()).toEqualTypeOf<AuthenticatedRequest>();
    expectTypeOf(http.getRequest<AuthenticatedRequest>().user).toEqualTypeOf<
      {readonly id: string; readonly roles: readonly string[]} | undefined
    >();
    expectTypeOf(http.getResponse<{status: number}>()).toEqualTypeOf<{status: number}>();
  });

  it('keeps the response state mutable and typed', () => {
    const response = context.switchToHttp().getResponse();
    response.status = 201;
    response.headers['x-request-id'] = 'abc';
    response.cookies.push('session=1');

    expectTypeOf<(typeof response)['status']>().toEqualTypeOf<number | undefined>();
    expectTypeOf(response.headers).toEqualTypeOf<Record<string, string>>();
    // @ts-expect-error status is a number
    response.status = 'created';
  });
});

describe('ExecutionContext', () => {
  it('extends ArgumentsHost with getClass and getHandler', () => {
    expectTypeOf<ExecutionContext>().toExtend<ArgumentsHost>();
    expectTypeOf<ArgumentsHost>().not.toExtend<ExecutionContext>();
    expectTypeOf(context.getClass()).toEqualTypeOf<Type<unknown>>();
    expectTypeOf(context.getClass<UsersController>()).toEqualTypeOf<Type<UsersController>>();
    expectTypeOf(context.getHandler()).toEqualTypeOf<(...args: never[]) => unknown>();
    expectTypeOf(UsersController).toExtend<ReturnType<typeof context.getClass<UsersController>>>();
    expectTypeOf(UsersController.prototype.findAll).toExtend<ReturnType<ExecutionContext['getHandler']>>();
  });
});

describe('CanActivate', () => {
  it('accepts sync and async NestJS-style guards', () => {
    expectTypeOf<CanActivate['canActivate']>().toEqualTypeOf<
      (context: ExecutionContext) => boolean | Promise<boolean>
    >();
    expectTypeOf(new RolesGuard()).toExtend<CanActivate>();
    expectTypeOf(new ApiKeyGuard()).toExtend<CanActivate>();
    expectTypeOf(RolesGuard).toExtend<Type<CanActivate>>();
  });

  it('rejects guards that do not return boolean | Promise<boolean>', () => {
    // @ts-expect-error canActivate must return boolean | Promise<boolean>
    const stringGuard: CanActivate = {canActivate: (): string => 'yes'};
    // @ts-expect-error canActivate must resolve to a boolean
    const promiseStringGuard: CanActivate = {canActivate: async (): Promise<string> => 'yes'};

    class StringGuard implements CanActivate {
      // @ts-expect-error canActivate must return boolean | Promise<boolean>
      canActivate(): string {
        return 'yes';
      }
    }

    expectTypeOf([stringGuard, promiseStringGuard]).toExtend<CanActivate[]>();
    expectTypeOf(StringGuard).not.toExtend<Type<CanActivate>>();
    expectTypeOf<{handle(): Promise<boolean>}>().not.toExtend<CanActivate>();
  });
});

describe('CallHandler and Interceptor', () => {
  it('handle() returns a Promise (no RxJS)', () => {
    expectTypeOf<CallHandler['handle']>().toEqualTypeOf<() => Promise<unknown>>();
    expectTypeOf<CallHandler<User[]>['handle']>().toEqualTypeOf<() => Promise<User[]>>();

    // @ts-expect-error handle() must return a Promise
    const syncHandler: CallHandler<string> = {handle: (): string => 'x'};

    expectTypeOf(syncHandler).toExtend<CallHandler<string>>();
  });

  it('accepts NestJS-style async interceptors', () => {
    expectTypeOf<Interceptor['intercept']>().toEqualTypeOf<
      (context: ExecutionContext, next: CallHandler<unknown>) => Promise<unknown>
    >();
    expectTypeOf(new LoggingInterceptor()).toExtend<Interceptor>();
    expectTypeOf(new WrapInterceptor()).toExtend<Interceptor<User[], {data: User[]}>>();
    expectTypeOf(new WrapInterceptor()).toExtend<Interceptor>();
    expectTypeOf(LoggingInterceptor).toExtend<Type<Interceptor>>();
  });

  it('rejects synchronous interceptors and mismatched results', () => {
    // @ts-expect-error intercept must return a Promise
    const syncInterceptor: Interceptor = {intercept: (): unknown => undefined};
    const wrongResult: Interceptor<User[], {data: User[]}> = {
      // @ts-expect-error the result must be a Promise<{data: User[]}>
      intercept: async (_context: ExecutionContext, next: CallHandler<User[]>): Promise<User[]> => next.handle(),
    };

    expectTypeOf([syncInterceptor, wrongResult]).toExtend<Interceptor[]>();
  });
});

describe('ExceptionFilter', () => {
  it('accepts NestJS-style sync and async filters', () => {
    expectTypeOf<ExceptionFilter<DomainError>['catch']>().toEqualTypeOf<
      (exception: DomainError, host: ArgumentsHost) => unknown
    >();
    expectTypeOf(new DomainErrorFilter()).toExtend<ExceptionFilter<DomainError>>();
    expectTypeOf(new DomainErrorFilter()).toExtend<ExceptionFilter>();
    expectTypeOf(new AllErrorsFilter()).toExtend<ExceptionFilter>();
    expectTypeOf(DomainErrorFilter).toExtend<Type<ExceptionFilter>>();
  });

  it('rejects filters without a compatible catch', () => {
    // @ts-expect-error host must be an ArgumentsHost
    const wrongHost: ExceptionFilter = {catch: (_exception: unknown, _host: string): void => undefined};
    // @ts-expect-error catch is required
    const withoutCatch: ExceptionFilter = {handle: (): void => undefined};

    expectTypeOf([wrongHost, withoutCatch]).toExtend<ExceptionFilter[]>();
  });
});

describe('APP_* tokens', () => {
  it('are InjectionTokens of the pipeline contracts', () => {
    expectTypeOf(APP_GUARD).toEqualTypeOf<InjectionToken<CanActivate>>();
    expectTypeOf(APP_INTERCEPTOR).toEqualTypeOf<InjectionToken<Interceptor>>();
    expectTypeOf(APP_FILTER).toEqualTypeOf<InjectionToken<ExceptionFilter>>();
    expectTypeOf(APP_GUARD.description).toEqualTypeOf<string>();
  });

  it('TokenValue resolves each contract', () => {
    expectTypeOf<TokenValue<typeof APP_GUARD>>().toEqualTypeOf<CanActivate>();
    expectTypeOf<TokenValue<typeof APP_INTERCEPTOR>>().toEqualTypeOf<Interceptor>();
    expectTypeOf<TokenValue<typeof APP_FILTER>>().toEqualTypeOf<ExceptionFilter>();
    expectTypeOf(APP_GUARD).not.toExtend<InjectionToken<Interceptor>>();
    expectTypeOf(APP_FILTER).not.toExtend<InjectionToken<CanActivate>>();
  });

  it('register global guards, interceptors and filters as providers', () => {
    const providers: Provider[] = [
      {provide: APP_GUARD, useClass: RolesGuard},
      {provide: APP_INTERCEPTOR, useClass: WrapInterceptor},
      {provide: APP_FILTER, useClass: DomainErrorFilter},
    ];
    const guard: Provider<CanActivate> = {provide: APP_GUARD, useClass: ApiKeyGuard};

    // @ts-expect-error an interceptor is not a CanActivate
    const wrongGuard: Provider<CanActivate> = {provide: APP_GUARD, useClass: LoggingInterceptor};

    expectTypeOf([...providers, guard, wrongGuard]).toExtend<Provider[]>();
  });
});

describe('root barrel', () => {
  it('exports the contracts as types and the tokens as values', () => {
    expectTypeOf(root.APP_GUARD).toEqualTypeOf<typeof APP_GUARD>();
    expectTypeOf(root.APP_INTERCEPTOR).toEqualTypeOf<typeof APP_INTERCEPTOR>();
    expectTypeOf(root.APP_FILTER).toEqualTypeOf<typeof APP_FILTER>();
    expectTypeOf<root.ArgumentsHost>().toEqualTypeOf<ArgumentsHost>();
    expectTypeOf<root.HttpArgumentsHost>().toEqualTypeOf<HttpArgumentsHost>();
    expectTypeOf<root.ExecutionContext>().toEqualTypeOf<ExecutionContext>();
    expectTypeOf<root.CanActivate>().toEqualTypeOf<CanActivate>();
    expectTypeOf<root.CallHandler<User>>().toEqualTypeOf<CallHandler<User>>();
    expectTypeOf<root.Interceptor<User, User[]>>().toEqualTypeOf<Interceptor<User, User[]>>();
    expectTypeOf<root.ExceptionFilter<DomainError>>().toEqualTypeOf<ExceptionFilter<DomainError>>();
  });
});

import type {Type} from '#/di/tokens';
import type {HttpRequest, HttpResponseState, LambdaContext} from '#/http/types';

/**
 * Arguments of the current invocation, passed to exception filters (REQ-062, REQ-065).
 *
 * Only the HTTP transport exists in v1: `getType()` is always `'http'`, and `switchToRpc()` and
 * `switchToWs()` throw at runtime.
 */
export interface ArgumentsHost {
  /** Transport of the current invocation. */
  getType(): 'http';
  /** Raw arguments of the invocation. */
  getArgs(): unknown[];
  /** HTTP view of the invocation: normalized request and mutable response state. */
  switchToHttp(): HttpArgumentsHost;
  /** Not supported in v1: throws at runtime. */
  switchToRpc(): never;
  /** Not supported in v1: throws at runtime. */
  switchToWs(): never;
  /** AWS Lambda `Context` of the invocation. */
  getLambdaContext(): LambdaContext;
}

/** HTTP view returned by `ArgumentsHost.switchToHttp()` (REQ-065). */
export interface HttpArgumentsHost {
  /**
   * Normalized request (REQ-045), mutable to attach data such as `user`. Pass `T` to read a request
   * type that extends `HttpRequest`, or augment `HttpRequest` via `declare module`.
   */
  getRequest<T = HttpRequest>(): T;
  /** Mutable response state: status, headers and cookies. */
  getResponse<T = HttpResponseState>(): T;
}

/** Arguments host plus the controller class and handler method being executed (REQ-065). */
export interface ExecutionContext extends ArgumentsHost {
  /** Controller class that owns the handler. */
  getClass<T = unknown>(): Type<T>;
  /** Reference to the handler method (with a stable id generated at build time). */
  getHandler(): (...args: never[]) => unknown;
}

/**
 * Guard: decides whether the request proceeds to the handler (REQ-062).
 *
 * @example
 * class AuthGuard implements CanActivate {
 *   canActivate(context: ExecutionContext): boolean {
 *     return context.switchToHttp().getRequest().headers['authorization'] !== undefined;
 *   }
 * }
 */
export interface CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

/** Continuation of the pipeline given to an interceptor; `handle()` runs the next step (no RxJS). */
export interface CallHandler<T = unknown> {
  handle(): Promise<T>;
}

/**
 * Interceptor: wraps the handler, running logic before and after `next.handle()` (REQ-062).
 *
 * @example
 * class TimingInterceptor implements Interceptor {
 *   async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
 *     const started = Date.now();
 *     const result = await next.handle();
 *     context.switchToHttp().getResponse().headers['x-duration'] = `${Date.now() - started}`;
 *     return result;
 *   }
 * }
 */
export interface Interceptor<T = unknown, R = unknown> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Promise<R>;
}

/** Exception filter: turns an exception thrown by the pipeline into a response (REQ-062). */
export interface ExceptionFilter<E = unknown> {
  catch(exception: E, host: ArgumentsHost): unknown | Promise<unknown>;
}

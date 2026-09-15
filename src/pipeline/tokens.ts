import {InjectionToken} from '#/di/tokens';
import type {CanActivate, ExceptionFilter, Interceptor} from '#/pipeline/contracts';

/**
 * Registers a global guard as a provider (REQ-060).
 *
 * @example
 * providers: [{provide: APP_GUARD, useClass: AuthGuard}]
 */
export const APP_GUARD: InjectionToken<CanActivate> = new InjectionToken<CanActivate>('APP_GUARD');

/**
 * Registers a global interceptor as a provider (REQ-060).
 *
 * @example
 * providers: [{provide: APP_INTERCEPTOR, useClass: LoggingInterceptor}]
 */
export const APP_INTERCEPTOR: InjectionToken<Interceptor> = new InjectionToken<Interceptor>('APP_INTERCEPTOR');

/**
 * Registers a global exception filter as a provider (REQ-060).
 *
 * @example
 * providers: [{provide: APP_FILTER, useClass: HttpExceptionFilter}]
 */
export const APP_FILTER: InjectionToken<ExceptionFilter> = new InjectionToken<ExceptionFilter>('APP_FILTER');

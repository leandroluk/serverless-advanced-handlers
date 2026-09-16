// Tokens compartilhados da aplicação de fixture. Todos usam a API real do pacote (`InjectionToken`,
// `Symbol`, string) — o resolvedor precisa tratar cada forma de token (REQ-033).
import {InjectionToken} from '#/di/tokens';

/** `InjectionToken`: o resolvedor indexa pela identidade da `VariableDeclaration`. */
export const DATABASE_URL = new InjectionToken<string>('DATABASE_URL');

/** Token `Symbol` exportado por um módulo `@Global()`. */
export const TRACE_ID: unique symbol = Symbol('TRACE_ID');

/** Token `Symbol` que nenhum módulo provê: existe só para o caminho `@Optional()`. */
export const FEATURE_FLAGS: unique symbol = Symbol('FEATURE_FLAGS');

/** Token exportado pelo módulo `@Global()`. */
export const AUDIT_SINK = new InjectionToken<string>('AUDIT_SINK');

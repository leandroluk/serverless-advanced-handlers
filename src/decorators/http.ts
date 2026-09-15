// Decorators e marcadores de tipo HTTP (REQ-040..REQ-043, REQ-045, REQ-050, REQ-007).
//
// Todos são no-op em runtime (Decision Log #1): o compilador extrai rotas, status, headers e parâmetros do
// código-fonte. Decorators de parâmetro compartilham o identificador com um marcador de tipo (Decision Log #2),
// de modo que um único import serve aos três modos de decorators: `@HttpBody(Cls) body: Cls` nos modos A e B e
// `body: HttpBody<Cls>` no modo C, em que decorators de parâmetro geram `TS1206`.
import type {AnyAdvancedClass} from '#/class/types';
import {
  classDecorator,
  type DualClassDecorator,
  type DualMethodDecorator,
  methodDecorator,
  parameterDecorator,
} from '#/decorators/dual';
import type {HttpStatus} from '#/http/status';

// `HttpRequest` e `LambdaContext` são declarados junto das suas interfaces/tipos (merge valor + tipo), para manter
// a augmentation de `HttpRequest` no mesmo módulo; aqui apenas reexportados.
export {HttpRequest, LambdaContext} from '#/http/types';

// Controller e rotas

/** Declara um controller HTTP, com prefixo opcional aplicado às rotas dos métodos (REQ-040). */
export function HttpController(_prefix?: string): DualClassDecorator {
  return classDecorator();
}

/** Rota `GET`; `path` usa a sintaxe `/:param` (REQ-041). */
export function HttpGet(_path?: string): DualMethodDecorator {
  return methodDecorator();
}

/** Rota `POST`; `path` usa a sintaxe `/:param` (REQ-041). Status default `201` (REQ-042). */
export function HttpPost(_path?: string): DualMethodDecorator {
  return methodDecorator();
}

/** Rota `PUT`; `path` usa a sintaxe `/:param` (REQ-041). */
export function HttpPut(_path?: string): DualMethodDecorator {
  return methodDecorator();
}

/** Rota `PATCH`; `path` usa a sintaxe `/:param` (REQ-041). */
export function HttpPatch(_path?: string): DualMethodDecorator {
  return methodDecorator();
}

/** Rota `DELETE`; `path` usa a sintaxe `/:param` (REQ-041). */
export function HttpDelete(_path?: string): DualMethodDecorator {
  return methodDecorator();
}

/** Rota `HEAD`; `path` usa a sintaxe `/:param` (REQ-041). */
export function HttpHead(_path?: string): DualMethodDecorator {
  return methodDecorator();
}

/** Rota `OPTIONS`; `path` usa a sintaxe `/:param` (REQ-041). */
export function HttpOptions(_path?: string): DualMethodDecorator {
  return methodDecorator();
}

// Resposta

/** Sobrescreve o status default da rota (REQ-042). */
export function HttpCode(_status: HttpStatus | number): DualMethodDecorator {
  return methodDecorator();
}

/** Define um header estático de resposta (REQ-050). */
export function HttpResponseHeader(_name: string, _value: string): DualMethodDecorator {
  return methodDecorator();
}

// Parâmetros: decorator + marcador de tipo com o mesmo identificador (REQ-043, REQ-007)

/** Injeta o corpo da requisição, validado pela classe `Class()` informada ou pelo tipo anotado (REQ-043). */
export function HttpBody(_cls?: AnyAdvancedClass): ParameterDecorator {
  return parameterDecorator();
}
/** Marcador de tipo equivalente a `@HttpBody()`, obrigatório no modo C (REQ-007). */
export type HttpBody<T> = T;

/** Injeta a query string, validada pela classe `Class()` informada ou pelo tipo anotado (REQ-043). */
export function HttpQuery(_cls?: AnyAdvancedClass): ParameterDecorator {
  return parameterDecorator();
}
/** Marcador de tipo equivalente a `@HttpQuery()`, obrigatório no modo C (REQ-007). */
export type HttpQuery<T> = T;

/** Injeta os parâmetros de rota, validados pela classe `Class()` informada ou pelo tipo anotado (REQ-043). */
export function HttpParams(_cls?: AnyAdvancedClass): ParameterDecorator {
  return parameterDecorator();
}
/** Marcador de tipo equivalente a `@HttpParams()`, obrigatório no modo C (REQ-007). */
export type HttpParams<T> = T;

/** Injeta os headers, validados pela classe `Class()` informada ou pelo tipo anotado (REQ-043). */
export function HttpHeaders(_cls?: AnyAdvancedClass): ParameterDecorator {
  return parameterDecorator();
}
/** Marcador de tipo equivalente a `@HttpHeaders()`, obrigatório no modo C (REQ-007). */
export type HttpHeaders<T> = T;

/** Injeta os cookies, validados pela classe `Class()` informada ou pelo tipo anotado (REQ-043). */
export function HttpCookies(_cls?: AnyAdvancedClass): ParameterDecorator {
  return parameterDecorator();
}
/** Marcador de tipo equivalente a `@HttpCookies()`, obrigatório no modo C (REQ-007). */
export type HttpCookies<T> = T;

/** Injeta o formulário multipart, validado pela classe `Class()` informada ou pelo tipo anotado (REQ-043). */
export function HttpForm(_cls?: AnyAdvancedClass): ParameterDecorator {
  return parameterDecorator();
}
/** Marcador de tipo equivalente a `@HttpForm()`, obrigatório no modo C (REQ-007). */
export type HttpForm<T> = T;

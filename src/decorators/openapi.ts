// Decorators OpenAPI (REQ-070).
//
// Todos são no-op em runtime: o compilador lê os argumentos a partir do código-fonte para gerar a especificação
// (REQ-071..REQ-074). Cada função declara a assinatura pública em uma sobrecarga, e a implementação ignora os
// argumentos.
import type {AnyAdvancedClass} from '#/class/types';
import {classOrMethodDecorator, methodDecorator} from '#/decorators/dual';
import type {DualClassOrMethodDecorator, DualMethodDecorator} from '#/decorators/dual';
import type {HttpStatus} from '#/http/status';

/** Schema de um response: uma classe `Class()` ou `[Cls]` para um array de instâncias dessa classe. */
export type ResponseSchema = AnyAdvancedClass | readonly [AnyAdvancedClass];

/** Opções de `@OpenapiResponse`. */
export interface OpenapiResponseOptions {
  /** Código HTTP do response: membro de `HttpStatus` ou número. */
  status: HttpStatus | number;
  description: string;
  /** Quando nenhum response declara `schema`, ele é inferido do tipo de retorno do método (REQ-073). */
  schema?: ResponseSchema;
}

/** Opções de `@OpenapiOperation`. */
export interface OpenapiOperationOptions {
  summary?: string;
  description?: string;
  /** Default: `<Controller>.<method>` (REQ-072). */
  operationId?: string;
  deprecated?: boolean;
}

/** Tags da operação; em um controller, aplicam-se a todos os seus métodos. */
export function OpenapiTags(...tags: string[]): DualClassOrMethodDecorator;
export function OpenapiTags(): DualClassOrMethodDecorator {
  return classOrMethodDecorator();
}

/** Metadados da operação. */
export function OpenapiOperation(options: OpenapiOperationOptions): DualMethodDecorator;
export function OpenapiOperation(): DualMethodDecorator {
  return methodDecorator();
}

/** Media types aceitos no corpo da requisição. */
export function OpenapiConsumes(...mediaTypes: string[]): DualClassOrMethodDecorator;
export function OpenapiConsumes(): DualClassOrMethodDecorator {
  return classOrMethodDecorator();
}

/** Media types produzidos pelos responses. */
export function OpenapiProduces(...mediaTypes: string[]): DualClassOrMethodDecorator;
export function OpenapiProduces(): DualClassOrMethodDecorator {
  return classOrMethodDecorator();
}

/** Declara um response da operação. */
export function OpenapiResponse(options: OpenapiResponseOptions): DualMethodDecorator;
export function OpenapiResponse(): DualMethodDecorator {
  return methodDecorator();
}

/** Response `200 OK`. */
export function OpenapiOkResponse(options: Omit<OpenapiResponseOptions, 'status'>): DualMethodDecorator;
export function OpenapiOkResponse(): DualMethodDecorator {
  return methodDecorator();
}

/** Response `201 Created`. */
export function OpenapiCreatedResponse(options: Omit<OpenapiResponseOptions, 'status'>): DualMethodDecorator;
export function OpenapiCreatedResponse(): DualMethodDecorator {
  return methodDecorator();
}

/** Response `204 No Content`. */
export function OpenapiNoContentResponse(options: Omit<OpenapiResponseOptions, 'status'>): DualMethodDecorator;
export function OpenapiNoContentResponse(): DualMethodDecorator {
  return methodDecorator();
}

/** Response `400 Bad Request`. */
export function OpenapiBadRequestResponse(options: Omit<OpenapiResponseOptions, 'status'>): DualMethodDecorator;
export function OpenapiBadRequestResponse(): DualMethodDecorator {
  return methodDecorator();
}

/** Response `401 Unauthorized`. */
export function OpenapiUnauthorizedResponse(options: Omit<OpenapiResponseOptions, 'status'>): DualMethodDecorator;
export function OpenapiUnauthorizedResponse(): DualMethodDecorator {
  return methodDecorator();
}

/** Response `403 Forbidden`. */
export function OpenapiForbiddenResponse(options: Omit<OpenapiResponseOptions, 'status'>): DualMethodDecorator;
export function OpenapiForbiddenResponse(): DualMethodDecorator {
  return methodDecorator();
}

/** Response `404 Not Found`. */
export function OpenapiNotFoundResponse(options: Omit<OpenapiResponseOptions, 'status'>): DualMethodDecorator;
export function OpenapiNotFoundResponse(): DualMethodDecorator {
  return methodDecorator();
}

/** Response `409 Conflict`. */
export function OpenapiConflictResponse(options: Omit<OpenapiResponseOptions, 'status'>): DualMethodDecorator;
export function OpenapiConflictResponse(): DualMethodDecorator {
  return methodDecorator();
}

/** Requisito de segurança (nome do security scheme e escopos opcionais). */
export function OpenapiSecurity(name: string, scopes?: string[]): DualClassOrMethodDecorator;
export function OpenapiSecurity(): DualClassOrMethodDecorator {
  return classOrMethodDecorator();
}

/** Remove o controller ou o método da especificação gerada. */
export function OpenapiExclude(): DualClassOrMethodDecorator {
  return classOrMethodDecorator();
}

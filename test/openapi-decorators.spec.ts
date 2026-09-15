// Decorators OpenAPI em runtime (REQ-070): no-op, sem mutação e exportados pelo barrel raiz.
import {describe, expect, it, vi} from 'vitest';

import type {DualClassOrMethodDecorator, DualMethodDecorator} from '#/decorators/dual';
import {
  OpenapiBadRequestResponse,
  OpenapiConflictResponse,
  OpenapiConsumes,
  OpenapiCreatedResponse,
  OpenapiExclude,
  OpenapiForbiddenResponse,
  OpenapiNoContentResponse,
  OpenapiNotFoundResponse,
  OpenapiOkResponse,
  OpenapiOperation,
  OpenapiProduces,
  OpenapiResponse,
  OpenapiSecurity,
  OpenapiTags,
  OpenapiUnauthorizedResponse,
} from '#/decorators/openapi';
import {HttpStatus} from '#/http/status';
import * as root from '#/index';

/** Descriptors próprios de um objeto, na ordem das chaves. */
const descriptorsOf = (target: object) =>
  Reflect.ownKeys(target).map(key => [key, Object.getOwnPropertyDescriptor(target, key)] as const);

const classOrMethod: ReadonlyArray<readonly [string, () => DualClassOrMethodDecorator]> = [
  ['OpenapiTags', () => OpenapiTags('users')],
  ['OpenapiConsumes', () => OpenapiConsumes('application/json')],
  ['OpenapiProduces', () => OpenapiProduces('application/json')],
  ['OpenapiSecurity', () => OpenapiSecurity('bearer', ['users:read'])],
  ['OpenapiExclude', () => OpenapiExclude()],
];

const methodOnly: ReadonlyArray<readonly [string, () => DualMethodDecorator]> = [
  ['OpenapiOperation', () => OpenapiOperation({summary: 'x', operationId: 'users.list'})],
  ['OpenapiResponse', () => OpenapiResponse({status: HttpStatus.OK, description: 'x'})],
  ['OpenapiOkResponse', () => OpenapiOkResponse({description: 'x'})],
  ['OpenapiCreatedResponse', () => OpenapiCreatedResponse({description: 'x'})],
  ['OpenapiNoContentResponse', () => OpenapiNoContentResponse({description: 'x'})],
  ['OpenapiBadRequestResponse', () => OpenapiBadRequestResponse({description: 'x'})],
  ['OpenapiUnauthorizedResponse', () => OpenapiUnauthorizedResponse({description: 'x'})],
  ['OpenapiForbiddenResponse', () => OpenapiForbiddenResponse({description: 'x'})],
  ['OpenapiNotFoundResponse', () => OpenapiNotFoundResponse({description: 'x'})],
  ['OpenapiConflictResponse', () => OpenapiConflictResponse({description: 'x'})],
];

const allDecorators = [...classOrMethod, ...methodOnly];

class Target {
  greet(name: string): string {
    return `olá ${name}`;
  }
}

describe('decorators OpenAPI em runtime', () => {
  it.each(allDecorators)(
    '%s: forma legada não altera classe, protótipo nem descriptor e retorna undefined',
    (_, make) => {
      const classBefore = descriptorsOf(Target);
      const prototypeBefore = descriptorsOf(Target.prototype);
      const descriptor = Object.getOwnPropertyDescriptor(Target.prototype, 'greet')!;
      const descriptorBefore = {...descriptor};

      expect(make()(Target.prototype, 'greet', descriptor)).toBeUndefined();

      expect(descriptorsOf(Target)).toStrictEqual(classBefore);
      expect(descriptorsOf(Target.prototype)).toStrictEqual(prototypeBefore);
      expect(descriptor).toStrictEqual(descriptorBefore);
      expect(new Target().greet('mundo')).toBe('olá mundo');
    }
  );

  it.each(allDecorators)('%s: forma TC39 de método não registra initializers e retorna undefined', (_, make) => {
    const method = Target.prototype.greet;
    const methodBefore = descriptorsOf(method);
    const prototypeBefore = descriptorsOf(Target.prototype);
    const addInitializer = vi.fn();
    const metadata = {};
    const context = Object.freeze({
      kind: 'method',
      name: 'greet',
      static: false,
      private: false,
      access: {has: () => true, get: () => method},
      addInitializer,
      metadata,
    });

    expect(make()(method, context as ClassMethodDecoratorContext)).toBeUndefined();

    expect(addInitializer).not.toHaveBeenCalled();
    expect(Reflect.ownKeys(metadata)).toEqual([]);
    expect(descriptorsOf(method)).toStrictEqual(methodBefore);
    expect(descriptorsOf(Target.prototype)).toStrictEqual(prototypeBefore);
  });

  it.each(classOrMethod)('%s: formas legada e TC39 de classe não alteram a classe e retornam undefined', (_, make) => {
    const classBefore = descriptorsOf(Target);
    const addInitializer = vi.fn();
    const metadata = {};
    const context = Object.freeze({kind: 'class', name: 'Target', addInitializer, metadata});

    expect(make()(Target)).toBeUndefined();
    expect(make()(Target, context as ClassDecoratorContext)).toBeUndefined();

    expect(addInitializer).not.toHaveBeenCalled();
    expect(Reflect.ownKeys(metadata)).toEqual([]);
    expect(descriptorsOf(Target)).toStrictEqual(classBefore);
  });

  it('aplicados com sintaxe de decorator, preservam o controller', () => {
    @OpenapiTags('users')
    @OpenapiConsumes('application/json')
    @OpenapiProduces('application/json')
    @OpenapiSecurity('bearer')
    @OpenapiExclude()
    class UsersController {
      @OpenapiOperation({summary: 'Lista'})
      @OpenapiResponse({status: 200, description: 'Lista'})
      @OpenapiOkResponse({description: 'Lista'})
      @OpenapiCreatedResponse({description: 'x'})
      @OpenapiNoContentResponse({description: 'x'})
      @OpenapiBadRequestResponse({description: 'x'})
      @OpenapiUnauthorizedResponse({description: 'x'})
      @OpenapiForbiddenResponse({description: 'x'})
      @OpenapiNotFoundResponse({description: 'x'})
      @OpenapiConflictResponse({description: 'x'})
      @OpenapiTags('list')
      @OpenapiExclude()
      list(): string[] {
        return ['ana'];
      }
    }

    expect(UsersController.name).toBe('UsersController');
    expect(Reflect.ownKeys(UsersController.prototype)).toEqual(['constructor', 'list']);
    expect(Object.getOwnPropertyDescriptor(UsersController.prototype, 'list')).toMatchObject({
      writable: true,
      enumerable: false,
      configurable: true,
    });
    expect(new UsersController().list()).toEqual(['ana']);
  });

  it('são exportados pelo barrel raiz', () => {
    expect(root.OpenapiTags).toBe(OpenapiTags);
    expect(root.OpenapiOperation).toBe(OpenapiOperation);
    expect(root.OpenapiConsumes).toBe(OpenapiConsumes);
    expect(root.OpenapiProduces).toBe(OpenapiProduces);
    expect(root.OpenapiResponse).toBe(OpenapiResponse);
    expect(root.OpenapiOkResponse).toBe(OpenapiOkResponse);
    expect(root.OpenapiCreatedResponse).toBe(OpenapiCreatedResponse);
    expect(root.OpenapiNoContentResponse).toBe(OpenapiNoContentResponse);
    expect(root.OpenapiBadRequestResponse).toBe(OpenapiBadRequestResponse);
    expect(root.OpenapiUnauthorizedResponse).toBe(OpenapiUnauthorizedResponse);
    expect(root.OpenapiForbiddenResponse).toBe(OpenapiForbiddenResponse);
    expect(root.OpenapiNotFoundResponse).toBe(OpenapiNotFoundResponse);
    expect(root.OpenapiConflictResponse).toBe(OpenapiConflictResponse);
    expect(root.OpenapiSecurity).toBe(OpenapiSecurity);
    expect(root.OpenapiExclude).toBe(OpenapiExclude);
  });
});

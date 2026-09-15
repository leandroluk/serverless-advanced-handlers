// Testes de tipo dos decorators OpenAPI no modo B (tsconfig do repositório) — REQ-070.
import {describe, expectTypeOf, test} from 'vitest';
import * as z from 'zod';

import type {AnyAdvancedClass, ClassFactory} from '#/class/types';
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
  type OpenapiResponseOptions,
  type ResponseSchema,
} from '#/decorators/openapi';
import {HttpStatus} from '#/http/status';
import type * as root from '#/index';

// A implementação de `Class()` só existe na F04: aqui basta a assinatura.
declare const Class: ClassFactory;

const userSchema = z.object({id: z.string(), name: z.string()});

declare class UserDto extends Class(userSchema) {}

/** Subclasse de uma classe `Class()`. */
declare class AdminDto extends UserDto {
  get isAdmin(): boolean;
}

declare abstract class AbstractDto extends Class(userSchema) {}

declare class CreateUserBody extends Class(UserDto.omit({id: true})) {}

declare class ErrorDto extends Class(z.object({message: z.string()})) {}

declare class PlainClass {
  id: string;
  name: string;
}

declare const rawObject: typeof userSchema;

type Shortcut =
  | typeof OpenapiOkResponse
  | typeof OpenapiCreatedResponse
  | typeof OpenapiNoContentResponse
  | typeof OpenapiBadRequestResponse
  | typeof OpenapiUnauthorizedResponse
  | typeof OpenapiForbiddenResponse
  | typeof OpenapiNotFoundResponse
  | typeof OpenapiConflictResponse;

describe('assinaturas', () => {
  test('decorators de classe-ou-método', () => {
    expectTypeOf(OpenapiTags).parameters.toEqualTypeOf<string[]>();
    expectTypeOf(OpenapiTags).returns.toEqualTypeOf<DualClassOrMethodDecorator>();
    expectTypeOf(OpenapiConsumes).parameters.toEqualTypeOf<string[]>();
    expectTypeOf(OpenapiConsumes).returns.toEqualTypeOf<DualClassOrMethodDecorator>();
    expectTypeOf(OpenapiProduces).parameters.toEqualTypeOf<string[]>();
    expectTypeOf(OpenapiProduces).returns.toEqualTypeOf<DualClassOrMethodDecorator>();
    expectTypeOf(OpenapiSecurity).parameters.toEqualTypeOf<[name: string, scopes?: string[]]>();
    expectTypeOf(OpenapiSecurity).returns.toEqualTypeOf<DualClassOrMethodDecorator>();
    expectTypeOf(OpenapiExclude).parameters.toEqualTypeOf<[]>();
    expectTypeOf(OpenapiExclude).returns.toEqualTypeOf<DualClassOrMethodDecorator>();
  });

  test('decorators de método', () => {
    expectTypeOf(OpenapiOperation).parameters.toEqualTypeOf<
      [options: {summary?: string; description?: string; operationId?: string; deprecated?: boolean}]
    >();
    expectTypeOf(OpenapiOperation).returns.toEqualTypeOf<DualMethodDecorator>();
    expectTypeOf(OpenapiResponse).parameters.toEqualTypeOf<[options: OpenapiResponseOptions]>();
    expectTypeOf(OpenapiResponse).returns.toEqualTypeOf<DualMethodDecorator>();
  });

  test('OpenapiResponseOptions e ResponseSchema', () => {
    expectTypeOf<ResponseSchema>().toEqualTypeOf<AnyAdvancedClass | readonly [AnyAdvancedClass]>();
    expectTypeOf<OpenapiResponseOptions>().toEqualTypeOf<{
      status: HttpStatus | number;
      description: string;
      schema?: ResponseSchema;
    }>();
  });

  test('os 8 atalhos recebem Omit<OpenapiResponseOptions, "status">', () => {
    expectTypeOf<Parameters<Shortcut>>().toEqualTypeOf<[options: Omit<OpenapiResponseOptions, 'status'>]>();
    expectTypeOf<ReturnType<Shortcut>>().toEqualTypeOf<DualMethodDecorator>();
    expectTypeOf<Omit<OpenapiResponseOptions, 'status'>>().toEqualTypeOf<{
      description: string;
      schema?: ResponseSchema;
    }>();
  });

  test('barrel raiz exporta decorators e tipos', () => {
    expectTypeOf<typeof root.OpenapiTags>().toEqualTypeOf<typeof OpenapiTags>();
    expectTypeOf<typeof root.OpenapiOperation>().toEqualTypeOf<typeof OpenapiOperation>();
    expectTypeOf<typeof root.OpenapiConsumes>().toEqualTypeOf<typeof OpenapiConsumes>();
    expectTypeOf<typeof root.OpenapiProduces>().toEqualTypeOf<typeof OpenapiProduces>();
    expectTypeOf<typeof root.OpenapiResponse>().toEqualTypeOf<typeof OpenapiResponse>();
    expectTypeOf<typeof root.OpenapiOkResponse>().toEqualTypeOf<typeof OpenapiOkResponse>();
    expectTypeOf<typeof root.OpenapiCreatedResponse>().toEqualTypeOf<typeof OpenapiCreatedResponse>();
    expectTypeOf<typeof root.OpenapiNoContentResponse>().toEqualTypeOf<typeof OpenapiNoContentResponse>();
    expectTypeOf<typeof root.OpenapiBadRequestResponse>().toEqualTypeOf<typeof OpenapiBadRequestResponse>();
    expectTypeOf<typeof root.OpenapiUnauthorizedResponse>().toEqualTypeOf<typeof OpenapiUnauthorizedResponse>();
    expectTypeOf<typeof root.OpenapiForbiddenResponse>().toEqualTypeOf<typeof OpenapiForbiddenResponse>();
    expectTypeOf<typeof root.OpenapiNotFoundResponse>().toEqualTypeOf<typeof OpenapiNotFoundResponse>();
    expectTypeOf<typeof root.OpenapiConflictResponse>().toEqualTypeOf<typeof OpenapiConflictResponse>();
    expectTypeOf<typeof root.OpenapiSecurity>().toEqualTypeOf<typeof OpenapiSecurity>();
    expectTypeOf<typeof root.OpenapiExclude>().toEqualTypeOf<typeof OpenapiExclude>();
    expectTypeOf<root.OpenapiResponseOptions>().toEqualTypeOf<OpenapiResponseOptions>();
    expectTypeOf<root.ResponseSchema>().toEqualTypeOf<ResponseSchema>();
  });
});

describe('aplicação em um controller de exemplo (modo B)', () => {
  test('decorators de classe-ou-método em classe e em método; decorators de método em método', () => {
    @OpenapiTags('users', 'admin')
    @OpenapiConsumes('application/json')
    @OpenapiProduces('application/json', 'application/xml')
    @OpenapiSecurity('bearer')
    class UsersController {
      @OpenapiTags()
      @OpenapiOperation({summary: 'Lista usuários', description: 'Todos', operationId: 'users.list', deprecated: false})
      @OpenapiOkResponse({description: 'Lista', schema: [UserDto]})
      @OpenapiResponse({status: HttpStatus.OK, description: 'Lista de admins', schema: [AdminDto] as const})
      list(): UserDto[] {
        return [];
      }

      @OpenapiOperation({})
      @OpenapiConsumes('multipart/form-data')
      @OpenapiProduces()
      @OpenapiSecurity('oauth2', ['users:write'])
      @OpenapiCreatedResponse({description: 'Criado', schema: UserDto})
      @OpenapiBadRequestResponse({description: 'Inválido', schema: ErrorDto})
      @OpenapiUnauthorizedResponse({description: 'Sem token'})
      @OpenapiForbiddenResponse({description: 'Sem permissão'})
      @OpenapiConflictResponse({description: 'Duplicado', schema: ErrorDto})
      @OpenapiResponse({status: 422, description: 'Não processável', schema: AbstractDto})
      async create(this: UsersController, body: CreateUserBody): Promise<UserDto> {
        return {id: '1', ...body};
      }

      @OpenapiNotFoundResponse({description: 'Não encontrado'})
      @OpenapiNoContentResponse({description: 'Removido'})
      @OpenapiResponse({status: HttpStatus.I_AM_A_TEAPOT, description: 'Admin', schema: AdminDto})
      @OpenapiExclude()
      static remove(id: string): void {
        expectTypeOf(id).toBeString();
      }
    }

    @OpenapiExclude()
    abstract class InternalController {
      @OpenapiExclude()
      @OpenapiSecurity('apiKey', [])
      health(): string {
        return 'ok';
      }
    }

    expectTypeOf<UsersController['list']>().returns.toEqualTypeOf<UserDto[]>();
    expectTypeOf<InternalController['health']>().returns.toEqualTypeOf<string>();
  });

  test('decorators de método aplicados a classe geram erro', () => {
    // @ts-expect-error OpenapiOperation não se aplica a classe
    @OpenapiOperation({summary: 'x'})
    class OperationOnClass {}

    // @ts-expect-error OpenapiResponse não se aplica a classe
    @OpenapiResponse({status: 200, description: 'x'})
    class ResponseOnClass {}

    // @ts-expect-error atalhos de response não se aplicam a classe
    @OpenapiOkResponse({description: 'x'})
    class OkResponseOnClass {}

    expectTypeOf(OperationOnClass).toBeConstructibleWith();
    expectTypeOf(ResponseOnClass).toBeConstructibleWith();
    expectTypeOf(OkResponseOnClass).toBeConstructibleWith();
  });
});

describe('schema', () => {
  test('aceita Cls, subclasse, classe abstrata e [Cls]', () => {
    expectTypeOf(OpenapiResponse).toBeCallableWith({status: 200, description: 'x', schema: UserDto});
    expectTypeOf(OpenapiResponse).toBeCallableWith({status: 200, description: 'x', schema: AdminDto});
    expectTypeOf(OpenapiResponse).toBeCallableWith({status: 200, description: 'x', schema: AbstractDto});
    expectTypeOf(OpenapiResponse).toBeCallableWith({status: 200, description: 'x', schema: CreateUserBody});
    expectTypeOf(OpenapiResponse).toBeCallableWith({status: 200, description: 'x', schema: [UserDto]});
    expectTypeOf(OpenapiResponse).toBeCallableWith({status: 200, description: 'x', schema: [AdminDto]});
    expectTypeOf(OpenapiOkResponse).toBeCallableWith({description: 'x', schema: [CreateUserBody] as const});
    const arraySchema: readonly [typeof UserDto] = [UserDto];
    expectTypeOf(OpenapiOkResponse).toBeCallableWith({description: 'x', schema: arraySchema});
    expectTypeOf(OpenapiOkResponse).toBeCallableWith({description: 'x'});
  });

  test('rejeita ZodObject cru, classe comum e arrays inválidos', () => {
    // @ts-expect-error ZodObject cru não é classe `Class()`
    expectTypeOf(OpenapiResponse).toBeCallableWith({status: 200, description: 'x', schema: rawObject});
    // @ts-expect-error ZodObject cru dentro de array
    expectTypeOf(OpenapiResponse).toBeCallableWith({status: 200, description: 'x', schema: [rawObject]});
    // @ts-expect-error classe comum não é classe `Class()`
    expectTypeOf(OpenapiResponse).toBeCallableWith({status: 200, description: 'x', schema: PlainClass});
    // @ts-expect-error classe comum dentro de array
    expectTypeOf(OpenapiOkResponse).toBeCallableWith({description: 'x', schema: [PlainClass]});
    // @ts-expect-error array com mais de um item
    expectTypeOf(OpenapiResponse).toBeCallableWith({status: 200, description: 'x', schema: [UserDto, AdminDto]});
    // @ts-expect-error array vazio
    expectTypeOf(OpenapiOkResponse).toBeCallableWith({description: 'x', schema: []});
    const loose: (typeof UserDto)[] = [UserDto];
    // @ts-expect-error array de tamanho arbitrário não é `[Cls]`
    expectTypeOf(OpenapiOkResponse).toBeCallableWith({description: 'x', schema: loose});
    // @ts-expect-error instância não é classe
    expectTypeOf(OpenapiOkResponse).toBeCallableWith({description: 'x', schema: new PlainClass()});
  });
});

describe('status', () => {
  test('aceita membro de HttpStatus e número', () => {
    expectTypeOf(OpenapiResponse).toBeCallableWith({status: HttpStatus.CREATED, description: 'x'});
    expectTypeOf(OpenapiResponse).toBeCallableWith({status: 201, description: 'x'});
    expectTypeOf(OpenapiResponse).toBeCallableWith({status: 599, description: 'x'});
  });

  test('rejeita string, boolean e ausência', () => {
    // @ts-expect-error status string
    expectTypeOf(OpenapiResponse).toBeCallableWith({status: '200', description: 'x'});
    // @ts-expect-error status boolean
    expectTypeOf(OpenapiResponse).toBeCallableWith({status: true, description: 'x'});
    // @ts-expect-error status é obrigatório em OpenapiResponse
    expectTypeOf(OpenapiResponse).toBeCallableWith({description: 'x'});
    // @ts-expect-error description é obrigatória
    expectTypeOf(OpenapiResponse).toBeCallableWith({status: 200});
  });
});

describe('atalhos de response', () => {
  test('rejeitam status', () => {
    expectTypeOf<Parameters<Shortcut>[0]>().not.toHaveProperty('status');

    // Chamadas diretas: o literal passa pela checagem de propriedade excedente do parâmetro.
    // @ts-expect-error OpenapiOkResponse não aceita status
    OpenapiOkResponse({status: 200, description: 'x'});
    // @ts-expect-error OpenapiCreatedResponse não aceita status
    OpenapiCreatedResponse({status: 201, description: 'x'});
    // @ts-expect-error OpenapiNoContentResponse não aceita status
    OpenapiNoContentResponse({status: HttpStatus.NO_CONTENT, description: 'x'});
    // @ts-expect-error OpenapiBadRequestResponse não aceita status
    OpenapiBadRequestResponse({status: 400, description: 'x'});
    // @ts-expect-error OpenapiUnauthorizedResponse não aceita status
    OpenapiUnauthorizedResponse({status: 401, description: 'x'});
    // @ts-expect-error OpenapiForbiddenResponse não aceita status
    OpenapiForbiddenResponse({status: 403, description: 'x'});
    // @ts-expect-error OpenapiNotFoundResponse não aceita status
    OpenapiNotFoundResponse({status: 404, description: 'x'});
    // @ts-expect-error OpenapiConflictResponse não aceita status
    OpenapiConflictResponse({status: 409, description: 'x'});
  });

  test('exigem description', () => {
    // @ts-expect-error description é obrigatória
    expectTypeOf(OpenapiCreatedResponse).toBeCallableWith({schema: UserDto});
  });
});

describe('argumentos inválidos', () => {
  test('rejeitam tipos incorretos', () => {
    // @ts-expect-error tags são strings
    expectTypeOf(OpenapiTags).toBeCallableWith('users', 1);
    // @ts-expect-error media types são strings
    expectTypeOf(OpenapiConsumes).toBeCallableWith(['application/json']);
    // @ts-expect-error media types são strings
    expectTypeOf(OpenapiProduces).toBeCallableWith(true);
    // @ts-expect-error OpenapiOperation exige objeto de opções
    expectTypeOf(OpenapiOperation).toBeCallableWith();
    // @ts-expect-error opção desconhecida
    expectTypeOf(OpenapiOperation).toBeCallableWith({tags: ['users']});
    // @ts-expect-error deprecated é boolean
    expectTypeOf(OpenapiOperation).toBeCallableWith({deprecated: 'yes'});
    // @ts-expect-error OpenapiSecurity exige nome
    expectTypeOf(OpenapiSecurity).toBeCallableWith();
    // @ts-expect-error scopes são string[]
    expectTypeOf(OpenapiSecurity).toBeCallableWith('bearer', 'users:read');
    // @ts-expect-error OpenapiExclude não recebe argumentos
    expectTypeOf(OpenapiExclude).toBeCallableWith(true);
  });
});

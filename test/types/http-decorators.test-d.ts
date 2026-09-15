// Tipagem dos decorators e marcadores HTTP no modo B (tsconfig do repositório). O modo C é coberto pelas fixtures
// de test/types/mode-c-http, compiladas por test/http-decorators-modes.spec.ts.
import type {Context} from 'aws-lambda';
import {describe, expectTypeOf, test} from 'vitest';
import * as z from 'zod';
import type {AnyAdvancedClass, ClassFactory} from '../../src/class/types';
import type {DualClassDecorator, DualMethodDecorator} from '../../src/decorators/dual';
import {
  HttpBody,
  HttpCode,
  HttpController,
  HttpCookies,
  HttpDelete,
  HttpForm,
  HttpGet,
  HttpHead,
  HttpHeaders,
  HttpOptions,
  HttpParams,
  HttpPatch,
  HttpPost,
  HttpPut,
  HttpQuery,
  HttpResponseHeader,
} from '../../src/decorators/http';
import * as httpBarrel from '../../src/http';
import {HttpStatus} from '../../src/http/status';
import * as httpTypes from '../../src/http/types';
import {HttpRequest, LambdaContext} from '../../src/index';
import * as root from '../../src/index';

// `Class()` ainda não existe em runtime; a assinatura basta para o typecheck.
declare const Class: ClassFactory;

class UserEntity extends Class(
  z.object({
    id: z.uuid(),
    name: z.string().min(3),
    email: z.email(),
    age: z.number().int().positive(),
    isActive: z.boolean().default(true),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
) {
  get displayName(): string {
    return `${this.name} <${this.email}>`;
  }
}

class CreateUserBody extends Class(UserEntity.omit({id: true, createdAt: true, updatedAt: true})) {}
class CreateUserResponse extends Class(UserEntity) {}
class ListUsersQuery extends Class(
  z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
  })
) {}
class UserRouteParams extends Class(z.object({id: z.uuid()})) {}
class UserRequestHeaders extends Class(
  z.object({authorization: z.string().startsWith('Bearer '), 'x-workspace-id': z.uuid().optional()})
) {}
class UserCookies extends Class(z.object({session: z.string()})) {}
class UploadAvatarForm extends Class(z.object({description: z.string().optional(), avatar: z.file()})) {}

declare class UsersService {
  create(body: CreateUserBody): Promise<CreateUserResponse>;
  list(query: ListUsersQuery): Promise<CreateUserResponse[]>;
  findById(id: string): Promise<CreateUserResponse>;
  updateAvatar(id: string, file: File, description?: string): Promise<void>;
}

// Controller de exemplo da INSIGHT §4.1, sem os decorators `@Openapi*` (public-api-surface).
@HttpController('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @HttpPost('/')
  @HttpCode(HttpStatus.CREATED)
  async postCreate(@HttpBody(CreateUserBody) body: CreateUserBody): Promise<CreateUserResponse> {
    return this.usersService.create(body);
  }

  @HttpGet('/')
  async getList(
    @HttpQuery(ListUsersQuery) query: ListUsersQuery,
    @HttpHeaders(UserRequestHeaders) _headers: UserRequestHeaders
  ): Promise<CreateUserResponse[]> {
    return this.usersService.list(query);
  }

  @HttpGet('/:id')
  async getById(@HttpParams(UserRouteParams) params: UserRouteParams): Promise<CreateUserResponse> {
    return this.usersService.findById(params.id);
  }

  @HttpPost('/:id/avatar')
  async uploadAvatar(
    @HttpParams(UserRouteParams) params: UserRouteParams,
    @HttpForm(UploadAvatarForm) form: UploadAvatarForm
  ): Promise<void> {
    return this.usersService.updateAvatar(params.id, form.avatar, form.description);
  }
}

// Decorators de parâmetro sem argumento, escape hatches e as demais rotas.
@HttpController()
export class MiscController {
  @HttpPut('/:id')
  @HttpResponseHeader('cache-control', 'no-store')
  put(@HttpParams() _params: UserRouteParams, @HttpBody() _body: CreateUserBody): void {}

  @HttpPatch('/:id')
  @HttpCode(204)
  patch(@HttpQuery() _query: ListUsersQuery, @HttpHeaders() _headers: UserRequestHeaders): void {}

  @HttpDelete()
  delete(@HttpCookies() _cookies: UserCookies, @HttpForm() _form: UploadAvatarForm): void {}

  @HttpHead('/')
  head(@HttpRequest() _req: HttpRequest, @LambdaContext() _ctx: LambdaContext): void {}

  @HttpOptions()
  options(@HttpCookies(UserCookies) _cookies: UserCookies): void {}

  // Marcadores de tipo também valem no modo B (REQ-007).
  @HttpPost()
  markers(
    _body: HttpBody<CreateUserBody>,
    _query: HttpQuery<ListUsersQuery>,
    _params: HttpParams<UserRouteParams>,
    _headers: HttpHeaders<UserRequestHeaders>,
    _cookies: HttpCookies<UserCookies>,
    _form: HttpForm<UploadAvatarForm>,
    _req: HttpRequest,
    _ctx: LambdaContext
  ): void {}

  static {
    // Decorators aplicados a alvos incompatíveis são rejeitados.
    class _Misplaced {
      // @ts-expect-error decorator de classe não se aplica a método
      @HttpController()
      method(): void {}

      // @ts-expect-error decorator de parâmetro não se aplica a método
      @HttpBody()
      other(): void {}
    }
    // @ts-expect-error decorator de método não se aplica a classe
    @HttpGet()
    class _RouteOnClass {}
    void [_Misplaced, _RouteOnClass];
  }
}

describe('decorators de controller, rota e resposta', () => {
  test('têm as assinaturas da REQ-040, REQ-041, REQ-042 e REQ-050', () => {
    expectTypeOf(HttpController).toEqualTypeOf<(prefix?: string) => DualClassDecorator>();
    for (const route of [HttpGet, HttpPost, HttpPut, HttpPatch, HttpDelete, HttpHead, HttpOptions]) {
      expectTypeOf(route).toEqualTypeOf<(path?: string) => DualMethodDecorator>();
    }
    expectTypeOf(HttpCode).toEqualTypeOf<(status: HttpStatus | number) => DualMethodDecorator>();
    expectTypeOf(HttpResponseHeader).toEqualTypeOf<(name: string, value: string) => DualMethodDecorator>();
  });

  test('rejeitam argumentos inválidos', () => {
    expectTypeOf(HttpController).parameter(0).toEqualTypeOf<string | undefined>();
    expectTypeOf(HttpGet).parameter(0).toEqualTypeOf<string | undefined>();
    expectTypeOf(HttpCode).parameters.toEqualTypeOf<[status: HttpStatus | number]>();
    expectTypeOf(HttpResponseHeader).parameters.toEqualTypeOf<[name: string, value: string]>();
    // @ts-expect-error prefixo deve ser string
    HttpController(1);
    // @ts-expect-error path deve ser string
    HttpGet(1);
    // @ts-expect-error status deve ser HttpStatus ou number
    HttpCode('201');
    // @ts-expect-error HttpCode exige status
    HttpCode();
    // @ts-expect-error HttpResponseHeader exige nome e valor
    HttpResponseHeader('x-a');
    // @ts-expect-error valor do header deve ser string
    HttpResponseHeader('x-a', 1);
  });
});

describe('decorators de parâmetro e marcadores (REQ-043, REQ-007)', () => {
  test('decorators aceitam uma classe Class() opcional e retornam ParameterDecorator', () => {
    for (const decorator of [HttpBody, HttpQuery, HttpParams, HttpHeaders, HttpCookies, HttpForm]) {
      expectTypeOf(decorator).toEqualTypeOf<(cls?: AnyAdvancedClass) => ParameterDecorator>();
    }
    expectTypeOf(HttpBody(CreateUserBody)).toEqualTypeOf<ParameterDecorator>();
    expectTypeOf(HttpForm()).toEqualTypeOf<ParameterDecorator>();
  });

  test('decorators rejeitam argumentos que não sejam classes Class()', () => {
    class Plain {
      id = '';
    }
    expectTypeOf(z.object({id: z.string()})).not.toExtend<AnyAdvancedClass>();
    expectTypeOf(Plain).not.toExtend<AnyAdvancedClass>();
    expectTypeOf<string>().not.toExtend<AnyAdvancedClass>();
    expectTypeOf(UserRouteParams).toExtend<AnyAdvancedClass>();
    // @ts-expect-error ZodObject cru não é classe Class()
    HttpBody(z.object({id: z.string()}));
    // @ts-expect-error classe comum não é classe Class()
    HttpQuery(Plain);
    // @ts-expect-error string não é classe Class()
    HttpParams('UserRouteParams');
    // @ts-expect-error instância não é classe Class()
    HttpHeaders(new UserRouteParams({id: ''}));
    // @ts-expect-error ZodObject cru não é classe Class()
    HttpCookies(UserCookies.object);
    // @ts-expect-error classe comum não é classe Class()
    HttpForm(Date);
  });

  test('decorators de parâmetro rejeitam argumentos inválidos na sintaxe de decorator', () => {
    class Plain {
      id = '';
    }
    class _Invalid {
      body(
        // @ts-expect-error ZodObject cru não é classe Class()
        @HttpBody(z.object({id: z.string()})) _body: unknown,
        // @ts-expect-error classe comum não é classe Class()
        @HttpQuery(Plain) _query: Plain,
        // @ts-expect-error string não é classe Class()
        @HttpParams('id') _params: unknown
      ): void {}
    }
    expectTypeOf(_Invalid).toBeConstructibleWith();
  });

  test('marcadores são a identidade do tipo', () => {
    expectTypeOf<HttpBody<CreateUserBody>>().toEqualTypeOf<CreateUserBody>();
    expectTypeOf<HttpQuery<ListUsersQuery>>().toEqualTypeOf<ListUsersQuery>();
    expectTypeOf<HttpParams<UserRouteParams>>().toEqualTypeOf<UserRouteParams>();
    expectTypeOf<HttpHeaders<UserRequestHeaders>>().toEqualTypeOf<UserRequestHeaders>();
    expectTypeOf<HttpCookies<UserCookies>>().toEqualTypeOf<UserCookies>();
    expectTypeOf<HttpForm<UploadAvatarForm>>().toEqualTypeOf<UploadAvatarForm>();
    expectTypeOf<HttpForm<UploadAvatarForm>['avatar']>().toEqualTypeOf<File>();
  });
});

describe('HttpRequest e LambdaContext (REQ-045)', () => {
  test('o mesmo identificador é decorator e tipo', () => {
    expectTypeOf(HttpRequest).toEqualTypeOf<() => ParameterDecorator>();
    expectTypeOf(LambdaContext).toEqualTypeOf<() => ParameterDecorator>();
    expectTypeOf<HttpRequest>().toEqualTypeOf<httpTypes.HttpRequest>();
    expectTypeOf<HttpRequest['route']>().toEqualTypeOf<string>();
    expectTypeOf<LambdaContext>().toEqualTypeOf<Context>();
  });

  test('não aceitam argumentos', () => {
    expectTypeOf(HttpRequest).parameters.toEqualTypeOf<[]>();
    expectTypeOf(LambdaContext).parameters.toEqualTypeOf<[]>();
    // @ts-expect-error HttpRequest não recebe argumentos
    HttpRequest('x');
    // @ts-expect-error LambdaContext não recebe argumentos
    LambdaContext({});
  });

  test('raiz, barrel HTTP e módulo de tipos expõem o mesmo valor e tipo', () => {
    expectTypeOf(root.HttpRequest).toEqualTypeOf(httpTypes.HttpRequest);
    expectTypeOf(root.LambdaContext).toEqualTypeOf(httpTypes.LambdaContext);
    expectTypeOf(httpBarrel.HttpRequest).toEqualTypeOf(httpTypes.HttpRequest);
    expectTypeOf(httpBarrel.LambdaContext).toEqualTypeOf(httpTypes.LambdaContext);
    expectTypeOf<root.HttpRequest>().toEqualTypeOf<httpTypes.HttpRequest>();
    expectTypeOf<root.LambdaContext>().toEqualTypeOf<httpTypes.LambdaContext>();
    expectTypeOf<httpBarrel.HttpRequest>().toEqualTypeOf<httpTypes.HttpRequest>();
    expectTypeOf<httpBarrel.LambdaContext>().toEqualTypeOf<httpTypes.LambdaContext>();
  });
});

describe('barrel raiz', () => {
  test('exporta decorators e marcadores HTTP', () => {
    expectTypeOf(root.HttpController).toEqualTypeOf(HttpController);
    expectTypeOf(root.HttpGet).toEqualTypeOf(HttpGet);
    expectTypeOf(root.HttpPost).toEqualTypeOf(HttpPost);
    expectTypeOf(root.HttpPut).toEqualTypeOf(HttpPut);
    expectTypeOf(root.HttpPatch).toEqualTypeOf(HttpPatch);
    expectTypeOf(root.HttpDelete).toEqualTypeOf(HttpDelete);
    expectTypeOf(root.HttpHead).toEqualTypeOf(HttpHead);
    expectTypeOf(root.HttpOptions).toEqualTypeOf(HttpOptions);
    expectTypeOf(root.HttpCode).toEqualTypeOf(HttpCode);
    expectTypeOf(root.HttpResponseHeader).toEqualTypeOf(HttpResponseHeader);
    expectTypeOf(root.HttpBody).toEqualTypeOf(HttpBody);
    expectTypeOf(root.HttpQuery).toEqualTypeOf(HttpQuery);
    expectTypeOf(root.HttpParams).toEqualTypeOf(HttpParams);
    expectTypeOf(root.HttpHeaders).toEqualTypeOf(HttpHeaders);
    expectTypeOf(root.HttpCookies).toEqualTypeOf(HttpCookies);
    expectTypeOf(root.HttpForm).toEqualTypeOf(HttpForm);
    expectTypeOf<root.HttpBody<CreateUserBody>>().toEqualTypeOf<CreateUserBody>();
    expectTypeOf<root.HttpQuery<ListUsersQuery>>().toEqualTypeOf<ListUsersQuery>();
    expectTypeOf<root.HttpParams<UserRouteParams>>().toEqualTypeOf<UserRouteParams>();
    expectTypeOf<root.HttpHeaders<UserRequestHeaders>>().toEqualTypeOf<UserRequestHeaders>();
    expectTypeOf<root.HttpCookies<UserCookies>>().toEqualTypeOf<UserCookies>();
    expectTypeOf<root.HttpForm<UploadAvatarForm>>().toEqualTypeOf<UploadAvatarForm>();
  });
});

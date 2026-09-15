// Fixture do modo C (decorators TC39): compilada por test/http-decorators-modes.spec.ts com
// test/types/mode-c-http/tsconfig.json e deve passar sem erros. É o controller da INSIGHT §4.1 (sem `@Openapi*`)
// com decorators de classe e de método e MARCADORES de tipo nos parâmetros (REQ-007).
import * as z from 'zod';
import type {ClassFactory} from '#/index';
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
  HttpRequest,
  HttpResponseHeader,
  HttpStatus,
  LambdaContext,
} from '#/index';

// `Class()` ainda não existe em runtime; a assinatura basta para o typecheck.
declare const Class: ClassFactory;

class UserEntity extends Class(
  z.object({
    id: z.uuid(),
    name: z.string().min(3),
    email: z.email(),
    createdAt: z.date(),
  })
) {}

class CreateUserBody extends Class(UserEntity.omit({id: true, createdAt: true})) {}
class CreateUserResponse extends Class(UserEntity) {}
class ListUsersQuery extends Class(z.object({page: z.coerce.number().int().positive().default(1)})) {}
class UserRouteParams extends Class(z.object({id: z.uuid()})) {}
class UserRequestHeaders extends Class(z.object({authorization: z.string().startsWith('Bearer ')})) {}
class UserCookies extends Class(z.object({session: z.string()})) {}
class UploadAvatarForm extends Class(z.object({description: z.string().optional(), avatar: z.file()})) {}

declare class UsersService {
  create(body: CreateUserBody): Promise<CreateUserResponse>;
  list(query: ListUsersQuery): Promise<CreateUserResponse[]>;
  findById(id: string): Promise<CreateUserResponse>;
  updateAvatar(id: string, file: File, description?: string): Promise<void>;
}

@HttpController('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @HttpPost('/')
  @HttpCode(HttpStatus.CREATED)
  async postCreate(body: HttpBody<CreateUserBody>): Promise<CreateUserResponse> {
    return this.usersService.create(body);
  }

  @HttpGet('/')
  async getList(
    query: HttpQuery<ListUsersQuery>,
    _headers: HttpHeaders<UserRequestHeaders>
  ): Promise<CreateUserResponse[]> {
    return this.usersService.list(query);
  }

  @HttpGet('/:id')
  async getById(params: HttpParams<UserRouteParams>): Promise<CreateUserResponse> {
    return this.usersService.findById(params.id);
  }

  @HttpPost('/:id/avatar')
  async uploadAvatar(params: HttpParams<UserRouteParams>, form: HttpForm<UploadAvatarForm>): Promise<void> {
    return this.usersService.updateAvatar(params.id, form.avatar, form.description);
  }
}

@HttpController()
export class MiscController {
  @HttpPut('/:id')
  @HttpResponseHeader('cache-control', 'no-store')
  put(_params: HttpParams<UserRouteParams>, _cookies: HttpCookies<UserCookies>): void {}

  @HttpPatch()
  @HttpCode(204)
  patch(req: HttpRequest, ctx: LambdaContext): string {
    return `${req.method} ${req.route} ${ctx.awsRequestId}`;
  }

  @HttpDelete()
  delete(this: MiscController): void {}

  @HttpHead('/')
  static head(): void {}

  @HttpOptions()
  options(): void {}
}

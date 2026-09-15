// Fixture inválida do modo C (decorators TC39): compilada por test/http-decorators-modes.spec.ts com
// test/types/mode-c-http/invalid/tsconfig.json e deve falhar somente com TS1206, pois decorators TC39 não se
// aplicam a parâmetros; o equivalente é o marcador `body: HttpBody<T>`. No modo B ela compila normalmente.
import {HttpBody, HttpController, HttpPost} from '#/index';

@HttpController('users')
export class UsersController {
  @HttpPost('/')
  create(@HttpBody() body: string): string {
    return body;
  }
}

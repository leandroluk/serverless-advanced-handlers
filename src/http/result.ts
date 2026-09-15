import type {HttpStatus} from '#/http/status';

/**
 * Dynamic HTTP response returned by a route method (REQ-049).
 *
 * The body is still serialized through the route schema; `status`, `headers` and `cookies` control the response.
 *
 * Defaults:
 * - `status` stays `undefined` when omitted: the HTTP runtime (F07) picks the route default status.
 * - `headers` defaults to `{}` and `cookies` to `[]`, so consumers never need to null-check them.
 *
 * Values passed in `init` are kept as-is (same references, no copies).
 *
 * @example
 * return new HttpResult(user, {status: HttpStatus.CREATED, headers: {location: `/users/${user.id}`}});
 */
export class HttpResult<T = unknown> {
  readonly body: T;
  readonly status: HttpStatus | number | undefined;
  readonly headers: Record<string, string>;
  readonly cookies: string[];

  constructor(body: T, init?: {status?: HttpStatus | number; headers?: Record<string, string>; cookies?: string[]}) {
    this.body = body;
    this.status = init?.status;
    this.headers = init?.headers ?? {};
    this.cookies = init?.cookies ?? [];
  }
}

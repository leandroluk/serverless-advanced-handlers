import type {APIGatewayProxyEvent, APIGatewayProxyEventV2, Context} from 'aws-lambda';

/** HTTP methods supported by `@Http*` route decorators. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Normalized HTTP request (REQ-045).
 *
 * Open interface: consumers may augment it via `declare module 'serverless-advanced-handlers'`
 * to attach data such as `user` from guards (Decision Log #5).
 */
export interface HttpRequest {
  readonly method: HttpMethod;
  /** Actual request path. */
  readonly path: string;
  /** Route pattern, e.g. `/users/:id`. */
  readonly route: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, string | string[]>>;
  readonly params: Readonly<Record<string, string>>;
  readonly cookies: Readonly<Record<string, string>>;
  readonly rawBody?: Buffer;
  readonly sourceIp?: string;
  /** Original API Gateway event (payload v2 or v1). */
  readonly event: APIGatewayProxyEventV2 | APIGatewayProxyEvent;
}

/** AWS Lambda `Context` object (REQ-045). */
export type LambdaContext = Context;

/** Uploaded file: Web `File` plus form field name and optional S3 location (REQ-053). */
export interface UploadedFile extends File {
  readonly fieldname: string;
  readonly location?: {readonly bucket: string; readonly key: string};
}

/** Mutable response state exposed by `switchToHttp().getResponse()`. */
export interface HttpResponseState {
  status?: number;
  headers: Record<string, string>;
  cookies: string[];
}

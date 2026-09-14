import type {APIGatewayProxyEvent, APIGatewayProxyEventV2, Context} from 'aws-lambda';
import {describe, expectTypeOf, test} from 'vitest';
import {HttpStatus} from '../../src/http/status';
import type {HttpMethod, HttpRequest, HttpResponseState, LambdaContext, UploadedFile} from '../../src/http/types';
import * as root from '../../src/index';

// Consumers augment through the package entry: `declare module 'serverless-advanced-handlers'`.
declare module '../../src/http/types' {
  interface HttpRequest {
    user?: {id: string};
  }
}

describe('HttpRequest', () => {
  test('exposes the normalized request shape with readonly properties', () => {
    expectTypeOf<HttpRequest['method']>().toEqualTypeOf<HttpMethod>();
    expectTypeOf<HttpRequest['path']>().toEqualTypeOf<string>();
    expectTypeOf<HttpRequest['route']>().toEqualTypeOf<string>();
    expectTypeOf<HttpRequest['headers']>().toEqualTypeOf<Readonly<Record<string, string>>>();
    expectTypeOf<HttpRequest['query']>().toEqualTypeOf<Readonly<Record<string, string | string[]>>>();
    expectTypeOf<HttpRequest['params']>().toEqualTypeOf<Readonly<Record<string, string>>>();
    expectTypeOf<HttpRequest['cookies']>().toEqualTypeOf<Readonly<Record<string, string>>>();
    expectTypeOf<HttpRequest['rawBody']>().toEqualTypeOf<Buffer | undefined>();
    expectTypeOf<HttpRequest['sourceIp']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<HttpRequest['event']>().toEqualTypeOf<APIGatewayProxyEventV2 | APIGatewayProxyEvent>();

    const req = {} as HttpRequest;
    // @ts-expect-error method is readonly
    req.method = 'GET';
    // @ts-expect-error path is readonly
    req.path = '/';
    // @ts-expect-error headers entries are readonly
    req.headers['x'] = 'y';
  });

  test('is open for augmentation via declare module', () => {
    expectTypeOf<HttpRequest>().toHaveProperty('user');
    expectTypeOf<HttpRequest['user']>().toEqualTypeOf<{id: string} | undefined>();
  });
});

describe('HttpMethod', () => {
  test('accepts the supported methods and rejects others', () => {
    expectTypeOf<HttpMethod>().toEqualTypeOf<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'>();
    // @ts-expect-error CONNECT is not supported
    const _connect: HttpMethod = 'CONNECT';
    // @ts-expect-error methods are case-sensitive
    const _lower: HttpMethod = 'get';
  });
});

describe('HttpStatus', () => {
  test('members carry literal numeric values', () => {
    expectTypeOf<typeof HttpStatus.CREATED>().toEqualTypeOf<HttpStatus.CREATED>();
    expectTypeOf<`${HttpStatus.CREATED}`>().toEqualTypeOf<'201'>();
    expectTypeOf<`${HttpStatus.CREATED}`>().not.toEqualTypeOf<'200'>();
    expectTypeOf<`${HttpStatus.OK}`>().toEqualTypeOf<'200'>();
    expectTypeOf<`${HttpStatus.CONTINUE}`>().toEqualTypeOf<'100'>();
    expectTypeOf<`${HttpStatus.NETWORK_AUTHENTICATION_REQUIRED}`>().toEqualTypeOf<'511'>();
    expectTypeOf<HttpStatus.CREATED>().toExtend<number>();
    expectTypeOf<HttpStatus.CREATED>().not.toEqualTypeOf<HttpStatus.OK>();
  });
});

describe('LambdaContext', () => {
  test('is the aws-lambda Context', () => {
    expectTypeOf<LambdaContext>().toEqualTypeOf<Context>();
  });
});

describe('UploadedFile', () => {
  test('is assignable to File, but a plain File is not an UploadedFile', () => {
    expectTypeOf<UploadedFile>().toExtend<File>();
    expectTypeOf<File>().not.toExtend<UploadedFile>();
    expectTypeOf<UploadedFile['fieldname']>().toEqualTypeOf<string>();
    expectTypeOf<UploadedFile['location']>().toEqualTypeOf<
      {readonly bucket: string; readonly key: string} | undefined
    >();

    // @ts-expect-error missing fieldname
    const _file: UploadedFile = {} as File;
  });
});

describe('HttpResponseState', () => {
  test('has mutable status, headers and cookies', () => {
    expectTypeOf<HttpResponseState>().toEqualTypeOf<{
      status?: number;
      headers: Record<string, string>;
      cookies: string[];
    }>();
    const res: HttpResponseState = {headers: {}, cookies: []};
    res.status = HttpStatus.CREATED;
    res.headers['x'] = 'y';
    res.cookies.push('a=b');
  });
});

describe('root barrel', () => {
  test('exports HttpStatus as a value and the HTTP types', () => {
    expectTypeOf(root.HttpStatus).toEqualTypeOf<typeof HttpStatus>();
    expectTypeOf<root.HttpRequest>().toEqualTypeOf<HttpRequest>();
    expectTypeOf<root.HttpMethod>().toEqualTypeOf<HttpMethod>();
    expectTypeOf<root.LambdaContext>().toEqualTypeOf<LambdaContext>();
    expectTypeOf<root.UploadedFile>().toEqualTypeOf<UploadedFile>();
    expectTypeOf<root.HttpResponseState>().toEqualTypeOf<HttpResponseState>();
  });
});

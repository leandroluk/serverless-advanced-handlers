import {describe, expect, expectTypeOf, test} from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  TooManyRequestsException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '#/http/exceptions';
import * as httpBarrel from '#/http/index';
import {HttpResult} from '#/http/result';
import {HttpStatus} from '#/http/status';
import * as root from '#/index';

type ExceptionCtor = new (message?: string | Record<string, unknown>) => HttpException;

const cases: ReadonlyArray<{ctor: ExceptionCtor; name: string; status: number; phrase: string}> = [
  {ctor: BadRequestException, name: 'BadRequestException', status: 400, phrase: 'Bad Request'},
  {ctor: UnauthorizedException, name: 'UnauthorizedException', status: 401, phrase: 'Unauthorized'},
  {ctor: ForbiddenException, name: 'ForbiddenException', status: 403, phrase: 'Forbidden'},
  {ctor: NotFoundException, name: 'NotFoundException', status: 404, phrase: 'Not Found'},
  {ctor: ConflictException, name: 'ConflictException', status: 409, phrase: 'Conflict'},
  {
    ctor: UnprocessableEntityException,
    name: 'UnprocessableEntityException',
    status: 422,
    phrase: 'Unprocessable Entity',
  },
  {ctor: TooManyRequestsException, name: 'TooManyRequestsException', status: 429, phrase: 'Too Many Requests'},
  {
    ctor: InternalServerErrorException,
    name: 'InternalServerErrorException',
    status: 500,
    phrase: 'Internal Server Error',
  },
];

describe('HTTP exception subclasses', () => {
  describe.each(cases)('$name', ({ctor: Exception, name, status, phrase}) => {
    test(`has status ${status} and the concrete class name`, () => {
      const error = new Exception();
      expect(error.status).toBe(status);
      expect(error.name).toBe(name);
    });

    test('defaults getResponse() and message to the reason phrase', () => {
      const error = new Exception();
      expect(error.getResponse()).toBe(phrase);
      expect(error.message).toBe(phrase);
    });

    test('returns a custom string response and uses it as message', () => {
      const error = new Exception('custom message');
      expect(error.getResponse()).toBe('custom message');
      expect(error.message).toBe('custom message');
    });

    test('returns a custom object response by reference and takes message from it', () => {
      const response = {message: 'object message', code: 'E_CUSTOM'};
      const error = new Exception(response);
      expect(error.getResponse()).toBe(response);
      expect(error.message).toBe('object message');
    });

    test('falls back to the reason phrase when the object response has no string message', () => {
      const response = {code: 'E_CUSTOM', message: ['a', 'b']};
      const error = new Exception(response);
      expect(error.getResponse()).toBe(response);
      expect(error.message).toBe(phrase);
    });

    test('is instanceof the subclass, HttpException and Error, and keeps the stack', () => {
      const error = new Exception();
      expect(error).toBeInstanceOf(Exception);
      expect(error).toBeInstanceOf(HttpException);
      expect(error).toBeInstanceOf(Error);
      expect(Object.getPrototypeOf(error)).toBe(Exception.prototype);
      expect(error.stack).toEqual(expect.any(String));
      expect(error.stack).toContain(`${name}: ${phrase}`);
      expect(error.stack).toContain('http-exceptions.spec.ts');
    });

    test('is caught as HttpException when thrown', () => {
      const run = (): never => {
        throw new Exception('thrown');
      };
      expect(run).toThrow(HttpException);
      expect(run).toThrow(Exception);
      expect(run).toThrow('thrown');
    });
  });
});

describe('HttpException', () => {
  test('keeps the given status and name', () => {
    const error = new HttpException(HttpStatus.BAD_GATEWAY);
    expect(error.status).toBe(502);
    expect(error.name).toBe('HttpException');
    expect(error).toBeInstanceOf(HttpException);
    expect(error).toBeInstanceOf(Error);
  });

  test('uses the reason phrase of the status when the response is omitted', () => {
    const error = new HttpException(400);
    expect(error.getResponse()).toBe('Bad Request');
    expect(error.message).toBe('Bad Request');
  });

  test('uses "Http Exception" for statuses without a known reason phrase', () => {
    const error = new HttpException(499);
    expect(error.status).toBe(499);
    expect(error.getResponse()).toBe('Http Exception');
    expect(error.message).toBe('Http Exception');
  });

  test('knows a reason phrase for every HttpStatus member', () => {
    const statuses = Object.values(HttpStatus).filter((value): value is HttpStatus => typeof value === 'number');
    expect(statuses.length).toBeGreaterThan(0);
    for (const status of statuses) {
      const response = new HttpException(status).getResponse();
      expect(response, `status ${status}`).toEqual(expect.any(String));
      expect(response, `status ${status}`).not.toBe('Http Exception');
    }
  });

  test('returns custom string and object responses exactly as given', () => {
    expect(new HttpException(418, 'teapot').getResponse()).toBe('teapot');
    expect(new HttpException(418, 'teapot').message).toBe('teapot');
    expect(new HttpException(400, '').getResponse()).toBe('');
    expect(new HttpException(400, '').message).toBe('');

    const response = {statusCode: 400, error: 'Bad Request', message: 'invalid'};
    const error = new HttpException(400, response);
    expect(error.getResponse()).toBe(response);
    expect(error.message).toBe('invalid');
    expect(new HttpException(400, {error: 'x'}).message).toBe('Bad Request');
  });

  test('user subclasses get their own name and instanceof chain', () => {
    class PaymentRequiredException extends HttpException {
      constructor() {
        super(HttpStatus.PAYMENT_REQUIRED);
      }
    }
    class CardDeclinedException extends NotFoundException {}

    const payment = new PaymentRequiredException();
    expect(payment.name).toBe('PaymentRequiredException');
    expect(payment.getResponse()).toBe('Payment Required');
    expect(payment).toBeInstanceOf(HttpException);

    const declined = new CardDeclinedException('declined');
    expect(declined.name).toBe('CardDeclinedException');
    expect(declined.status).toBe(404);
    expect(declined).toBeInstanceOf(NotFoundException);
    expect(declined).toBeInstanceOf(HttpException);
    expect(declined).toBeInstanceOf(Error);
  });

  test('has the declared public types', () => {
    expectTypeOf<HttpException['status']>().toEqualTypeOf<number>();
    expectTypeOf<HttpException['getResponse']>().returns.toEqualTypeOf<string | Record<string, unknown>>();
    expectTypeOf(HttpException).constructorParameters.toEqualTypeOf<
      [status: HttpStatus | number, response?: string | Record<string, unknown>]
    >();
    expectTypeOf(NotFoundException).constructorParameters.toEqualTypeOf<[message?: string | Record<string, unknown>]>();
    expectTypeOf<NotFoundException>().toExtend<HttpException>();
    expectTypeOf<HttpException>().toExtend<Error>();

    const typeOnly = (error: HttpException): void => {
      // @ts-expect-error status is readonly
      error.status = 500;
      // @ts-expect-error status must be numeric
      new HttpException('400');
      // @ts-expect-error response must be a string or an object
      new BadRequestException(42);
      // @ts-expect-error subclasses do not take a status
      new NotFoundException(404, 'not found');
    };
    expect(typeOnly).toEqual(expect.any(Function));
  });
});

describe('HttpResult', () => {
  test('preserves body and options exactly as given', () => {
    const body = {id: 1, name: 'Ada'};
    const headers = {location: '/users/1'};
    const cookies = ['session=abc; HttpOnly'];
    const result = new HttpResult(body, {status: HttpStatus.CREATED, headers, cookies});

    expect(result.body).toBe(body);
    expect(result.status).toBe(201);
    expect(result.headers).toBe(headers);
    expect(result.cookies).toBe(cookies);
  });

  test('accepts plain numeric statuses', () => {
    expect(new HttpResult(null, {status: 299}).status).toBe(299);
  });

  test('leaves status undefined and defaults headers to {} and cookies to []', () => {
    const result = new HttpResult('ok');
    expect(result.body).toBe('ok');
    expect(result.status).toBeUndefined();
    expect(result.headers).toEqual({});
    expect(result.cookies).toEqual([]);

    const partial = new HttpResult(undefined, {headers: {'x-a': '1'}});
    expect(partial.body).toBeUndefined();
    expect(partial.status).toBeUndefined();
    expect(partial.headers).toEqual({'x-a': '1'});
    expect(partial.cookies).toEqual([]);
  });

  test('does not share default headers/cookies between instances', () => {
    const a = new HttpResult(1);
    const b = new HttpResult(2);
    expect(a.headers).not.toBe(b.headers);
    expect(a.cookies).not.toBe(b.cookies);
  });

  test('has the declared public types', () => {
    const result = new HttpResult({id: 1});
    expectTypeOf(result).toEqualTypeOf<HttpResult<{id: number}>>();
    expectTypeOf(result.body).toEqualTypeOf<{id: number}>();
    expectTypeOf<HttpResult['body']>().toEqualTypeOf<unknown>();
    expectTypeOf<HttpResult['status']>().toEqualTypeOf<HttpStatus | number | undefined>();
    expectTypeOf<HttpResult['headers']>().toEqualTypeOf<Record<string, string>>();
    expectTypeOf<HttpResult['cookies']>().toEqualTypeOf<string[]>();

    const typeOnly = (value: HttpResult<string>): void => {
      // @ts-expect-error body is readonly
      value.body = 'x';
      // @ts-expect-error status is readonly
      value.status = 200;
      // @ts-expect-error headers is readonly
      value.headers = {};
      // @ts-expect-error cookies is readonly
      value.cookies = [];
      // @ts-expect-error status must be numeric
      new HttpResult('x', {status: '200'});
      // @ts-expect-error header values must be strings
      new HttpResult('x', {headers: {'x-count': 1}});
      // @ts-expect-error unknown init option
      new HttpResult('x', {statusCode: 200});
    };
    expect(typeOnly).toEqual(expect.any(Function));
  });
});

describe('barrels', () => {
  test('export the classes as values from src/http and the root entry', () => {
    const exported = {
      HttpResult,
      HttpException,
      BadRequestException,
      UnauthorizedException,
      ForbiddenException,
      NotFoundException,
      ConflictException,
      UnprocessableEntityException,
      TooManyRequestsException,
      InternalServerErrorException,
    };
    for (const [key, value] of Object.entries(exported)) {
      expect((httpBarrel as Record<string, unknown>)[key], `http barrel ${key}`).toBe(value);
      expect((root as Record<string, unknown>)[key], `root barrel ${key}`).toBe(value);
    }
  });
});

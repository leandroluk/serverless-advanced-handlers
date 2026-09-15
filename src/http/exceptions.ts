import {HttpStatus} from '#/http/status';

/** Fallback phrase for status codes without a known reason phrase (NestJS parity). */
const DEFAULT_REASON_PHRASE = 'Http Exception';

/**
 * Reason phrases for every `HttpStatus` member.
 *
 * Kept local on purpose: the root entry must not depend on `node:http` (`STATUS_CODES`).
 */
const REASON_PHRASES: Readonly<Record<HttpStatus, string>> = {
  [HttpStatus.CONTINUE]: 'Continue',
  [HttpStatus.SWITCHING_PROTOCOLS]: 'Switching Protocols',
  [HttpStatus.PROCESSING]: 'Processing',
  [HttpStatus.EARLYHINTS]: 'Early Hints',
  [HttpStatus.OK]: 'OK',
  [HttpStatus.CREATED]: 'Created',
  [HttpStatus.ACCEPTED]: 'Accepted',
  [HttpStatus.NON_AUTHORITATIVE_INFORMATION]: 'Non-Authoritative Information',
  [HttpStatus.NO_CONTENT]: 'No Content',
  [HttpStatus.RESET_CONTENT]: 'Reset Content',
  [HttpStatus.PARTIAL_CONTENT]: 'Partial Content',
  [HttpStatus.MULTI_STATUS]: 'Multi-Status',
  [HttpStatus.ALREADY_REPORTED]: 'Already Reported',
  [HttpStatus.CONTENT_DIFFERENT]: 'Content Different',
  [HttpStatus.AMBIGUOUS]: 'Multiple Choices',
  [HttpStatus.MOVED_PERMANENTLY]: 'Moved Permanently',
  [HttpStatus.FOUND]: 'Found',
  [HttpStatus.SEE_OTHER]: 'See Other',
  [HttpStatus.NOT_MODIFIED]: 'Not Modified',
  [HttpStatus.TEMPORARY_REDIRECT]: 'Temporary Redirect',
  [HttpStatus.PERMANENT_REDIRECT]: 'Permanent Redirect',
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.PAYMENT_REQUIRED]: 'Payment Required',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.METHOD_NOT_ALLOWED]: 'Method Not Allowed',
  [HttpStatus.NOT_ACCEPTABLE]: 'Not Acceptable',
  [HttpStatus.PROXY_AUTHENTICATION_REQUIRED]: 'Proxy Authentication Required',
  [HttpStatus.REQUEST_TIMEOUT]: 'Request Timeout',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.GONE]: 'Gone',
  [HttpStatus.LENGTH_REQUIRED]: 'Length Required',
  [HttpStatus.PRECONDITION_FAILED]: 'Precondition Failed',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'Payload Too Large',
  [HttpStatus.URI_TOO_LONG]: 'URI Too Long',
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: 'Unsupported Media Type',
  [HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE]: 'Range Not Satisfiable',
  [HttpStatus.EXPECTATION_FAILED]: 'Expectation Failed',
  [HttpStatus.I_AM_A_TEAPOT]: "I'm a Teapot",
  [HttpStatus.MISDIRECTED]: 'Misdirected Request',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
  [HttpStatus.LOCKED]: 'Locked',
  [HttpStatus.FAILED_DEPENDENCY]: 'Failed Dependency',
  [HttpStatus.PRECONDITION_REQUIRED]: 'Precondition Required',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
  [HttpStatus.UNRECOVERABLE_ERROR]: 'Unrecoverable Error',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
  [HttpStatus.NOT_IMPLEMENTED]: 'Not Implemented',
  [HttpStatus.BAD_GATEWAY]: 'Bad Gateway',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
  [HttpStatus.GATEWAY_TIMEOUT]: 'Gateway Timeout',
  [HttpStatus.HTTP_VERSION_NOT_SUPPORTED]: 'HTTP Version Not Supported',
  [HttpStatus.INSUFFICIENT_STORAGE]: 'Insufficient Storage',
  [HttpStatus.LOOP_DETECTED]: 'Loop Detected',
  [HttpStatus.NETWORK_AUTHENTICATION_REQUIRED]: 'Network Authentication Required',
};

const getReasonPhrase = (status: number): string =>
  (REASON_PHRASES as Readonly<Partial<Record<number, string>>>)[status] ?? DEFAULT_REASON_PHRASE;

const resolveMessage = (status: number, response: string | Record<string, unknown> | undefined): string => {
  if (typeof response === 'string') {
    return response;
  }
  if (typeof response === 'object' && response !== null && typeof response['message'] === 'string') {
    return response['message'];
  }
  return getReasonPhrase(status);
};

/**
 * Base HTTP exception with NestJS parity (REQ-051).
 *
 * - `getResponse()` returns the given `response` (same reference for objects) or, when omitted, the status reason
 *   phrase (e.g. `'Bad Request'` for 400; `'Http Exception'` for unknown statuses).
 * - `message` is the string response, the `message` string of an object response, or the reason phrase.
 * - `name` is the concrete class name (e.g. `'NotFoundException'`).
 *
 * Formatting the error body (`nestjs` / `problem-json`) is done by the HTTP runtime, not here.
 */
export class HttpException extends Error {
  readonly status: number;
  readonly #response: string | Record<string, unknown>;

  constructor(status: HttpStatus | number, response?: string | Record<string, unknown>) {
    super(resolveMessage(status, response));
    // Native classes already link the prototype on ES2023; this keeps `instanceof` right if the code is downleveled.
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.status = status;
    this.#response = response ?? getReasonPhrase(status);
  }

  /** Response given to the constructor, or the status reason phrase when omitted. */
  getResponse(): string | Record<string, unknown> {
    return this.#response;
  }
}

/** 400 Bad Request. */
export class BadRequestException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.BAD_REQUEST, message);
  }
}

/** 401 Unauthorized. */
export class UnauthorizedException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.UNAUTHORIZED, message);
  }
}

/** 402 Payment Required. */
export class PaymentRequiredException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.PAYMENT_REQUIRED, message);
  }
}

/** 403 Forbidden. */
export class ForbiddenException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.FORBIDDEN, message);
  }
}

/** 404 Not Found. */
export class NotFoundException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.NOT_FOUND, message);
  }
}

/** 405 Method Not Allowed. */
export class MethodNotAllowedException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.METHOD_NOT_ALLOWED, message);
  }
}

/** 406 Not Acceptable. */
export class NotAcceptableException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.NOT_ACCEPTABLE, message);
  }
}

/** 407 Proxy Authentication Required. */
export class ProxyAuthenticationRequiredException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.PROXY_AUTHENTICATION_REQUIRED, message);
  }
}

/** 408 Request Timeout. */
export class RequestTimeoutException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.REQUEST_TIMEOUT, message);
  }
}

/** 409 Conflict. */
export class ConflictException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.CONFLICT, message);
  }
}

/** 410 Gone. */
export class GoneException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.GONE, message);
  }
}

/** 411 Length Required. */
export class LengthRequiredException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.LENGTH_REQUIRED, message);
  }
}

/** 412 Precondition Failed. */
export class PreconditionFailedException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.PRECONDITION_FAILED, message);
  }
}

/** 413 Payload Too Large. */
export class PayloadTooLargeException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.PAYLOAD_TOO_LARGE, message);
  }
}

/** 414 URI Too Long. */
export class UriTooLongException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.URI_TOO_LONG, message);
  }
}

/** 415 Unsupported Media Type. */
export class UnsupportedMediaTypeException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.UNSUPPORTED_MEDIA_TYPE, message);
  }
}

/** 416 Range Not Satisfiable. */
export class RequestedRangeNotSatisfiableException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE, message);
  }
}

/** 417 Expectation Failed. */
export class ExpectationFailedException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.EXPECTATION_FAILED, message);
  }
}

/** 418 I'm a Teapot. */
export class ImATeapotException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.I_AM_A_TEAPOT, message);
  }
}

/** 421 Misdirected Request. */
export class MisdirectedException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.MISDIRECTED, message);
  }
}

/** 422 Unprocessable Entity. */
export class UnprocessableEntityException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.UNPROCESSABLE_ENTITY, message);
  }
}

/** 423 Locked. */
export class LockedException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.LOCKED, message);
  }
}

/** 424 Failed Dependency. */
export class FailedDependencyException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.FAILED_DEPENDENCY, message);
  }
}

/** 428 Precondition Required. */
export class PreconditionRequiredException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.PRECONDITION_REQUIRED, message);
  }
}

/** 429 Too Many Requests. */
export class TooManyRequestsException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.TOO_MANY_REQUESTS, message);
  }
}

/** 456 Unrecoverable Error. */
export class UnrecoverableErrorException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.UNRECOVERABLE_ERROR, message);
  }
}

/** 500 Internal Server Error. */
export class InternalServerErrorException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.INTERNAL_SERVER_ERROR, message);
  }
}

/** 501 Not Implemented. */
export class NotImplementedException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.NOT_IMPLEMENTED, message);
  }
}

/** 502 Bad Gateway. */
export class BadGatewayException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.BAD_GATEWAY, message);
  }
}

/** 503 Service Unavailable. */
export class ServiceUnavailableException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.SERVICE_UNAVAILABLE, message);
  }
}

/** 504 Gateway Timeout. */
export class GatewayTimeoutException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.GATEWAY_TIMEOUT, message);
  }
}

/** 505 HTTP Version Not Supported. */
export class HttpVersionNotSupportedException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.HTTP_VERSION_NOT_SUPPORTED, message);
  }
}

/** 507 Insufficient Storage. */
export class InsufficientStorageException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.INSUFFICIENT_STORAGE, message);
  }
}

/** 508 Loop Detected. */
export class LoopDetectedException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.LOOP_DETECTED, message);
  }
}

/** 511 Network Authentication Required. */
export class NetworkAuthenticationRequiredException extends HttpException {
  constructor(message?: string | Record<string, unknown>) {
    super(HttpStatus.NETWORK_AUTHENTICATION_REQUIRED, message);
  }
}

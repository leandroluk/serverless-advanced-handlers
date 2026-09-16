import type {Node} from 'ts-morph';

/** Prefix of every build-time diagnostic, so the package is greppable in CI logs. */
const ERROR_PREFIX = '[serverless-advanced-handlers]';

/**
 * Base class of every compiler diagnostic (`SAH1xx` for DI, `SAH2xx`+ for the later compiler features).
 *
 * `code` holds only the numeric part (`'100'`); the rendered message always prefixes it with `SAH`, so the
 * final format is `[serverless-advanced-handlers] SAH<code> <message> at <file>:<line>` (REQ-036, REQ-037).
 *
 * File and line come from the offending `ts-morph` node itself — never passed by hand — so every diagnostic
 * points at real source coordinates.
 */
export class CompilerError extends Error {
  /** Numeric part of the `SAH` code, e.g. `'100'`. */
  readonly code: string;
  /** Absolute path of the source file that owns the offending node. */
  readonly filePath: string;
  /** 1-based line of the offending node inside `filePath`. */
  readonly line: number;

  constructor(code: string, message: string, node: Node) {
    const filePath: string = node.getSourceFile().getFilePath();
    const line = node.getStartLineNumber();

    super(`${ERROR_PREFIX} SAH${code} ${message} at ${filePath}:${line}`);

    this.name = 'CompilerError';
    this.code = code;
    this.filePath = filePath;
    this.line = line;
  }
}

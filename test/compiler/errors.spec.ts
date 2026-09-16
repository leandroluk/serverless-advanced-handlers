import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {Project, type Node, type SourceFile} from 'ts-morph';
import {beforeAll, describe, expect, it} from 'vitest';
import {CompilerError} from '#/compiler/errors';

const fixturePath = fileURLToPath(new URL('fixtures/errors/sample.ts', import.meta.url));

/** Separadores normalizados: o `ts-morph` sempre devolve `/`, o `fileURLToPath` usa `\` no Windows. */
const slashed = (path: string) => path.replaceAll('\\', '/');

/** Linha (1-based) da primeira linha da fixture que contém `text`, lida do disco — não da AST. */
const lineOf = (text: string) => {
  const lines = readFileSync(fixturePath, 'utf8').split(/\r?\n/);
  const index = lines.findIndex(line => line.includes(text));
  expect(index).toBeGreaterThanOrEqual(0);
  return index + 1;
};

describe('CompilerError', () => {
  let sourceFile: SourceFile;

  beforeAll(() => {
    sourceFile = new Project().addSourceFileAtPath(fixturePath);
  });

  it('formata a mensagem como `[serverless-advanced-handlers] SAH<code> <mensagem> at <arquivo>:<linha>`', () => {
    const node = sourceFile.getClassOrThrow('SampleProvider');
    const line = lineOf('export class SampleProvider');

    const error = new CompilerError('101', 'token `SampleProvider` not found in the module scope', node);

    expect(error.message).toBe(
      `[serverless-advanced-handlers] SAH101 token \`SampleProvider\` not found in the module scope ` +
        `at ${sourceFile.getFilePath()}:${line}`
    );
  });

  it('expõe `code`, `filePath` e `line` extraídos do próprio nó', () => {
    const node = sourceFile.getVariableDeclarationOrThrow('SAMPLE_TOKEN');

    const error = new CompilerError('100', 'unsupported element', node);

    expect(error.code).toBe('100');
    expect(error.filePath).toBe(sourceFile.getFilePath());
    expect(slashed(error.filePath)).toBe(slashed(fixturePath));
    expect(error.line).toBe(lineOf('export const SAMPLE_TOKEN'));
  });

  it('usa a linha do nó recebido, não a do início do arquivo', () => {
    const classNode = sourceFile.getClassOrThrow('SampleProvider');
    const methodNode = classNode.getMethodOrThrow('run');
    const parameterNode = classNode.getConstructors()[0]!.getParameters()[0]!;

    const cases: Array<[Node, number]> = [
      [classNode, lineOf('export class SampleProvider')],
      [methodNode, lineOf('run(): string')],
      [parameterNode, lineOf('constructor(readonly token: symbol)')],
    ];

    const lines = cases.map(([node]) => new CompilerError('103', 'x', node).line);

    expect(lines).toEqual(cases.map(([, line]) => line));
    expect(new Set(lines).size).toBe(cases.length);
    for (const [node, line] of cases) {
      expect(new CompilerError('103', 'x', node).message).toBe(
        `[serverless-advanced-handlers] SAH103 x at ${sourceFile.getFilePath()}:${line}`
      );
    }
  });

  it('é um Error lançável e capturável por `instanceof`', () => {
    const node = sourceFile.getClassOrThrow('SampleProvider');
    const error = new CompilerError('102', 'circular dependency A -> B -> A', node);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CompilerError);
    expect(error.name).toBe('CompilerError');
    expect(() => {
      throw error;
    }).toThrow(CompilerError);
    expect(() => {
      throw error;
    }).toThrow(/^\[serverless-advanced-handlers\] SAH102 circular dependency A -> B -> A at .+:\d+$/);
  });

  it('não aceita chamadas fora do contrato `(code, message, node)`', () => {
    const node = sourceFile.getClassOrThrow('SampleProvider');
    const error = new CompilerError('100', 'campos somente-leitura', node);

    // Só checagem estática: as linhas abaixo quebrariam em runtime, por isso nunca são executadas.
    const typeChecksOnly = () => {
      // @ts-expect-error o nó de origem é obrigatório — arquivo/linha nunca são passados à mão
      new CompilerError('100', 'sem nó');
      // @ts-expect-error `code` é string (a parte numérica do SAH), não número
      new CompilerError(100, 'code numérico', node);
      // @ts-expect-error o terceiro argumento é um nó ts-morph, não um caminho de arquivo
      new CompilerError('100', 'caminho no lugar do nó', fixturePath);
      // @ts-expect-error `code` é readonly
      error.code = '999';
      // @ts-expect-error `filePath` é readonly
      error.filePath = 'other.ts';
      // @ts-expect-error `line` é readonly
      error.line = 1;
    };

    expect(typeChecksOnly).toBeTypeOf('function');
    expect(error.code).toBe('100');
  });
});

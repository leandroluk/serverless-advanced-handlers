import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {Project} from 'ts-morph';
import {describe, expect, it} from 'vitest';
import {detectDecoratorMode, type DecoratorMode} from '#/compiler/decorator-mode';

/** Caminho do tsconfig de uma fixture de `test/compiler/fixtures/`. */
const tsconfigOf = (fixture: string) => fileURLToPath(new URL(`fixtures/${fixture}/tsconfig.json`, import.meta.url));

/** Project real (com I/O), carregado a partir do tsconfig da fixture — o `extends` é resolvido pelo ts-morph. */
const projectOf = (fixture: string) => new Project({tsConfigFilePath: tsconfigOf(fixture)});

/** Project sintético, sem tsconfig em disco: isola o detector das opções que ele recebe. */
const projectWithOptions = (experimentalDecorators?: boolean, emitDecoratorMetadata?: boolean) =>
  new Project({useInMemoryFileSystem: true, compilerOptions: {experimentalDecorators, emitDecoratorMetadata}});

describe('detectDecoratorMode', () => {
  it.each([
    ['mode-a', 'A'],
    ['mode-b', 'B'],
    ['mode-c', 'C'],
  ] as const)('fixture %s → modo %s', (fixture, expected) => {
    const project = projectOf(fixture);

    expect(project.getSourceFiles().map(file => file.getBaseName())).toContain('sample.ts');
    expect(detectDecoratorMode(project)).toBe(expected);
  });

  it('lê o tsconfig efetivo: flags herdadas via `extends` valem como se estivessem no arquivo raiz', () => {
    const raw = JSON.parse(readFileSync(tsconfigOf('mode-b-extends'), 'utf8')) as {
      extends: string;
      compilerOptions?: Record<string, unknown>;
    };

    // O arquivo raiz não declara nenhum dos dois flags: lê-lo sozinho daria 'C'.
    expect(raw.extends).toBe('./tsconfig.base.json');
    expect(raw.compilerOptions ?? {}).not.toHaveProperty('experimentalDecorators');
    expect(raw.compilerOptions ?? {}).not.toHaveProperty('emitDecoratorMetadata');

    const project = projectOf('mode-b-extends');

    expect(project.getCompilerOptions()).toMatchObject({experimentalDecorators: true, emitDecoratorMetadata: true});
    expect(detectDecoratorMode(project)).toBe('B');
  });

  it('o override local vence a base herdada: base em B + `emitDecoratorMetadata: false` → modo A', () => {
    const project = projectOf('mode-a-extends');

    expect(project.getCompilerOptions()).toMatchObject({experimentalDecorators: true, emitDecoratorMetadata: false});
    expect(detectDecoratorMode(project)).toBe('A');
  });

  it.each([
    ['ambos os flags', true, true, 'B'],
    ['só experimentalDecorators', true, undefined, 'A'],
    ['experimentalDecorators com metadata desligado', true, false, 'A'],
    ['nenhum dos dois', undefined, undefined, 'C'],
    ['ambos desligados explicitamente', false, false, 'C'],
    ['emitDecoratorMetadata sem experimentalDecorators (config inválida no tsc)', undefined, true, 'C'],
  ] as const)('%s → modo %s', (_label, experimentalDecorators, emitDecoratorMetadata, expected) => {
    expect(detectDecoratorMode(projectWithOptions(experimentalDecorators, emitDecoratorMetadata))).toBe(expected);
  });

  it('devolve exatamente a união `A | B | C`', () => {
    const mode: DecoratorMode = detectDecoratorMode(projectOf('mode-b'));

    // Só checagem estática: as linhas abaixo quebrariam em runtime, por isso nunca são executadas.
    const typeChecksOnly = (project: Project) => {
      // @ts-expect-error o retorno inclui 'C', então não cabe em `'A' | 'B'`
      const narrowed: 'A' | 'B' = detectDecoratorMode(project);
      // @ts-expect-error o Project é obrigatório
      detectDecoratorMode();
      // @ts-expect-error o argumento é um Project, não um caminho de tsconfig
      detectDecoratorMode(tsconfigOf('mode-b'));
      return narrowed;
    };

    expect(['A', 'B', 'C']).toContain(mode);
    expect(mode).toBe('B');
    expect(typeChecksOnly).toBeTypeOf('function');
  });
});

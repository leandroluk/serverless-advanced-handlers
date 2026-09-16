import type {Project} from 'ts-morph';

/**
 * Decorator mode of the user project (INSIGHT §6.6, REQ-004):
 * - `'A'` — legacy decorators (`experimentalDecorators`), bundled with esbuild only;
 * - `'B'` — legacy decorators + `emitDecoratorMetadata` (the framework default);
 * - `'C'` — TC39 decorators (neither flag), parameters declared through type markers.
 */
export type DecoratorMode = 'A' | 'B' | 'C';

/**
 * Detects the decorator mode from the project's *effective* compiler options.
 *
 * `project.getCompilerOptions()` is the resolved configuration — `extends` chains are already merged by
 * `ts-morph`, so a flag inherited from a base tsconfig counts exactly like one written in the root file.
 *
 * `emitDecoratorMetadata` alone is not a valid TypeScript configuration (the compiler only honours it
 * together with `experimentalDecorators`), so it is treated as mode `'C'`.
 */
export function detectDecoratorMode(project: Project): DecoratorMode {
  const {experimentalDecorators, emitDecoratorMetadata} = project.getCompilerOptions();

  if (!experimentalDecorators) {
    return 'C';
  }

  return emitDecoratorMetadata ? 'B' : 'A';
}

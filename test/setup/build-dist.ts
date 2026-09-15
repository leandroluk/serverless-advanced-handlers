import {build} from 'tsdown';

/**
 * Vitest `globalSetup` of the `dist` project: builds the package once per run, so the specs that exercise
 * `dist/` do not depend on a previous `pnpm build`. Projects without specs in the run never trigger it.
 */
export default async function setup(): Promise<void> {
  await build({logLevel: 'warn'});
}

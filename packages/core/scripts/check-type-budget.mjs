import { spawnSync } from 'node:child_process';

/**
 * Upper bound on type instantiations for checking this package's source and
 * tests. Raise it deliberately, in the same change that needs the headroom.
 */
const INSTANTIATION_BUDGET = 4_800_000;

const result = spawnSync('tsc --noEmit --extendedDiagnostics', {
  encoding: 'utf8',
  shell: true,
});
const output = `${result.stdout}${result.stderr}`;

if (result.status !== 0) {
  process.stderr.write(output);
  process.exit(result.status ?? 1);
}

const match = /^Instantiations:\s+(\d+)/m.exec(output);

if (!match) {
  process.stderr.write(output);
  throw new Error('tsc did not report an instantiation count.');
}

const instantiations = Number(match[1]);
const summary = `${instantiations.toLocaleString('en')} of ${INSTANTIATION_BUDGET.toLocaleString('en')} type instantiations`;

if (instantiations > INSTANTIATION_BUDGET) {
  throw new Error(`Type-check budget exceeded: ${summary}.`);
}

process.stdout.write(`Type-check budget ok: ${summary}.\n`);

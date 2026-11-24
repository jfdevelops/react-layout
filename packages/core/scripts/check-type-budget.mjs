import { spawnSync } from 'node:child_process';

/**
 * Upper bound on type instantiations for checking this package's source and
 * tests. Raise it deliberately, in the same change that needs the headroom.
 */
// Includes implicit children contracts, schema regressions, render benchmark consumer types,
// resource renderer inference, segment completion / wildcard factory consumer types,
// conditional descendant selectors, display-name mappings, and typed segment consumer tests.
// Resource-accessor and native-schema integration regressions bring the measured
// total to 5,202,813; retain roughly 2% headroom for this source-and-tests budget.
const instantiationBudget = 5_300_000;

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
const summary = `${instantiations.toLocaleString('en')} of ${instantiationBudget.toLocaleString('en')} type instantiations`;

if (instantiations > instantiationBudget) {
  throw new Error(`Type-check budget exceeded: ${summary}.`);
}

process.stdout.write(`Type-check budget ok: ${summary}.\n`);

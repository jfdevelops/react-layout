import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const maxAttempts = 3;
const retryDelayMs = 10_000;

function publishOnce() {
  const result = spawnSync(
    process.execPath,
    [require.resolve('@changesets/cli/bin.js'), 'publish'],
    {
      stdio: 'inherit',
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.signal) {
    throw new Error(`Publishing terminated by ${result.signal}.`);
  }

  return result.status ?? 1;
}

/** Retries Changesets, which checks npm and skips versions already published on each attempt. */
export async function publishWithRetry({
  publish = publishOnce,
  wait = setTimeout,
  log = console.error,
} = {}) {
  let status = 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    status = publish();

    if (status === 0) {
      return 0;
    }

    if (attempt < maxAttempts) {
      const delay = retryDelayMs * attempt;
      log(
        `Publish attempt ${attempt}/${maxAttempts} failed (exit ${status}); retrying unpublished versions in ${delay / 1000}s.`,
      );
      await wait(delay);
    }
  }

  log(`Publishing failed after ${maxAttempts} attempts (exit ${status}).`);

  return status;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = await publishWithRetry();
}

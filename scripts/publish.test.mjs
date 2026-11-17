import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publishWithRetry } from './publish.mjs';

for (const { name, statuses, expectedStatus, delays } of [
  {
    name: 'stops after an immediately successful publish',
    statuses: [0],
    expectedStatus: 0,
    delays: [],
  },
  {
    name: 'retries a partial failure until publishing succeeds',
    statuses: [1, 0],
    expectedStatus: 0,
    delays: [10_000],
  },
  {
    name: 'preserves the final failure after exhausting retries',
    statuses: [1, 1, 7],
    expectedStatus: 7,
    delays: [10_000, 20_000],
  },
]) {
  test(name, async () => {
    let calls = 0;
    const waits = [];
    const status = await publishWithRetry({
      publish: () => statuses[calls++],
      wait: async (delay) => {
        waits.push(delay);
      },
      log: () => {},
    });
    assert.equal(status, expectedStatus);
    assert.equal(calls, statuses.length);
    assert.deepEqual(waits, delays);
  });
}

test('does not retry an interrupted or unlaunchable publish process', async () => {
  const interrupted = new Error('Publishing terminated by SIGTERM.');
  let calls = 0;

  await assert.rejects(
    publishWithRetry({
      publish: () => {
        calls += 1;
        throw interrupted;
      },
      wait: async () =>
        assert.fail('An interrupted process must not be retried'),
    }),
    interrupted,
  );
  assert.equal(calls, 1);
});

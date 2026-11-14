import { expect, test } from 'vitest';
import { createApplication } from '../../src/app/application';

test('each tick runs injected services in composition order', () => {
  const calls: string[] = [];
  const app = createApplication([
    { run: () => { calls.push('observe'); } },
    { run: () => { calls.push('act'); } },
  ]);
  app.tick();
  app.tick();
  expect(calls).toEqual(['observe', 'act', 'observe', 'act']);
});

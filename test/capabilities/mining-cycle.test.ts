import { expect, test } from 'vitest';
import { createMiningCycle } from '../../src/app/mining-cycle';
import { miningOwner } from '../../src/features/mining/demand';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import type { MiningStation } from '../../src/capabilities/mining/station';
import type { Envelope } from '../../src/persistence/versioned-state';
test('mining cycle reconciles demand, assigns work and executes through reset without duplicate requests', () => {
  const records = new Map<string, Envelope>();
  const port = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => {
    records.set(key, JSON.parse(JSON.stringify(value)) as Envelope);
  } };
  let tick = 1;
  const station: MiningStation = { id: 'source', target: 'source', kind: 'energy', resource: 'energy',
    position: { room: 'W0N0', x: 20, y: 20 }, access: [19, 21].map(x => ({ room: 'W0N0', x, y: 20 })),
    throughput: 4, available: 3000, observedAt: 1, readyAt: 1, risk: 'safe' };
  const units = [{ name: 'miner', owner: miningOwner(station), room: 'W0N0', rate: 2, spawning: false, ticksToLive: 100 }];
  let issued = 0;
  const create = () => createMiningCycle<string>(port, {
    clock: () => tick, unit: name => name, context: name => name, taskLifetime: 100,
    plan: observed => ({ station: observed, home: 'W0N0', body: ['work', 'carry', 'move'], priority: 0,
      travelTicks: 0, marginTicks: 0, requestLifetime: 100 }),
    productionRate: () => 2,
    run: (_unit, _station, _tile, assigned) => { expect(assigned).toBe(true); issued++; return { status: 'running' }; },
  });
  const first = create();
  expect(first.run([{ room: 'W0N0', stations: [station] }], units)[0]!.outcome?.status).toBe('running');
  expect(first.run([{ room: 'W0N0', stations: [station] }], units)).toEqual([]);
  tick++;
  create().run([{ room: 'W0N0', stations: [{ ...station, observedAt: tick }] }], units);
  expect(issued).toBe(2);
  expect(createSpawnQueue(port, 'W0N0').list()).toHaveLength(1);
  tick++;
  expect(create().run([{ room: 'W0N0', stations: [] }], units)[0]!.outcome)
    .toEqual({ status: 'failed', reason: 'station-removed' });
  expect(createSpawnQueue(port, 'W0N0').list()).toEqual([]);
});


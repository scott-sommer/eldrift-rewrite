import { expect, test } from 'vitest';
import { assignMiningTask } from '../../src/app/assign-mining-task';
import { validMiningPayload } from '../../src/app/mining-task';
import { cancelTask } from '../../src/app/cancel-task';
import type { Envelope } from '../../src/persistence/versioned-state';
import type { MiningStation } from '../../src/capabilities/mining/station';
const station: MiningStation = {
  id: 'source', target: 'source', kind: 'energy', resource: 'energy',
  position: { room: 'W0N0', x: 20, y: 20 }, access: [{ room: 'W0N0', x: 21, y: 20 }],
  throughput: 10, available: 3000, observedAt: 1, readyAt: 1, risk: 'safe',
};
const definitions = { mine: { phases: ['work'], validPayload: validMiningPayload } };
function fixture() {
  const records = new Map<string, Envelope>();
  const port = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => {
    records.set(key, JSON.parse(JSON.stringify(value)) as Envelope);
  } };
  return { records, port };
}
test('automatic assignment is persistent, exclusive and admits a replacement after release', () => {
  const { port, records } = fixture();
  const id = assignMiningTask(port, definitions, 'first', station, 1, 100)!;
  expect(id).toBeTruthy();
  const before = JSON.stringify([...records]);
  expect(assignMiningTask(port, definitions, 'first', station, 1, 100)).toBeUndefined();
  expect(JSON.stringify([...records])).toBe(before);
  expect(assignMiningTask(port, definitions, 'replacement', station, 1, 100)).toBeUndefined();
  cancelTask(port, 'first', id, definitions);
  expect(assignMiningTask(port, definitions, 'replacement', station, 2, 100)).toBeTruthy();
});
test('assignment skips occupied candidates and rejects unsafe stations', () => {
  const { port, records } = fixture();
  assignMiningTask(port, definitions, 'first', station, 1, 100);
  const expanded = { ...station, access: [...station.access, { room: 'W0N0', x: 19, y: 20 }] };
  expect(assignMiningTask(port, definitions, 'second', expanded, 1, 100)).toBeTruthy();
  const data = records.get('tasks/second')!.data as { queue: { payload: { tile: { x: number } } }[] };
  expect(data.queue[0]!.payload.tile.x).toBe(19);
  expect(assignMiningTask(port, definitions, 'unsafe', { ...expanded, risk: 'unknown' }, 1, 100)).toBeUndefined();
});
test('failed task persistence releases the acquired lease', () => {
  const { port } = fixture();
  expect(() => assignMiningTask(port, {}, 'bad', station, 1, 100)).toThrow('invalid state');
  expect(assignMiningTask(port, definitions, 'good', station, 1, 100)).toBeTruthy();
});

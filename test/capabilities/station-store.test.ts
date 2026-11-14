import { expect, test } from 'vitest';
import { createStationStore } from '../../src/features/mining/station-store';
import { stationSchema } from '../../src/features/mining/station-schema';
import { createStationAssignments } from '../../src/features/mining/assignments';
import type { MiningStation } from '../../src/capabilities/mining/station';
import type { Envelope } from '../../src/persistence/versioned-state';
const station: MiningStation = {
  id: 'source', target: 'source', kind: 'energy', resource: 'energy',
  position: { room: 'W0N0', x: 20, y: 20 }, access: [{ room: 'W0N0', x: 21, y: 20 }],
  container: 'container', throughput: 10, available: 3000, observedAt: 5, readyAt: 5, risk: 'safe',
};
function fixture() {
  const records = new Map<string, Envelope>();
  const port = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => {
    records.set(key, JSON.parse(JSON.stringify(value)) as Envelope);
  } };
  return { records, port, store: createStationStore(port, 'W0N0') };
}
test('station knowledge survives serialization and no vision without authorizing stale assignments', () => {
  const { port, store } = fixture();
  store.observe(5, [station]);
  expect(store.read(5).visible).toBe(true);
  const reset = createStationStore(port, 'W0N0');
  reset.observe(6, undefined);
  const stale = reset.read(6);
  expect(stale).toMatchObject({ lastSeen: 5, visible: false });
  expect(stale.stations[0]).toMatchObject({ container: 'container', observedAt: 5, risk: 'unknown' });
  expect(createStationAssignments(port).acquire(stale.stations[0]!, station.access[0]!, 'miner', 'task', 6, 5)).toBe(false);
  stale.stations[0]!.position.x = 1;
  expect(reset.read(6).stations[0]!.position.x).toBe(20);
  reset.observe(7, []);
  expect(reset.read(7)).toEqual({ lastSeen: 7, visible: true, stations: [] });
});
test('observations reject chronology and room mismatches without replacing durable knowledge', () => {
  const { store } = fixture();
  store.observe(5, [station]);
  expect(() => store.observe(4, [])).toThrow('older');
  expect(() => store.read(4)).toThrow('future');
  expect(() => store.observe(6, [station])).toThrow('invalid state');
  expect(() => store.observe(5, [{ ...station, position: { ...station.position, room: 'E0N0' } }])).toThrow('invalid state');
  expect(store.read(5).stations).toEqual([station]);
});
test('station schema rejects malformed identities, arrays, duplicate targets and excessive records', () => {
  const schema = stationSchema('W0N0');
  const valid = (stations: unknown, lastSeen: unknown = 5) => schema.valid({ stations, lastSeen });
  expect(valid([station])).toBe(true);
  for (const change of [{ id: 1 }, { container: 1 }, { access: {} }, { observedAt: 6 }, { position: null }]) {
    expect(valid([{ ...station, ...change }])).toBe(false);
  }
  expect(valid([station, { ...station, id: 'another' }])).toBe(false);
  expect(valid([station], null)).toBe(false);
  expect(schema.valid({ stations: [] })).toBe(false);
  expect(valid(Array.from({ length: 33 }, (_, index) => ({ ...station, id: String(index), target: String(index) })))).toBe(false);
});
test('future schema versions cannot be read or overwritten', () => {
  const { records, store } = fixture();
  records.set('mining-stations/W0N0', { owner: 'mining', version: 2, data: {} });
  expect(() => store.read(5)).toThrow('future version');
  expect(() => store.observe(5, [])).toThrow('future version');
  expect(records.get('mining-stations/W0N0')!.version).toBe(2);
});


import { expect, test } from 'vitest';
import { selectMinerEnergy } from '../../src/features/work/miner-energy';
import type { MiningStation } from '../../src/capabilities/mining/station';
import type { CollectionSource } from '../../src/capabilities/resources/collection';
const position = { room: 'W0N1', x: 10, y: 10 };
const station: MiningStation = { id: 'source', target: 'source', kind: 'energy', resource: 'energy', position, access: [],
  container: 'deposit', throughput: 10, available: 3000, observedAt: 1, readyAt: 1, risk: 'safe' };
const source = (id: string, kind: CollectionSource['kind'], stock: number, x = 10): CollectionSource =>
  ({ id, kind, stock, available: stock, position: { ...position, x } });
test('assigned collection uses adjacent drops then matching deposit before distant drops', () => {
  const deposit = source('deposit', 'container', 80);
  const distant = source('distant', 'drop', 80, 20);
  expect(selectMinerEnergy([distant, deposit, source('near', 'drop', 5)], position, 50, station, 50000)?.source.id).toBe('near');
  expect(selectMinerEnergy([distant, deposit, source('other', 'container', 100)], position, 50, station, 50000)?.source.id).toBe('deposit');
  expect(selectMinerEnergy([distant], position, 50, station, 50000)?.source.id).toBe('distant');
});
test('assigned collection respects shared claims, storage reserve and source room', () => {
  const deposit = source('deposit', 'container', 80);
  expect(selectMinerEnergy([{ ...deposit, available: 3 }], position, 50, station, 0)?.amount).toBe(3);
  expect(selectMinerEnergy([{ ...deposit, position: { ...position, room: 'E0N1' } }], position, 50, station, 0)).toBeUndefined();
  expect(selectMinerEnergy([source('store', 'storage', 50000)], position, 50, { ...station, storage: 'store' }, 50000)).toBeUndefined();
  expect(selectMinerEnergy([source('store', 'storage', 50010)], position, 50, { ...station, storage: 'store' }, 50000)?.amount).toBe(10);
});

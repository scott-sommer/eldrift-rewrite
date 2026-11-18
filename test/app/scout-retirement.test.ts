import { expect, test } from 'vitest';
import { withScoutRetirement } from '../../src/app/scout-retirement';
import { createCreepMaintenance } from '../../src/app/creep-maintenance';
import { createScoutHistoryStore } from '../../src/features/intel/scout-store';
import { createMemoryPort } from '../../src/adapters/screeps/memory';

test('complete roster presence survives hidden home/target and same-name replacement retires the old identity', () => {
  let tick = 10, roster = [{ id: 'old', name: 'scout' }];
  const state = createMemoryPort(() => memory), memory = {}, history = createScoutHistoryStore(state);
  history.heartbeat({ id: 'old', name: 'scout', home: 'W1N1', position: { room: 'W2N1', x: 20, y: 21 },
    seenAt: 10, expiresAt: 100, target: 'W3N1' });
  const retired: string[] = [];
  const maintain = createCreepMaintenance(state, () => roster, {}, withScoutRetirement(state, id => retired.push(id), () => tick));
  maintain();
  tick = 11; maintain();
  expect(history.read().losses).toEqual([]);
  roster = [{ id: 'replacement', name: 'scout' }]; tick = 12;
  maintain();
  expect(retired).toEqual(['old']);
  expect(history.read().losses).toMatchObject([{ id: 'old', detectedAt: 12 }]);
});

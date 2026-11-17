import { expect, test } from 'vitest';
import { stageDefenseEconomy, defenseEconomyEligible } from '../../src/features/planning/defense-economy';
import { createPlanProposal } from '../../src/features/planning/plan-proposal';
import { createPlanStore } from '../../src/features/planning/plan-store';
import { validEntry } from '../../src/features/planning/plan-model';
import type { Envelope } from '../../src/persistence/versioned-state';
test('economy staging annotates only new barriers and respects exact reserve/RCL boundaries', () => {
  const manual = { type: 'rampart', position: { x: 24, y: 25 }, rcl: 2, priority: -10, minimumStoredEnergy: 100 };
  const fresh = { type: 'rampart', position: { x: 26, y: 25 }, rcl: 6, priority: 50 };
  const result = stageDefenseEconomy([manual], [manual, fresh], 50000);
  expect(result[0]).toEqual(manual);
  expect(result[1]).toEqual({ ...fresh, minimumStoredEnergy: 50000 });
  expect(defenseEconomyEligible(result[1]!, 5, 100000)).toBe(false);
  expect(defenseEconomyEligible(result[1]!, 6, 49999)).toBe(false);
  expect(defenseEconomyEligible(result[1]!, 6, 50000)).toBe(true);
  result[0]!.position.x = 0;
  expect(manual.position.x).toBe(24);
  expect(() => stageDefenseEconomy([], [], -1)).toThrow('reserve');
});
test('energy requirements survive proposal, persisted commit and store recreation; invalid metadata rejects', () => {
  const entries = [
    { type: 'spawn', position: { x: 24, y: 25 }, rcl: 1, priority: -100 },
    { type: 'storage', position: { x: 25, y: 25 }, rcl: 4, priority: -90 },
    { type: 'rampart', position: { x: 26, y: 25 }, rcl: 6, priority: 50, minimumStoredEnergy: 50000 }];
  const proposal = createPlanProposal({ strategy: 'standard', entries,
    provenance: { candidateId: 'a', strategyVersion: 'v1', observation: 'obs', policy: 'policy', generatedAt: 1,
      anchor: { x: 25, y: 25 }, transform: 0,
      costs: { hauling: 0, service: 0, capacityShortfall: 0, swamps: 0, defense: 1, migration: 0 } } });
  const records: Record<string, Envelope> = {}, types = ['spawn', 'storage', 'rampart'];
  const port = { read: (key: string) => records[key], write: (key: string, value: Envelope) => { records[key] = value; } };
  const store = createPlanStore(port, 'W0N1', types);
  expect(store.commit(0, proposal, { tick: 2, observation: 'obs', policy: 'policy' }, () => true).ok).toBe(true);
  const restored = createPlanStore(port, 'W0N1', types).read();
  expect(restored.entries.find(entry => entry.type === 'rampart')?.minimumStoredEnergy).toBe(50000);
  for (const value of [-1, 1.5, NaN]) {
    expect(validEntry({ ...restored.entries[0], minimumStoredEnergy: value }, new Set(types))).toBe(false);
  }
});

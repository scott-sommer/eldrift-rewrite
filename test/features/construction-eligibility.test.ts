import { expect, test } from 'vitest';
import { constructionEligibility } from '../../src/features/construction/eligibility';
import type { ConstructionObservation } from '../../src/features/construction/model';
import type { PlanEntry } from '../../src/features/planning/plan-model';
const entry: PlanEntry = { type: 'rampart', x: 25, y: 25, rcl: 6, priority: 50, source: 'strategy', minimumStoredEnergy: 50000 };
function observation(): ConstructionObservation {
  return { level: 6, storedEnergy: 50000, terrain: Array(2500).fill('plain'), objects: [], structures: [], sites: [],
    completed: new Set(), temporarilyOccupied: new Set(), limits: { rampart: Array(9).fill(2500), spawn: Array(9).fill(3) },
    globalSites: 0, globalSiteLimit: 100, roomSiteLimit: 2 };
}
test('existing built/site objects remain present despite exhausted budgets or downgraded staging', () => {
  const observed = { ...observation(), level: 1, storedEnergy: 0, globalSites: 100 };
  const object = { id: 'a', type: 'rampart', x: 25, y: 25, owned: true };
  expect(constructionEligibility(entry, { ...observed, structures: [object] }).status).toBe('built');
  expect(constructionEligibility(entry, { ...observed, sites: [object] }).status).toBe('site-existing');
});
test('RCL and energy reserve gates unlock on exact boundaries without changing plan entries', () => {
  const observed = observation(), before = JSON.stringify(entry);
  expect(constructionEligibility(entry, { ...observed, level: 5 })).toEqual({ status: 'waiting-for-RCL', reason: 'entry-stage' });
  expect(constructionEligibility(entry, { ...observed, storedEnergy: 49999 })).toEqual({ status: 'waiting-for-budget', reason: 'energy-reserve' });
  expect(constructionEligibility(entry, observed).status).toBe('eligible');
  expect(JSON.stringify(entry)).toBe(before);
});
test('invalid static placements and occupied/dependency states have distinct retry reasons', () => {
  const observed = observation(), terrain = [...observed.terrain];
  terrain[25 * 50 + 25] = 'wall';
  expect(constructionEligibility(entry, { ...observed, terrain })).toEqual({ status: 'invalid', reason: 'wall' });
  expect(constructionEligibility({ ...entry, type: 'unknown' }, observed).status).toBe('invalid');
  expect(constructionEligibility(entry, { ...observed, temporarilyOccupied: new Set(['25:25']) }).reason).toBe('occupied');
  const dependent = { ...entry, dependencies: ['spawn:24:25'] };
  expect(constructionEligibility(dependent, observed).reason).toBe('dependency');
  expect(constructionEligibility(dependent, { ...observed, completed: new Set(dependent.dependencies) }).status).toBe('eligible');
});
test('site inventories count physical IDs once while global and room caps remain independent', () => {
  const observed = observation(), site = { id: 'site', type: 'spawn', x: 24, y: 25, owned: true };
  expect(constructionEligibility(entry, { ...observed, sites: [site, site] }).status).toBe('eligible');
  expect(constructionEligibility(entry, { ...observed, sites: [site], roomSiteLimit: 1 }).reason).toBe('site-limit');
  expect(constructionEligibility(entry, { ...observed, globalSites: 100 }).reason).toBe('site-limit');
  const spawn = { ...entry, type: 'spawn', minimumStoredEnergy: 0 };
  expect(constructionEligibility(spawn, { ...observed, sites: [site, site], limits: { spawn: Array(9).fill(2) } }).status).toBe('eligible');
  expect(constructionEligibility(spawn, { ...observed, sites: [site, site], limits: { spawn: Array(9).fill(1) } }).reason).toBe('structure-limit');
});

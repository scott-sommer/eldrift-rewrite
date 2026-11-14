import { expect, test } from 'vitest';
import { minerStep } from '../../src/capabilities/mining/step';
import type { MinerView, MinerPorts } from '../../src/capabilities/mining/step';
import { energyReadiness, mineralReadiness } from '../../src/capabilities/mining/production';
const view: MinerView = { tick: 1, spawning: false, unsafe: false, target: 'visible', assigned: true, atStation: true,
  carried: 0, energy: 0, freeCapacity: 50, carryCapacity: 50, establish: false, repair: false };
function fixture() {
  const actions: string[] = [];
  const act = (name: string) => { actions.push(name); return { status: 'issued' as const, code: 0 }; };
  const ports: MinerPorts = {
    approach: () => { actions.push('travel'); return { status: 'done' }; },
    retreat: () => { actions.push('retreat'); return { status: 'done' }; },
    establish: () => { actions.push('establish'); return { status: 'done' }; },
    repair: () => act('repair'), handoff: () => act('handoff'), harvest: () => act('harvest'),
    rejected: code => ({ status: 'failed', reason: String(code) }),
  };
  return { actions, ports };
}
test('danger preempts station work; unseen travel differs from confirmed target loss', () => {
  const { actions, ports } = fixture();
  expect(minerStep({ ...view, unsafe: true }, ports).status).toBe('running');
  expect(minerStep({ ...view, target: 'unseen' }, ports).status).toBe('running');
  expect(minerStep({ ...view, target: 'missing' }, ports)).toMatchObject({ status: 'failed' });
  expect(actions).toEqual(['retreat', 'travel']);
});
test('station establishment, maintenance, handoff and production use one action per step', () => {
  const { actions, ports } = fixture();
  minerStep({ ...view, establish: true, energy: 10 }, ports);
  minerStep({ ...view, repair: true, energy: 10 }, ports);
  minerStep({ ...view, carried: 50, freeCapacity: 0 }, ports);
  minerStep(view, ports);
  minerStep({ ...view, carryCapacity: 0, freeCapacity: 0 }, ports);
  expect(actions).toEqual(['establish', 'repair', 'handoff', 'harvest', 'harvest']);
});
test('energy and mineral readiness have explicit independent depletion/cooldown rules', () => {
  const production = { tick: 10, available: 0, readyAt: 100 };
  expect(energyReadiness(production)).toMatchObject({ reason: 'source-depleted', retryAt: 100 });
  expect(mineralReadiness(production, 'missing', 0)).toMatchObject({ reason: 'extractor-missing' });
  expect(mineralReadiness({ ...production, available: 10 }, 'ready', 5)).toMatchObject({ reason: 'extractor-cooldown', retryAt: 15 });
  const { actions, ports } = fixture();
  expect(minerStep({ ...view, readiness: energyReadiness(production)! }, ports).status).toBe('blocked');
  expect(actions).toEqual([]);
});

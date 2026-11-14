import { expect, test } from 'vitest';
import { harvestStep } from '../../src/capabilities/harvesting/step';
import type { HarvestPorts } from '../../src/capabilities/harvesting/step';
const view = { tick: 1, stored: 0, goal: 2, target: 'visible' as const, inRange: true, available: 100, retryAt: 5 };
const ports: HarvestPorts = { approach: () => ({ status: 'running' }), harvest: () => ({ status: 'issued', code: 0 }), rejected: code => ({ status: 'failed', reason: `code:${code}` }) };
test('accepted harvest stays running until subsequent stored-resource observation meets goal', () => {
  expect(harvestStep(view, ports).status).toBe('running');
  expect(harvestStep({ ...view, tick: 2, stored: 2 }, ports).status).toBe('done');
});
test('unseen targets request travel while confirmed missing targets fail and depletion sleeps', () => {
  expect(harvestStep({ ...view, target: 'unseen' }, ports).status).toBe('running');
  expect(harvestStep({ ...view, target: 'missing' }, ports)).toEqual({ status: 'failed', reason: 'target-missing' });
  expect(harvestStep({ ...view, available: 0 }, ports)).toEqual({ status: 'blocked', reason: 'source-empty', retryAt: 5 });
});

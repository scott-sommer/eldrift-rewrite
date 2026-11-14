import { expect, test } from 'vitest';
import { workStep } from '../../src/capabilities/work/step';
import { harvestStep } from '../../src/capabilities/harvesting/step';
import type { WorkPorts } from '../../src/capabilities/work/step';
const view = { tick: 1, complete: false, target: 'visible' as const, inRange: true, energy: 10 };
const ports: WorkPorts = { approach: () => ({ status: 'done' }), act: () => ({ status: 'issued', code: 0 }), rejected: code => ({ status: 'failed', reason: String(code) }) };
test('work completes from observations rather than accepted intents or completed travel', () => {
  expect(workStep(view, ports).status).toBe('running');
  expect(workStep({ ...view, inRange: false }, ports).status).toBe('running');
  expect(workStep({ ...view, complete: true, target: 'missing' }, ports).status).toBe('done');
  expect(workStep({ ...view, energy: 0 }, ports)).toEqual({ status: 'blocked', reason: 'energy-empty', retryAt: 2 });
});
test('arriving near a harvest source does not complete its collection task', () => {
  expect(harvestStep({ tick: 1, stored: 0, goal: 2, target: 'unseen', inRange: false, available: 0, retryAt: 2 }, { ...ports, harvest: ports.act }).status).toBe('running');
});

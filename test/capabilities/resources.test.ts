import { expect, test } from 'vitest';
import { transferStep } from '../../src/capabilities/resources/step';
import type { TransferPorts } from '../../src/capabilities/resources/step';
const view = { tick: 1, complete: false, target: 'visible' as const, inRange: true, available: 100, capacity: 50, remaining: 30 };
test('transfer amount respects supply, capacity and task remainder without completing on intent', () => {
  const amounts: number[] = [];
  const ports: TransferPorts = { approach: () => ({ status: 'done' }), transfer: amount => { amounts.push(amount); return { status: 'issued', code: 0 }; }, rejected: code => ({ status: 'failed', reason: String(code) }) };
  expect(transferStep(view, ports).status).toBe('running');
  transferStep({ ...view, available: 5 }, ports);
  transferStep({ ...view, capacity: 2 }, ports);
  expect(amounts).toEqual([30, 5, 2]);
  expect(transferStep({ ...view, complete: true }, ports).status).toBe('done');
  expect(transferStep({ ...view, inRange: false }, ports).status).toBe('running');
  expect(amounts).toHaveLength(3);
});
test('empty source, full destination and missing target do not issue intents', () => {
  const ports: TransferPorts = { approach: () => ({ status: 'running' }), transfer: () => { throw new Error('unexpected intent'); }, rejected: () => ({ status: 'failed', reason: 'unexpected' }) };
  expect(transferStep({ ...view, available: 0 }, ports)).toMatchObject({ status: 'blocked', reason: 'source-empty' });
  expect(transferStep({ ...view, capacity: 0 }, ports)).toMatchObject({ status: 'blocked', reason: 'destination-full' });
  expect(transferStep({ ...view, target: 'missing' }, ports)).toMatchObject({ status: 'failed', reason: 'target-missing' });
});

import { expect, test } from 'vitest';
import { movementStep } from '../../src/capabilities/movement/step';
import type { MovementPorts } from '../../src/capabilities/movement/step';
const view = { tick: 1, position: { room: 'W0N0', x: 10, y: 10 }, destination: { room: 'W0N0', x: 11, y: 10 }, range: 0, fatigue: 0, allowPartial: false };
test('accepted movement awaits observed arrival and incomplete routes require explicit policy', () => {
  let calls = 0;
  const ports: MovementPorts = { route: () => ({ status: 'ready', direction: 3, incomplete: true }), move: () => { calls++; return { status: 'issued', code: 0 }; }, rejected: code => ({ status: 'failed', reason: String(code) }) };
  expect(movementStep(view, ports)).toMatchObject({ status: 'blocked', reason: 'incomplete-path' });
  expect(calls).toBe(0);
  expect(movementStep({ ...view, allowPartial: true }, ports).status).toBe('running');
  expect(movementStep({ ...view, position: view.destination }, ports).status).toBe('done');
  expect(calls).toBe(1);
});
test('fatigue avoids route work and equal coordinates in another room are not arrival', () => {
  const ports: MovementPorts = { route: () => { throw new Error('route called'); }, move: () => ({ status: 'issued', code: 0 }), rejected: () => ({ status: 'running' }) };
  expect(movementStep({ ...view, fatigue: 1 }, ports)).toMatchObject({ reason: 'fatigue' });
  expect(() => movementStep({ ...view, position: { ...view.destination, room: 'E0N0' } }, ports)).toThrow('route called');
});

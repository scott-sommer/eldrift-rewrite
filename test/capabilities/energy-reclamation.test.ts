import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { generateEnergyRequests } from '../../src/features/logistics/energy-requests';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { reserveTransfer } from '../../src/features/logistics/reserve-transfer';
import { createLinkReservations } from '../../src/features/logistics/links/reservations';
import { logisticsPool } from '../../src/capabilities/logistics/request';
const policy = { owner: 'room', lifetime: 100, maximumQuantity: 200, maximumNewRequests: 10 };
const endpoint = (id: string, amount: number, priority = 0) => ({ id, amount, priority, position: { room: 'home', x: 10, y: 10 } });
const donor = { ...endpoint('link', 50, 1), allowedSinks: ['spawn', 'extension'] };
function fixture() {
  const memory = {};
  const state = createMemoryPort(() => memory);
  return { state, queue: createLogisticsRequests(state, 'home') };
}
test('ordinary stock is preferred and reclamation cannot feed towers even when nearer or higher priority', () => {
  const { state, queue } = fixture();
  generateEnergyRequests(state, 'home', 1, [donor, endpoint('container', 10)],
    [endpoint('spawn', 10), endpoint('extension', 30, 1), endpoint('tower', 50, 2)], policy);
  expect(queue.pending(1).map(item => [item.source, item.sink, item.quantity])).toEqual([
    ['container', 'spawn', 10], ['link', 'extension', 30],
  ]);
});
test('disabling donors cancels unassigned work while preserving an admitted transfer until settlement', () => {
  const { state, queue } = fixture();
  generateEnergyRequests(state, 'home', 1, [donor], [endpoint('spawn', 30), endpoint('extension', 20, 1)], policy);
  const request = queue.pending(1)[0]!;
  expect(reserveTransfer(state, request, { holder: 'courier', scope: 'task', phase: 'collect', maximum: 30, expiresAt: 10 },
    { sourceStock: 50, sinkFree: 30, sinkPool: 'spawn-capacity' }, 1)).toBe(30);
  generateEnergyRequests(state, 'home', 2, [], [endpoint('spawn', 30), endpoint('extension', 20, 1)], policy);
  expect(queue.pending(2).map(item => item.sink)).toEqual(['spawn']);
});
test('native link commitments and reclamation couriers share the same stock budget', () => {
  const { state, queue } = fixture();
  const capacity = (id: string) => logisticsPool('capacity', id, 'energy');
  const links = ['link', 'destination'].map((id, index) => ({ id, position: { room: 'home', x: 10 + index, y: 10 },
    energy: index ? 0 : 50, capacity: 800, cooldown: 0, active: true }));
  createLinkReservations(state, 1, 'links:home', capacity).issue({ source: 'link', sink: 'destination', amount: 20, expectedReceived: 19 },
    links, () => ({ status: 'issued', code: 0 }));
  generateEnergyRequests(state, 'home', 1, [donor], [endpoint('spawn', 50)], policy);
  const request = queue.pending(1)[0]!;
  const availability = { sourceStock: 50, sinkFree: 50, sinkPool: capacity('spawn') };
  const booking = { holder: 'first', scope: 'first-task', phase: 'collect' as const, maximum: 50, expiresAt: 10 };
  expect(reserveTransfer(state, request, booking, availability, 1)).toBe(30);
  expect(reserveTransfer(state, request, { ...booking, holder: 'second', scope: 'second-task' }, availability, 1)).toBe(0);
});

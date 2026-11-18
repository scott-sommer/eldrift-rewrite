import { roomCoordinates } from '../../core/geometry/room-grid';
import { requireIntelClock } from './freshness';
import type { IntelTraversalPolicy } from './traversal-model';
export function validateTraversalPolicy(policy: IntelTraversalPolicy, tick: number): void {
  requireIntelClock(tick, policy.maximumAge);
  validateMode(policy);
  validateBounds(policy);
  for (const username of [policy.username, ...policy.allies]) {
    if (typeof username !== 'string' || !username.trim()) throw new Error('Invalid traversal identity');
  }
  for (const room of policy.blockedRooms) roomCoordinates(room);
  for (const [room, until] of Object.entries(policy.avoidUntil)) {
    roomCoordinates(room);
    if (!Number.isSafeInteger(until) || until < 0) throw new Error('Invalid traversal avoidance clock');
  }
}
function validateMode(policy: IntelTraversalPolicy): void {
  if (!['exploration','known-safe'].includes(policy.mode) || typeof policy.allowKeeper !== 'boolean') throw new Error('Invalid traversal mode');
}
function validateBounds(policy: IntelTraversalPolicy): void {
  if (!Number.isSafeInteger(policy.maximumRooms) || policy.maximumRooms < 0 || policy.maximumRooms > 10000) throw new Error('Invalid traversal room budget');
  for (const cost of [policy.unknownCost, policy.staleCost, policy.keeperCost]) {
    if (!Number.isSafeInteger(cost) || cost < 1 || cost > 1000000) throw new Error('Invalid traversal cost');
  }
}

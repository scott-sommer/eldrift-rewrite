import type { UpgradeMember, UpgradeRotationObservation, UpgradeRotationPlan, UpgradeRotationPolicy, UpgradeRotationState } from './upgrade-rotation-model';
import { defaultUpgradeRotation } from './upgrade-rotation-model';
import { upgradeRotationSchema } from './upgrade-rotation-schema';
/** Complete, identity-based roster required; loss of visibility alone cannot retire a member. */
export function planUpgradeRotation(previous: UpgradeRotationState, observation: UpgradeRotationObservation,
  policy: UpgradeRotationPolicy = defaultUpgradeRotation): UpgradeRotationPlan {
  validate(previous, observation, policy);
  const shortage = observation.empireEnergy < policy.empireReserve + (observation.ownedRooms - 1) * policy.perOtherRoomReserve;
  if (observation.tick === previous.lastTick) return { state: previous, rotated: false, shortage };
  const state = reconcileRoster(previous, observation.members);
  state.lastTick = observation.tick;
  state.boosting = state.boosting.filter(id => !observation.settledBoosts.includes(id));
  if (!observation.enabled) return { state, rotated: false, shortage };
  if (shortage) state.retiring = state.slots.map(slot => slot.unit);
  const rotated = !shortage && finishRenewal(state, observation.members, policy.renewUntil);
  if (!shortage && !state.renewing && !rotated) beginRenewal(state, observation.members, policy.thresholds);
  return { state, rotated, shortage, ...commands(state, shortage) };
}
function commands(state: UpgradeRotationState, shortage: boolean) {
  if (shortage) return {};
  const renew = state.renewing && !state.retiring.includes(state.renewing) ? state.renewing : undefined;
  const boost = state.slots.find(slot => slot.slot === 0 && state.boosting.includes(slot.unit) && !state.retiring.includes(slot.unit))?.unit;
  return { ...(renew ? { renew } : {}), ...(boost ? { boost } : {}) };
}
function reconcileRoster(previous: UpgradeRotationState, members: readonly UpgradeMember[]): UpgradeRotationState {
  const ids = new Set(members.map(member => member.id));
  const unchanged = sameRoster(previous, ids) && (previous.slots.some(slot => slot.slot === 6) || previous.boosting.length > 0);
  const slots = unchanged ? previous.slots.map(slot => ({ ...slot })) : [...members].sort((a, b) => a.ttl - b.ttl || a.id.localeCompare(b.id))
    .map((member, index) => ({ unit: member.id, slot: 6 - index }));
  const renewing = slots.find(slot => slot.slot === 6)?.unit === previous.renewing ? previous.renewing : null;
  return { ...previous, slots, renewing, boosting: previous.boosting.filter(id => ids.has(id)), retiring: previous.retiring.filter(id => ids.has(id)) };
}
function sameRoster(previous: UpgradeRotationState, ids: ReadonlySet<string>): boolean {
  return previous.slots.length === ids.size && previous.slots.every(slot => ids.has(slot.unit));
}
function finishRenewal(state: UpgradeRotationState, members: readonly UpgradeMember[], threshold: number): boolean {
  if (state.renewing && state.retiring.includes(state.renewing)) return false;
  if (!state.renewing || (members.find(member => member.id === state.renewing)?.ttl ?? 0) <= threshold) return false;
  if (!state.boosting.includes(state.renewing)) state.boosting.push(state.renewing);
  state.renewing = null;
  state.slots = state.slots.map(slot => ({ ...slot, slot: (slot.slot + 1) % 7 }));
  return true;
}
function beginRenewal(state: UpgradeRotationState, members: readonly UpgradeMember[], thresholds: readonly number[]): void {
  const oldest = state.slots.find(slot => slot.slot === 6);
  if (!oldest || state.retiring.includes(oldest.unit)) return;
  const ttl = new Map(members.map(member => [member.id, member.ttl]));
  if (state.slots.some(slot => ttl.get(slot.unit)! < thresholds[slot.slot]!)) state.renewing = oldest.unit;
}
function validate(state: UpgradeRotationState, observation: UpgradeRotationObservation, policy: UpgradeRotationPolicy): void {
  if (!upgradeRotationSchema(state.room).valid(state)) throw new Error('Invalid upgrade rotation state');
  if (!Number.isSafeInteger(observation.tick) || observation.tick < 0 || observation.tick < state.lastTick) throw new Error('Invalid upgrade rotation tick');
  if (![observation.empireEnergy, observation.ownedRooms].every(value => Number.isSafeInteger(value) && value >= 0) || observation.ownedRooms < 1) throw new Error('Invalid empire observation');
  validateRoster(observation.members);
  validatePolicy(policy);
}
function validateRoster(members: readonly UpgradeMember[]): void {
  if (members.length > 7 || new Set(members.map(member => member.id)).size !== members.length
    || members.some(member => typeof member.id !== 'string' || !member.id || !Number.isSafeInteger(member.ttl) || member.ttl < 0)) throw new Error('Invalid upgrade roster');
}
function validatePolicy(policy: UpgradeRotationPolicy): void {
  if (policy.thresholds.length !== 7 || ![...policy.thresholds, policy.renewUntil, policy.empireReserve, policy.perOtherRoomReserve]
    .every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid upgrade rotation policy');
}

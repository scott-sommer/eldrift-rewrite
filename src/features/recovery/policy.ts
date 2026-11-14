import type { RecoveryRoom, RecoveryDonor, RecoverySupport } from '../../capabilities/recovery/assessment';
export interface RecoveryPolicy {
  interval: number; enterEnergy: number; exitEnergy: number; minimumLevel: number;
  donorMinimumEnergy: number; donorMaximumDistance: number; supportBatch: number;
}
export const defaultRecoveryPolicy: Readonly<RecoveryPolicy> = Object.freeze({ interval: 250, enterEnergy: 10000,
  exitEnergy: 50000, minimumLevel: 5, donorMinimumEnergy: 75000, donorMaximumDistance: 4, supportBatch: 25000 });
export function validateRecoveryPolicy(policy: RecoveryPolicy): void {
  if (!Object.values(policy).every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid recovery policy');
  if (policy.interval < 1 || policy.supportBatch < 1 || policy.enterEnergy >= policy.exitEnergy) throw new Error('Invalid recovery thresholds');
  if (policy.minimumLevel < 1 || policy.minimumLevel > 8) throw new Error('Invalid recovery controller level');
}
export function recoveryEligible(room: RecoveryRoom, policy: RecoveryPolicy): boolean { return room.owned && room.level >= policy.minimumLevel; }
export function assessRecovery(room: RecoveryRoom, previouslyActive: boolean, donors: readonly RecoveryDonor[], policy: RecoveryPolicy) {
  validateRecoveryPolicy(policy);
  validateRoom(room);
  const active = recoveryEligible(room, policy) && room.energy < (previouslyActive ? policy.exitEnergy : policy.enterEnergy);
  return { active, donors: active ? selectDonors(room.room, donors, policy) : [] };
}
function selectDonors(target: string, donors: readonly RecoveryDonor[], policy: RecoveryPolicy): RecoverySupport[] {
  for (const donor of donors) {
    validateRoom(donor);
    if (!Number.isSafeInteger(donor.distance) || donor.distance < 0) throw new Error('Invalid donor distance');
  }
  if (new Set(donors.map(donor => donor.room)).size !== donors.length) throw new Error('Duplicate recovery donor');
  return donors.filter(donor => donor.owned && donor.room !== target && donor.energy > policy.donorMinimumEnergy && donor.distance <= policy.donorMaximumDistance)
    .sort((a, b) => a.distance - b.distance || b.energy - a.energy || a.room.localeCompare(b.room))
    .slice(0, 100).map(donor => ({ room: donor.room, distance: donor.distance, requestedEnergy: policy.supportBatch }));
}
function validateRoom(room: RecoveryRoom): void {
  if (!room.room || typeof room.owned !== 'boolean') throw new Error('Invalid recovery room');
  if (![room.energy, room.level].every(value => Number.isSafeInteger(value) && value >= 0) || room.level > 8) throw new Error('Invalid recovery observation');
}

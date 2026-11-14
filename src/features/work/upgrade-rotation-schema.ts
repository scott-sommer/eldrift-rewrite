import type { StateSchema } from '../../persistence/versioned-state';
import type { UpgradeRotationState, UpgradeSlot } from './upgrade-rotation-model';
import { initialUpgradeRotation } from './upgrade-rotation-model';
export function upgradeRotationSchema(room: string): StateSchema<UpgradeRotationState> {
  if (!room) throw new Error('Invalid upgrade room');
  return { owner: 'upgrade-room', version: 1, migrations: {}, initial: () => initialUpgradeRotation(room),
    valid(value: unknown): value is UpgradeRotationState {
      if (!value || typeof value !== 'object') return false;
      const state = value as UpgradeRotationState;
      if (state.room !== room || !Number.isSafeInteger(state.lastTick) || state.lastTick < -1 || !validSlots(state.slots)) return false;
      const members = new Set(state.slots.map(slot => slot.unit));
      return (state.renewing === null || members.has(state.renewing)) && subset(state.boosting, members) && subset(state.retiring, members);
    } };
}
function validSlots(slots: UpgradeSlot[]): boolean {
  return Array.isArray(slots) && slots.length <= 7 && slots.every(slot => slot && typeof slot.unit === 'string' && slot.unit.length > 0
    && Number.isSafeInteger(slot.slot) && slot.slot >= 0 && slot.slot < 7)
    && new Set(slots.map(slot => slot.unit)).size === slots.length && new Set(slots.map(slot => slot.slot)).size === slots.length;
}
function subset(values: string[], members: ReadonlySet<string>): boolean {
  return Array.isArray(values) && new Set(values).size === values.length && values.every(value => members.has(value));
}

export interface UpgradeMember { id: string; ttl: number }
export interface UpgradeSlot { unit: string; slot: number }
export interface UpgradeRotationState {
  room: string; slots: UpgradeSlot[]; renewing: string | null; boosting: string[]; retiring: string[]; lastTick: number;
}
export interface UpgradeRotationPolicy { thresholds: readonly number[]; renewUntil: number; empireReserve: number; perOtherRoomReserve: number }
export const defaultUpgradeRotation: UpgradeRotationPolicy = {
  thresholds: [0, 800, 640, 480, 320, 160, 10], renewUntil: 1490, empireReserve: 2600000, perOtherRoomReserve: 100000,
};
export interface UpgradeRotationObservation {
  tick: number; enabled: boolean; members: readonly UpgradeMember[]; empireEnergy: number; ownedRooms: number;
  settledBoosts: readonly string[];
}
export interface UpgradeRotationPlan {
  state: UpgradeRotationState; renew?: string; boost?: string; rotated: boolean; shortage: boolean;
}
export function initialUpgradeRotation(room: string): UpgradeRotationState {
  return { room, slots: [], renewing: null, boosting: [], retiring: [], lastTick: -1 };
}

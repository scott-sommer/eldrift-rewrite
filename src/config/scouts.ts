import { roomCoordinates } from '../core/geometry/room-grid';
export interface ScoutConfig {
  scoutMinimumRcl: number; scoutDemandInterval: number;
  scoutsEnabled: boolean; scoutSpawningEnabled: boolean; scoutCount: number; scoutAssignedRooms: readonly string[];
  scoutDepth: number; scoutExtendedDepth: number; scoutExtendedProgress: number;
  scoutExplorationReads: number; scoutExplorationRooms: number; scoutPlanCpuBudget: number; scoutControlCpuBudget: number;
  scoutStabilizeTicks: number; scoutHostileAvoidTicks: number; scoutRouteAvoidTicks: number; scoutThreatRange: number;
  scoutAllowKeeper: boolean; scoutMaximumRouteRooms: number; scoutDangerWindow: number; scoutDangerLosses: number;
  scoutStuckTicks: number; scoutOscillationLimit: number;
}
export const scoutDefaults: Readonly<ScoutConfig> = Object.freeze({
  scoutMinimumRcl: 2, scoutDemandInterval: 10,
  scoutsEnabled: false, scoutSpawningEnabled: false, scoutCount: 1, scoutAssignedRooms: Object.freeze([]),
  scoutDepth: 2, scoutExtendedDepth: 4, scoutExtendedProgress: 0.1,
  scoutExplorationReads: 32, scoutExplorationRooms: 32, scoutPlanCpuBudget: 3, scoutControlCpuBudget: 5,
  scoutStabilizeTicks: 1, scoutHostileAvoidTicks: 1500, scoutRouteAvoidTicks: 1000, scoutThreatRange: 5,
  scoutAllowKeeper: true, scoutMaximumRouteRooms: 16, scoutDangerWindow: 5000, scoutDangerLosses: 2,
  scoutStuckTicks: 3, scoutOscillationLimit: 2,
});
function integer(value: unknown, minimum: number, maximum: number): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}
function assigned(value: unknown): boolean {
  if (!Array.isArray(value) || value.length > 64) return false;
  try { for (const room of value) roomCoordinates(room); return true; } catch { return false; }
}
function cpu(value: unknown): boolean { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000; }
export const scoutValidators: { [K in keyof ScoutConfig]: (value: unknown) => boolean } = {
  scoutMinimumRcl: value => integer(value,1,8), scoutDemandInterval: value => integer(value,1,1000000),
  scoutsEnabled: value => typeof value === 'boolean', scoutSpawningEnabled: value => typeof value === 'boolean',
  scoutCount: value => integer(value,0,20), scoutAssignedRooms: assigned,
  scoutDepth: value => integer(value,0,8), scoutExtendedDepth: value => integer(value,0,8),
  scoutExtendedProgress: value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1,
  scoutExplorationReads: value => integer(value,0,1000), scoutExplorationRooms: value => integer(value,0,1000),
  scoutPlanCpuBudget: cpu, scoutControlCpuBudget: cpu,
  scoutStabilizeTicks: value => integer(value,0,100), scoutHostileAvoidTicks: value => integer(value,0,1000000),
  scoutRouteAvoidTicks: value => integer(value,0,1000000), scoutThreatRange: value => integer(value,0,15),
  scoutAllowKeeper: value => typeof value === 'boolean', scoutMaximumRouteRooms: value => integer(value,1,64),
  scoutDangerWindow: value => integer(value,0,1000000), scoutDangerLosses: value => integer(value,1,512),
  scoutStuckTicks: value => integer(value,1,100), scoutOscillationLimit: value => integer(value,1,100),
};

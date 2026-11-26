import { remoteStartupDefaults, remoteStartupValidators } from './remote-startup';
import type { RemoteStartupConfig } from './remote-startup';
import { roomCoordinates } from '../core/geometry/room-grid';
export interface RemoteConfig extends RemoteStartupConfig {
  remoteAdaptiveEnabled: boolean; remoteAdaptiveInitialSources: number; remoteAdaptiveMaximumSources: number;
  remoteAdaptiveInterval: number; remoteAdaptiveIncreaseAt: number; remoteAdaptiveDecreaseAt: number;
  remoteReservationEnabled: boolean; remoteReservationBodyBudget: number; remoteReservationMinimumBuffer: number; remoteReservationMargin: number;
  remoteReservationQuoteRooms: number; remoteReservationEnergyReserve: number;
  remoteWorkersEnabled: boolean; remoteSpawningEnabled: boolean; remoteWorkerCpuBudget: number; remoteWorkerMaximumUnits: number;
  remoteConstructionWorkersEnabled: boolean; remoteConstructionMaximumWorkers: number; remoteConstructionBodyBudget: number; remoteConstructionEnergyReserve: number;
  remoteMinimumBatch: number; remoteTripLifetime: number; remoteSpawnRequestLifetime: number;
  remoteManagementEnabled: boolean; remoteMinimumRcl: number; remoteDepth: number;
  remoteDiscoveryReads: number; remoteDiscoveryRooms: number; remoteDiscoveryRefresh: number;
  remoteScanRooms: number; remoteScanSources: number; remoteCpuBudget: number;
  remoteMaximumPathOps: number; remoteMaximumRouteRooms: number;
  remoteLeaseLifetime: number; remoteScanLifetime: number; remoteReassessInterval: number;
  remoteMaximumSlots: number; remoteMaximumHaulers: number; remoteMaximumSpawnLoad: number;
  remoteMinimumNetYield: number; remoteCompletionBonus: number; remoteSelectionOrder: 'nearest' | 'net-yield';
  remoteMinerBodyBudget: number; remoteCourierBodyBudget: number;
  remoteRoadsEnabled: boolean; remoteContainersEnabled: boolean; remoteBlockedRooms: readonly string[];
  remoteRiskPerTick: number; remoteInfrastructurePerTick: number;
}
export const remoteDefaults: Readonly<RemoteConfig> = Object.freeze({
  ...remoteStartupDefaults,
  remoteAdaptiveEnabled: false,remoteAdaptiveInitialSources: 3,remoteAdaptiveMaximumSources: 128,
  remoteAdaptiveInterval: 1500,remoteAdaptiveIncreaseAt: .75,remoteAdaptiveDecreaseAt: .90,
  remoteReservationEnabled: false,remoteReservationBodyBudget: 5200,remoteReservationMinimumBuffer: 100,remoteReservationMargin: 25,
  remoteReservationQuoteRooms: 1,remoteReservationEnergyReserve: 50000,
  remoteWorkersEnabled: false,remoteSpawningEnabled: false,remoteWorkerCpuBudget: 5,remoteWorkerMaximumUnits: 40,
  remoteConstructionWorkersEnabled: false,remoteConstructionMaximumWorkers: 2,remoteConstructionBodyBudget: 300,remoteConstructionEnergyReserve: 50000,
  remoteMinimumBatch: 20,remoteTripLifetime: 200,remoteSpawnRequestLifetime: 100,
  remoteManagementEnabled: false,remoteMinimumRcl: 3,remoteDepth: 2,
  remoteDiscoveryReads: 4,remoteDiscoveryRooms: 64,remoteDiscoveryRefresh: 100,
  remoteScanRooms: 2,remoteScanSources: 1,remoteCpuBudget: 5,
  remoteMaximumPathOps: 4000,remoteMaximumRouteRooms: 8,
  remoteLeaseLifetime: 200,remoteScanLifetime: 50,remoteReassessInterval: 50,
  remoteMaximumSlots: 2,remoteMaximumHaulers: 20,remoteMaximumSpawnLoad: 0.5,
  remoteMinimumNetYield: 0.1,remoteCompletionBonus: 0.15,remoteSelectionOrder: 'nearest',
  remoteMinerBodyBudget: 550,remoteCourierBodyBudget: 200,
  remoteRoadsEnabled: false,remoteContainersEnabled: true,remoteBlockedRooms: Object.freeze([]),
  remoteRiskPerTick: 0,remoteInfrastructurePerTick: 0.05,
});
const integer = (value: unknown, minimum: number, maximum: number) => typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
const rate = (value: unknown, maximum: number) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= maximum;
const enabled = (value: unknown) => typeof value === 'boolean';
function rooms(value: unknown): boolean {
  if (!Array.isArray(value) || value.length > 128) return false;
  try { for (const name of value) roomCoordinates(name); return new Set(value).size === value.length; } catch { return false; }
}
export const remoteValidators: { [K in keyof RemoteConfig]: (value: unknown) => boolean } = {
  ...remoteStartupValidators,
  remoteAdaptiveEnabled: enabled,remoteAdaptiveInitialSources: value => integer(value,0,128),remoteAdaptiveMaximumSources: value => integer(value,0,128),
  remoteAdaptiveInterval: value => integer(value,1,1000000),remoteAdaptiveIncreaseAt: value => rate(value,1),remoteAdaptiveDecreaseAt: value => rate(value,1),
  remoteReservationEnabled: enabled,remoteReservationBodyBudget: value => integer(value,0,5200),remoteReservationMinimumBuffer: value => integer(value,0,4999),remoteReservationMargin: value => integer(value,0,600),
  remoteReservationQuoteRooms: value => integer(value,0,64),remoteReservationEnergyReserve: value => integer(value,0,1000000),
  remoteWorkersEnabled: enabled,remoteSpawningEnabled: enabled,remoteWorkerCpuBudget: value => rate(value,1000),remoteWorkerMaximumUnits: value => integer(value,0,100),
  remoteConstructionWorkersEnabled: enabled,remoteConstructionMaximumWorkers: value => integer(value,0,20),remoteConstructionBodyBudget: value => integer(value,0,3000),remoteConstructionEnergyReserve: value => integer(value,0,1000000),
  remoteMinimumBatch: value => integer(value,1,10000),remoteTripLifetime: value => integer(value,1,1000000),remoteSpawnRequestLifetime: value => integer(value,1,1000000),
  remoteManagementEnabled: enabled,remoteMinimumRcl: value => integer(value,1,8),remoteDepth: value => integer(value,0,8),
  remoteDiscoveryReads: value => integer(value,0,1000),remoteDiscoveryRooms: value => integer(value,0,64),remoteDiscoveryRefresh: value => integer(value,1,1000000),
  remoteScanRooms: value => integer(value,0,64),remoteScanSources: value => integer(value,0,128),remoteCpuBudget: value => rate(value,1000),
  remoteMaximumPathOps: value => integer(value,1,100000),remoteMaximumRouteRooms: value => integer(value,1,64),
  remoteLeaseLifetime: value => integer(value,1,1000000),remoteScanLifetime: value => integer(value,1,1000000),remoteReassessInterval: value => integer(value,1,1000000),
  remoteMaximumSlots: value => integer(value,0,128),remoteMaximumHaulers: value => integer(value,0,1000),remoteMaximumSpawnLoad: value => rate(value,1000),
  remoteMinimumNetYield: value => rate(value,10000),remoteCompletionBonus: value => rate(value,10),remoteSelectionOrder: value => ['nearest','net-yield'].includes(String(value)),
  remoteMinerBodyBudget: value => integer(value,200,10000),remoteCourierBodyBudget: value => integer(value,100,2600),
  remoteRoadsEnabled: enabled,remoteContainersEnabled: enabled,remoteBlockedRooms: rooms,
  remoteRiskPerTick: value => rate(value,10000),remoteInfrastructurePerTick: value => rate(value,10000),
};

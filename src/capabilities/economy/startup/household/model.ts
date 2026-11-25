import type { HouseholdLaborInput, HouseholdLaborCheckpoint } from './labor/model';
import type { StartupSpawnInput } from '../spawn-model';
import type { StartupRedistributionInput, StartupRedistributionCheckpoint } from '../redistribution/model';
import type { StartupCashFlow } from '../cash-model';
import type { StartupTimelineCheckpoint } from '../checkpoints/timeline';
export interface StartupHouseholdInput { labor?: HouseholdLaborInput; endpointCapacity?: number; spawning: StartupSpawnInput; endpointEnergy: number; redistribution: StartupRedistributionInput }
export interface StartupHouseholdCheckpoint {
  format: 1 | 2 | 3 | 4 | 5; labor?: HouseholdLaborCheckpoint; binding: string; through: number;
  endpointEnergy: number; endpointSpentEnergy: number; endpointReceivedEnergy: number;
  spawning: StartupTimelineCheckpoint; redistribution: StartupRedistributionCheckpoint; losses: StartupCashFlow[];
}

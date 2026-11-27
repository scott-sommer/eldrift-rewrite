import type { StartupDeliveryInput } from '../delivery-model';
import type { StartupSpawnInput } from '../spawn-model';
import type { StartupConstructionInput } from '../construction-model';
import type { StartupProjectMotionInput } from '../courier-trips/project-model';
export interface StartupHomeSourceInput extends Omit<StartupDeliveryInput,'project' | 'homeSink' | 'household' | 'shared' | 'motion'> {
  id: string;
  requests: readonly string[];
  project: Omit<StartupConstructionInput,'spawning'>;
  motion: StartupProjectMotionInput;
}
export interface StartupHomeProjectInput {
  spawning: StartupSpawnInput;
  sink: StartupDeliveryInput['homeSink'];
  household?: StartupDeliveryInput['household'];
  sources: readonly StartupHomeSourceInput[];
}

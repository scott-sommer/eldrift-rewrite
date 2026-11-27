import { createNativePaidHomeObservation } from '../../src/app/remotes/startup/home-observation/native';
import { pipelinePaidContexts } from './pipeline-paid-contexts';
import type { StatePort } from '../../src/persistence/versioned-state';
import type { RuntimeConfig } from '../../src/config/model';
import type { PaidHomeObservationResult } from '../../src/app/remotes/startup/home-observation/model';
interface HomeMemory extends Memory { pipelinePaidHomeSnapshots?: { tick: number; result: PaidHomeObservationResult }[] }
/** After activated-route observation, before any actor/clearance dispatch. */
export function snapshotPipelinePaidHome(state: StatePort,config: Readonly<RuntimeConfig>): void {
  if (Game.time < 150 || Game.time > 155) return;
  const readOnly: StatePort = { read: key => state.read(key),write() { throw new Error('Home snapshot wrote owner state'); } };
  const groups = pipelinePaidContexts(readOnly,config,() => true); if (!groups) throw new Error('Home snapshot missing qualified paid groups');
  const result = createNativePaidHomeObservation(readOnly,{ availableEnergy: (_home,energy) => energy })({ home: 'W0N1',endpoint: groups[0]!.cohort.endpoint,groups,requireActivated: true });
  ((Memory as HomeMemory).pipelinePaidHomeSnapshots ??= []).push({ tick: Game.time,result });
}

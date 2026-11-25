import { copyPlain } from '../../../../core/plain-data';
import { observePopulation } from '../../../../adapters/screeps/population';
import { peekState } from '../../../../persistence/versioned-state';
import { stateKey } from '../../../../persistence/state-key';
import { spawnQueueSchema } from '../../../../features/population/spawn-schema';
import { proposeStartupLaborDemand } from '../../../../features/work/startup-demand';
import { createNativeLaborSelection } from './labor-selection';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { NativeLaborSelection } from './labor-selection';
import type { StartupLaborDemand } from '../../../../features/work/startup-demand-model';
export interface NativeLaborWorkforce extends Omit<NativeLaborSelection,'request' | 'mode'> {
  demand: Omit<StartupLaborDemand,'observedAt' | 'horizon' | 'level'>;
}
/** Read-only missing-worker planning; native queue publication needs separate current admission. */
export function createNativeLaborWorkforce(state: StatePort, maximumOps: number) {
  const select = createNativeLaborSelection(state,maximumOps);
  return (seed: NativeLaborWorkforce, maximumFrames: number, guard: () => boolean = () => true) => {
    if (!guard()) return deferred('admission');
    const home = Game.rooms[seed.demand.home];
    if (!home?.controller?.my || seed.base.project.spawning.room !== home.name) return deferred('home');
    const demand = copyPlain({ ...seed.demand,level: home.controller.level,observedAt: Game.time,horizon: seed.laborPolicy.horizon });
    const observe = () => proposeStartupLaborDemand(demand,observePopulation(),peekState(state,stateKey('spawning',home.name),spawnQueueSchema(home.name))?.requests ?? []);
    const planned = observe();
    if (planned.status !== 'proposed') return deferred(planned.reason);
    const selected = select({ ...seed,request: planned.request,mode: demand.mode },maximumFrames,guard);
    if (selected.status !== 'ready') return selected;
    return { ...selected,current: () => selected.current() && observe().status === 'proposed' };
  };
}
function deferred(reason: string) { return { status: 'deferred' as const,reason,previewFrames: 0 }; }

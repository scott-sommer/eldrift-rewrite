import { validateHomeMinerTasks } from './tasks';
import { createRemoteAssignmentStore } from '../../../../features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../../../features/remotes/assignment-demand';
import { createRemoteMiningCycle } from '../../mining-cycle';
import { createForecastMiningWork } from './work';
import { queueForecastMiningBuild } from './build';
import { queueForecastMiningRepair } from './repair';
import { readHomeMinerRoster } from './roster';
import type { HomeHaulingInput,HomeWorldShared } from '../hauling-state/world/model';
import type { HomeMiningEnvironment } from './environment';
/** Scheduled actors use current assignment/task owners; no opening demand or productive loop is replayed. */
export function createHomeMiningActors(home: HomeHaulingInput,shared: HomeWorldShared,environment: HomeMiningEnvironment) {
  const assignments = createRemoteAssignmentStore(shared.state),clock = shared.inventory.tick;
  const actors = new Map(readHomeMinerRoster(home).map(actor => {
    const { worker,paid,plan,profile,expiresAt } = actor;
    const service = createForecastMiningWork(shared,{ ...environment,tile: () => plan.station,harvestPower: () => profile.harvestPower,
      build: (worker,site,id) => queueForecastMiningBuild(shared,worker,site,id,profile.build,environment.buildAllowed(worker,site)),
      repair: (worker,target,id) => queueForecastMiningRepair(shared,worker,target,id,profile.repair),
    });
    const cycle = createRemoteMiningCycle(shared.state,{ home: home.home,owner: paid.owner },{ ...service,
      eligible: worker => !shared.body(worker.unit).spawning && environment.eligible(worker),
      cargo: worker => shared.inventory.observe(worker.unit)!.usedCapacity,lifetime: () => expiresAt-clock(),
      mode(worker,definitions) {
        const mode = environment.mode(worker,definitions);
        if (mode === 'bank' && !environment.banking.haul) throw new Error('Missing forecast miner banking behavior');
        return mode;
      },
    },environment.banking);
    validateHomeMinerTasks(shared.state,home.home,worker,actor.demand,cycle.definitions);
    return [worker.name,{ worker,plan,cycle }] as const;
  }));
  return {
    names: new Set(actors.keys()),
    visit(name: string): void {
      const actor = actors.get(name); if (!actor) throw new Error('Unknown home mining actor');
      const assignment = assignments.owner(actor.plan.room,clock());
      const demand = assignment?.home === home.home ? remoteAssignmentDemands(assignment,clock()).find(demand => demand.kind === 'mine' && demand.source === actor.plan.source) : undefined;
      actor.cycle.run(actor.worker,demand?.kind === 'mine' ? demand : undefined);
    },
  };
}

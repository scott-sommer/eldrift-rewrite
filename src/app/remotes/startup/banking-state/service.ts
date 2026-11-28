import { roomCoordinates } from '../../../../core/geometry/room-grid';
import { createRemoteBankingControl } from '../../banking-control';
import { createRemoteBankingWork } from '../../banking-work';
import { createHaulingTaskBehavior } from '../../../hauling-task';
import { settleHaulingTask } from '../../../settle-hauling-task';
import { createForecastHaulingTransfer } from '../hauling-state/transfer';
import { recoverForecastCargo } from './recovery';
import type { HomeWorldShared } from '../hauling-state/world/model';
import type { ForecastMinerWorker } from '../mining-state/model';
import type { ForecastBankingEnvironment } from './model';
/** Native banking control with real private hauling reservations, journals and physical transfer effects. */
export function createForecastRemoteBanking(home: string,shared: HomeWorldShared,environment: ForecastBankingEnvironment,policy: { terminalReserve: number }) {
  roomCoordinates(home);
  const reserve = policy.terminalReserve;
  if (!Number.isSafeInteger(reserve) || reserve < 0) throw new Error('Invalid forecast banking terminal reserve');
  const identity = (worker: ForecastMinerWorker) => ({ name: worker.name,id: worker.unit });
  const transfer = createForecastHaulingTransfer<ForecastMinerWorker>(shared.state,shared.inventory,shared.arbiter,{ ...environment,position: worker => shared.body(worker.unit).position });
  const hauling = createHaulingTaskBehavior(shared.state,{ identity,
    view(worker,payload) {
      if (payload.request.resource !== 'energy') throw new Error('Forecast banking requires a physical resource model');
      return { ...transfer.view(worker,payload),sourceStock: 0,sinkRoom: home };
    },
    execution: (worker,binding) => ({ ...transfer.execution(worker,binding),observe: attempt => transfer.observe(worker,attempt) }),
  });
  const behavior = createRemoteBankingWork(shared.state,home,hauling,{
    name: (worker: ForecastMinerWorker) => worker.name,homeReady: environment.homeReady,routeReady: environment.routeReady,retire: environment.retire,
    atHome: worker => shared.body(worker.unit).position.room === home,work: (worker,task) => hauling.handlers(task).work!(worker),
  });
  const control = createRemoteBankingControl(shared.state,home,{ identity,
    eligible: worker => !shared.body(worker.unit).spawning && environment.eligible(worker),
    cargo: worker => shared.inventory.observe(worker.unit)!.usedCapacity,
    interior(worker) { const p = shared.body(worker.unit).position; return p.room === home && p.x > 0 && p.x < 49 && p.y > 0 && p.y < 49; },
    homeReady: environment.homeReady,routeReady: environment.routeReady,
    settle: (worker,definitions) => settleHaulingTask(shared.state,definitions,identity(worker),attempt => transfer.observe(worker,attempt)),
    recover: (worker,definitions) => recoverForecastCargo(home,shared,environment,reserve,worker,definitions),
  });
  return { ...control,definitions: { haul: behavior } };
}

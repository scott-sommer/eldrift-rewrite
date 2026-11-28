import { recoveryPriority } from '../../../../features/logistics/recovery-destinations';
import { assignCargoRecovery } from '../../../assign-cargo-recovery';
import type { TaskDefinition } from '../../../../persistence/tasks/schema';
import type { HomeWorldShared } from '../hauling-state/world/model';
import type { ForecastMinerWorker } from '../mining-state/model';
import type { ForecastBankingEnvironment } from './model';
export function recoverForecastCargo(home: string,shared: HomeWorldShared,environment: ForecastBankingEnvironment,terminalReserve: number,worker: ForecastMinerWorker,definitions: Readonly<Record<string,TaskDefinition>>): void {
  const unit = shared.inventory.observe(worker.unit)!;
  if (unit.usedCapacity === 0) return;
  if (unit.usedCapacity !== unit.energy) throw new Error('Mixed forecast cargo requires a physical resource model');
  if (!environment.acceptsEnergy(worker)) return;
  for (const sink of rankedSinks(home,shared,environment,terminalReserve,worker)) {
    if (assignCargoRecovery(shared.state,definitions,{ home,name: worker.name,unitId: worker.unit,tick: shared.inventory.tick(),resource: 'energy',quantity: unit.energy,
      sink: sink.id,sinkRoom: home,sinkFree: sink.free,sinkPool: environment.capacityPool(sink.id) })) return;
  }
}
function rankedSinks(home: string,shared: HomeWorldShared,environment: ForecastBankingEnvironment,reserve: number,worker: ForecastMinerWorker) {
  return environment.destinations(worker).flatMap(sink => {
    if (sink.room !== home || !sink.active || !environment.acceptsSink(worker,sink)) return [];
    const physical = shared.inventory.observe(sink.id); if (!physical) return [];
    const priority = recoveryPriority({ kind: sink.kind,owned: sink.owned,free: physical.freeEnergyCapacity },'energy',reserve);
    return priority === undefined ? [] : [{ id: sink.id,priority,free: physical.freeEnergyCapacity }];
  }).sort((a,b) => a.priority-b.priority || a.id.localeCompare(b.id));
}

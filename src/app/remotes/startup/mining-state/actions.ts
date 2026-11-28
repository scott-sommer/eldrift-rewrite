import { economySlots } from '../../../../capabilities/actions/economy-slots';
import { issuedOutcome } from '../../../../capabilities/actions/outcome';
import { framedIdentity } from '../../../../core/framed-identity';
import type { HomeWorldShared } from '../hauling-state/world/model';
import type { ForecastMinerWorker,ForecastMiningPorts,ForecastMiningInfrastructure } from './model';
/** Work compatibility and queued effects are shared with the native economic action adapter. */
export function forecastMiningActions(shared: HomeWorldShared,ports: ForecastMiningPorts,worker: ForecastMinerWorker,owner: string,source: string,infrastructure: ForecastMiningInfrastructure) {
  const clock = shared.inventory.tick;
  const rejected = (code: number) => ({ status: 'blocked' as const,reason: 'mining-intent:'+code,retryAt: clock()+1 });
  const id = (kind: string) => 'mining:'+framedIdentity([worker.unit,owner,kind,String(clock())]);
  const issue = (kind: 'harvest' | 'transfer' | 'build' | 'repair',invoke: (id: string) => number) => shared.arbiter.issue(worker.name,owner,economySlots(kind),() => invoke(id(kind)),code => code === 0);
  return {
    establish: () => issuedOutcome(issue('build',id => ports.build(worker,infrastructure.site!,id)),clock(),rejected),
    repair: () => issue('repair',id => ports.repair(worker,infrastructure.repair!.id,id)),
    handoff: () => infrastructure.sink ? issue('transfer',id => {
      const cargo = shared.inventory.observe(worker.unit)!,target = shared.inventory.observe(infrastructure.sink!);
      if (cargo.energy < 1) return -6;
      if (!target || target.freeEnergyCapacity < 1) return -8;
      shared.inventory.queue({ id,kind: 'transfer',source: worker.unit,target: infrastructure.sink!,amount: Math.min(cargo.energy,target.freeEnergyCapacity) }); return 0;
    }) : { status: 'rejected' as const,code: -8 },
    harvest: () => issue('harvest',id => {
      const amount = ports.harvestPower(worker);
      if (amount === 0) return -12;
      shared.inventory.queue({ id,kind: 'harvest',source,target: worker.unit,amount,position: shared.body(worker.unit).position }); return 0;
    }),rejected,
  };
}

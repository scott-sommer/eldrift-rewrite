import { minerStep } from '../../../../capabilities/mining/step';
import { energyReadiness } from '../../../../capabilities/mining/production';
import { shouldRepairMining } from '../../../../capabilities/mining/repair-policy';
import { createStationAssignments } from '../../../../features/mining/assignments';
import { withinRange } from '../../../../capabilities/movement/path-model';
import type { MiningStation } from '../../../../capabilities/mining/station';
import type { Position } from '../../../../capabilities/movement/step';
import { forecastMiningActions } from './actions';
import type { RemoteMiningTaskPorts } from '../../mining-task';
import type { HomeWorldShared } from '../hauling-state/world/model';
import type { ForecastMinerWorker,ForecastMiningPorts } from './model';
/** Same station selector and reservations as native work, over one shared private physical frame. */
export function createForecastMiningWork(shared: HomeWorldShared,ports: ForecastMiningPorts): RemoteMiningTaskPorts<ForecastMinerWorker> {
  const assignments = createStationAssignments(shared.state),clock = shared.inventory.tick;
  function release(owner: string): void { if (shared.state.read('reservations/empire') !== undefined) assignments.release(owner); }
  function retire(worker: ForecastMinerWorker,home: string,owner: string) { release(owner); return ports.retire(worker,home,owner); }
  function waitAtHome(worker: ForecastMinerWorker,home: string,owner: string) { retire(worker,home,owner); return { status: 'running' as const }; }
  function work(worker: ForecastMinerWorker,owner: string,station: MiningStation,tile: Position,home: string) {
    const unit = shared.inventory.observe(worker.unit); if (!unit) throw new Error('Missing forecast miner store');
    const tick = clock(),source = shared.inventory.source(station.target),infrastructure = ports.infrastructure(worker,station),repair = infrastructure.repair;
    const readiness = source && energyReadiness({ tick,available: source.energy,readyAt: tick+(source.regenerationIn ?? 0) });
    return minerStep({ tick,spawning: false,unsafe: false,target: source ? 'visible' : 'missing',assigned: true,atStation: withinRange(shared.body(worker.unit).position,tile,0),
      carried: unit.usedCapacity,energy: unit.energy,freeCapacity: unit.capacity-unit.usedCapacity,carryCapacity: unit.capacity,establish: !!infrastructure.site,
      repair: !!repair && shouldRepairMining(repair.hits,repair.hitsMax,unit.energy,source?.energy === 0),...(readiness ? { readiness } : {}) },{
      ...forecastMiningActions(shared,ports,worker,owner,station.target,infrastructure),approach: () => ports.move(worker,owner,tile),retreat: () => retire(worker,home,owner),
    });
  }
  return { clock,unit: worker => worker.name,retire,
    service(worker,demand,owner) {
      const body = shared.body(worker.unit),tick = clock(); if (body.spawning) return { status: 'running' };
      if (!ports.allowed(worker,demand)) return waitAtHome(worker,demand.home,owner);
      const tile = ports.tile(worker,demand);
      if (body.position.room !== demand.room) { release(owner); ports.move(worker,owner,tile); return { status: 'running' }; }
      const station = ports.station(worker,demand); if (!station) return waitAtHome(worker,demand.home,owner);
      if (!assignments.acquire(station,tile,worker.name,owner,tick,2)) return { status: 'running' };
      if (station.kind !== 'energy' || station.target !== demand.source) throw new Error('Forecast mining source identity mismatch');
      return work(worker,owner,station,tile,demand.home);
    },
  };
}

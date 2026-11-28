import { constructionSite } from './construction-site';
import { queueForecastMiningBuild } from '../../src/app/remotes/startup/mining-state/build';
import type { Outcome } from '../../src/core/execution/model';
import { vi } from 'vitest';
import { paidMinerControlFixture } from './paid-miner-control';
import { createHomeHaulingWorld } from '../../src/app/remotes/startup/hauling-state/world/driver';
import type { HomeWorldShared,HomeWorldEnvironment,HomeWorldOperation } from '../../src/app/remotes/startup/hauling-state/world/model';
import { createForecastMiningWork } from '../../src/app/remotes/startup/mining-state/work';
import { queueForecastMiningRepair } from '../../src/app/remotes/startup/mining-state/repair';
import type { ForecastMinerWorker } from '../../src/app/remotes/startup/mining-state/model';
import type { ForecastMiningInfrastructure } from '../../src/app/remotes/startup/mining-state/model';
import { createRemoteMiningCycle } from '../../src/app/remotes/mining-cycle';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../src/features/remotes/assignment-demand';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import type { MiningStation } from '../../src/capabilities/mining/station';
export function paidMiningCycleFixture({ cargo = 48,sourceEnergy = 100,regenerationIn = null,containerEnergy = 0,withoutClaim = false,openingRoom,repairHits = 250000,constructionRemaining,containerDecay }: { cargo?: number; sourceEnergy?: number; regenerationIn?: number | null; containerEnergy?: number; withoutClaim?: boolean; openingRoom?: string; repairHits?: number; constructionRemaining?: number; containerDecay?: { remaining: number; interval: number; amount: number } } = {}) {
  const f = paidMinerControlFixture(),input = f.input,worker = { name: 'miner',unit: 'miner-id' },tile = f.plan.station;
  if (withoutClaim) { input.control!.reservations = null; input.sources[0]!.miners[0]!.observation.claim = null; input.sources[0]!.miners[0]!.observation.assigned = false; }
  input.workers[0]!.energy = cargo; input.workers[0]!.usedCapacity = cargo;
  input.bodies[0]!.inventory = { ...input.bodies[0]!.inventory,energy: cargo,usedCapacity: cargo,freeEnergyCapacity: 50-cargo };
  input.sources[0]!.miners[0]!.observation.energy = cargo;
  input.bodies[0]!.repair = { workParts: 1,boostBonuses: [0] };
  input.inventories.push({ id: 'container',room: tile.room,active: true,capacityPool: logisticsPool('capacity','container'),energy: containerEnergy,usedCapacity: containerEnergy,capacity: 2000,freeEnergyCapacity: 2000-containerEnergy });
  input.ecology = { sources: [{ id: 'source',position: { ...tile,y: tile.y+1 },energy: sourceEnergy,capacity: 1500,regenerationIn,regenerationTicks: 300 }],ground: [],containers: [{ id: 'container',position: tile,...(containerDecay ? { decay: containerDecay } : {}) }],structures: [{ id: 'container',position: tile,hits: repairHits,hitsMax: 250000,repairable: true }],decayDivisor: 1000 };
  input.bodies[0]!.build = { workParts: 1,boostBonuses: [0] };
  if (constructionRemaining !== undefined) {
    input.inventories = input.inventories.filter(store => store.id !== 'container');
    input.ecology.containers = []; input.ecology.structures = [];
    input.ecology.sites = [constructionSite(tile,constructionRemaining)];
  }
  if (openingRoom) {
    input.workers[0]!.position = { ...tile,room: openingRoom }; input.bodies[0]!.inventory.room = openingRoom; input.sources[0]!.miners[0]!.observation.position = { ...tile,room: openingRoom };
  }
  let shared!: HomeWorldShared,cycle!: ReturnType<typeof createRemoteMiningCycle<typeof worker>>,tick = 10,mode: 'hold' | 'bank' | 'service' = 'service',eligible = true,allowed = true,present = true;
  let infrastructure: ForecastMiningInfrastructure = { sink: 'container',...(repairHits < 250000 ? { repair: { id: 'container',hits: repairHits,hitsMax: 250000 } } : {}) };
  const move = vi.fn(() => ({ status: 'running' } as Outcome)),retire = vi.fn(() => ({ status: 'running' } as Outcome));
  if (constructionRemaining !== undefined) infrastructure = { site: 'site' };
  const build = vi.fn((unit: ForecastMinerWorker,target: string,id: string) => queueForecastMiningBuild(shared,unit,target,id,input.bodies[0]!.build!,true)),repair = vi.fn((unit: ForecastMinerWorker,target: string,id: string) => queueForecastMiningRepair(shared,unit,target,id,input.bodies[0]!.repair!));
  const configure = (ports: HomeWorldShared): HomeWorldEnvironment => {
    shared = ports;
    const work = createForecastMiningWork(ports,{ allowed: () => allowed,tile: () => tile,
      station: () => present ? ({ id: 'source',target: 'source',kind: 'energy',resource: 'energy',position: input.ecology!.sources[0]!.position,access: [tile],container: 'container',throughput: 5,available: 100,observedAt: ports.inventory.tick(),readyAt: ports.inventory.tick(),risk: 'safe' } satisfies MiningStation) : undefined,
      infrastructure: () => {
        const birth = input.ecology!.sites?.find(site => site.id === infrastructure.site)?.completion;
        if (birth && !ports.inventory.site(infrastructure.site!)) {
          const target = ports.inventory.structure(birth.store.id);
          return { ...(ports.inventory.observe(birth.store.id) ? { sink: birth.store.id } : {}),...(target && target.hits < target.hitsMax ? { repair: target } : {}) };
        }
        const target = infrastructure.repair && ports.inventory.structure(infrastructure.repair.id);
        const { repair: selectedRepair,sink,...other } = infrastructure;
        return { ...other,...(sink && ports.inventory.observe(sink) ? { sink } : {}),...(selectedRepair && target ? { repair: { id: target.id,hits: target.hits,hitsMax: target.hitsMax } } : {}) };
      },harvestPower: () => 2,move,retire,build,repair });
    cycle = createRemoteMiningCycle(ports.state,{ home: input.home,owner: 'mine-owner' },{ ...work,eligible: () => eligible,cargo: () => ports.inventory.observe(worker.unit)!.usedCapacity,
      lifetime: () => 1503-ports.inventory.tick(),mode: () => mode },{});
    return { authority: () => undefined,visible: () => true,endpoint: () => undefined,roomPolicy: () => ({ blockedRooms: [] }),legal: () => true,terrain: () => 2 };
  };
  const world = createHomeHaulingWorld(input,configure,{ minimumBatch: 1,requestLifetime: 100 });
  function visit(): void {
    const frame = shared.inventory.tick(),store = createRemoteAssignmentStore(shared.state),assignment = store.owner('E0N1',frame);
    const demand = assignment && remoteAssignmentDemands(assignment,frame).find(demand => demand.kind === 'mine'); cycle.run(worker,demand);
  }
  function step(operations: HomeWorldOperation[] = []) {
    const result = world.step({ tick,operations: [{ kind: 'settle' },...operations,{ kind: 'external',id: 'miner',run: visit }],
      outside: { plans: [],states: [],requestedUnits: [],occupants: [{ unit: worker.unit,position: input.workers[0]!.position }] },settlementOrder: intents => intents.map(intent => intent.id),postprocessOrder: operations => operations.map(operation => operation.key) }); tick++; return result;
  }

  return { ...f,world,configure,visit,shared,worker,move,retire,build,repair,step,
    mode(value: typeof mode) { mode = value; },eligible(value: boolean) { eligible = value; },allow(value: boolean) { allowed = value; },present(value: boolean) { present = value; },
    infrastructure(value: ForecastMiningInfrastructure) { infrastructure = value; },
  };
}

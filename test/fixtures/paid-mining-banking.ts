import { paidMiningCycleFixture } from './paid-mining-cycle';
import { createHomeHaulingWorld } from '../../src/app/remotes/startup/hauling-state/world/driver';
import { createForecastRemoteBanking } from '../../src/app/remotes/startup/banking-state/service';
import { withinRange } from '../../src/capabilities/movement/path-model';
import type { HomeWorldShared,HomeWorldEnvironment } from '../../src/app/remotes/startup/hauling-state/world/model';
import { logisticsPool } from '../../src/capabilities/logistics/request';
export function paidMiningBankingFixture({ capacity = 1000,alternate = false,claimed = 0 }: { capacity?: number; alternate?: boolean; claimed?: number } = {}) {
  const f = paidMiningCycleFixture({ cargo: 20,openingRoom: 'W0N1' }),input = f.input;
  input.sources[0]!.miners[0]!.observation.stage = 'approach';
  const bank = input.inventories.find(store => store.id === 'bank')!; bank.capacity = capacity; bank.freeEnergyCapacity = capacity;
  input.endpoint.capacity = capacity; input.endpoint.freeCapacity = capacity;
  if (alternate) input.inventories.push({ ...bank,id: 'spare',capacity: 100,freeEnergyCapacity: 100,capacityPool: logisticsPool('capacity','spare') });
  if (claimed) input.claims.external.push({ id: 'outside',owner: 'household',holder: 'resident',scope: 'resident',expiresAt: 100,allocations: [{ pool: bank.capacityPool,amount: claimed }] });
  let shared!: HomeWorldShared,homeReady = true,routeReady = true;
  const configure = (ports: HomeWorldShared): HomeWorldEnvironment => {
    shared = ports; const environment = f.configure(ports);
    const banking = createForecastRemoteBanking(input.home,ports,{
      eventsVisible: () => true,eligible: () => true,homeReady: () => homeReady,routeReady: () => routeReady,retire: f.retire,
      acceptsEnergy: () => true,acceptsSink: () => true,
      destinations: () => input.inventories.filter(store => store.room === input.home).map(store => ({ id: store.id,room: store.room,kind: 'storage',owned: true,active: true })),
      capacityPool: id => input.inventories.find(store => store.id === id)!.capacityPool,
      target(worker,request,phase) {
        const id = phase === 'collect' ? request.source : request.sink,visible = !!ports.inventory.observe(id);
        return { status: visible ? 'visible' : 'missing',inRange: withinRange(ports.body(worker.unit).position,{ room: 'W0N1',x: 5,y: 25 },1),accepting: homeReady };
      },approach: () => ({ status: 'running' }),
    },{ terminalReserve: 0 });
    environment.mining!.mode = (worker,definitions) => banking.prepare(worker,definitions,['remote-mine']);
    environment.mining!.banking = banking.definitions;
    environment.mining!.allowed = () => homeReady && routeReady;
    return environment;
  };
  const world = createHomeHaulingWorld(input,configure,{ minimumBatch: 1,requestLifetime: 100 });
  const frame = (tick: number) => ({ tick,operations: [{ kind: 'settle' as const },{ kind: 'miner' as const,name: 'miner' }],outside: { plans: [],states: [],requestedUnits: [],occupants: [{ unit: 'miner-id',position: input.workers[0]!.position }] },settlementOrder: (intents: readonly { id: string }[]) => intents.map(intent => intent.id) });
  return { world,input,configure,frame,get shared() { return shared; },homeReady(value: boolean) { homeReady = value; },routeReady(value: boolean) { routeReady = value; } };
}

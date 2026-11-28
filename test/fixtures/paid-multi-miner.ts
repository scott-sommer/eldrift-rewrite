import { paidMiningCycleFixture } from './paid-mining-cycle';
import { createHomeHaulingWorld } from '../../src/app/remotes/startup/hauling-state/world/driver';
import { remoteAssignmentDemands } from '../../src/features/remotes/assignment-demand';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import { taskScope } from '../../src/app/task-runner';
import { stationTile } from '../../src/capabilities/mining/station';
import type { RemoteTaskPayload } from '../../src/app/remotes/task';
import type { HomeHaulingInput,HomeWorldShared,HomeWorldEnvironment } from '../../src/app/remotes/startup/hauling-state/world/model';
export function paidMultiMinerFixture() {
  const f = paidMiningCycleFixture(),input = f.input;
  addMiner(input); addPhysicalSource(input);
  const configure = (shared: HomeWorldShared): HomeWorldEnvironment => {
    const environment = f.configure(shared);
    environment.mining!.station = (_worker,demand) => {
      const source = shared.inventory.source(demand.source),plan = input.sources.find(item => item.plan.source === demand.source)!.plan;
      return source && { id: source.id,target: source.id,kind: 'energy',resource: 'energy',position: source.position,access: [plan.station],throughput: 5,available: source.energy,observedAt: shared.inventory.tick(),readyAt: shared.inventory.tick()+(source.regenerationIn ?? 0),risk: 'safe' };
    };
    environment.mining!.infrastructure = worker => ({ sink: worker.name === 'miner' ? 'container' : 'container-2' });
    return environment;
  };
  const world = createHomeHaulingWorld(input,configure,{ minimumBatch: 1,requestLifetime: 100 });
  const frame = (tick: number) => ({ tick,operations: [{ kind: 'settle' as const },{ kind: 'miner' as const,name: 'miner-2' },{ kind: 'miner' as const,name: 'miner' }],
    outside: { plans: [],states: [],requestedUnits: [],occupants: input.bodies.map(body => ({ unit: body.unit,position: input.workers.find(worker => worker.name === body.name)!.position })) },settlementOrder: (intents: readonly { id: string }[]) => intents.map(intent => intent.id) });
  return { input,world,configure,frame };
}
function addMiner(input: HomeHaulingInput): void {
  const lease = input.control!.assignments!.assignments.find(item => item.home === input.home)!; lease.plan.sources.push('source-2');
  const source = structuredClone(input.sources[0]!),miner = source.miners[0]!,tile = { ...source.plan.station,x: 8 };
  const demand = remoteAssignmentDemands(lease,input.observedAt).find(item => item.kind === 'mine' && item.source === 'source-2')!;
  if (demand.kind !== 'mine') throw new Error('Expected mining demand');
  source.demand = demand; source.plan.source = 'source-2'; source.plan.station = tile; source.plan.collection = { ...tile,x: 7 };
  miner.paid.request = 'miner-2'; miner.observation.name = 'miner-2'; miner.observation.unit = 'miner-id-2'; miner.observation.position = tile;
  const task = miner.observation.task!,payload = task.record.payload as RemoteTaskPayload;
  payload.token = { id: demand.id,assignment: demand.assignment,generation: demand.generation,expiresAt: demand.expiresAt }; task.scope = taskScope('miner-2',task.id);
  miner.observation.claim = { resource: 'mining-tile:'+stationTile(tile),holder: 'miner-2',scope: task.scope,expiresAt: 20 };
  input.control!.reservations!.claims.push(miner.observation.claim);
  input.sources = [...input.sources,source];
  const body = structuredClone(input.bodies[0]!); body.name = 'miner-2'; body.unit = 'miner-id-2'; body.inventory.id = body.unit; body.inventory.capacityPool = logisticsPool('capacity',body.unit);
  input.bodies.push(body); input.workers.push({ ...structuredClone(input.workers[0]!),name: body.name,position: tile });
}
function addPhysicalSource(input: HomeHaulingInput): void {
  const tile = input.sources[1]!.plan.station,source = structuredClone(input.ecology!.sources[0]!); source.id = 'source-2'; source.position = { ...tile,y: tile.y+1 }; input.ecology!.sources.push(source);
  const store = structuredClone(input.inventories.find(store => store.id === 'container')!); store.id = 'container-2'; store.capacityPool = logisticsPool('capacity',store.id); input.inventories.push(store);
  input.ecology!.containers.push({ id: store.id,position: tile });
  input.ecology!.structures!.push({ id: store.id,position: tile,hits: 250000,hitsMax: 250000,repairable: true });
}

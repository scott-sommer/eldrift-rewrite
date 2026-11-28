import { createHomeMiningActors } from '../../mining-state/actors';
import { seedHomeWorldControl } from './control';
import { createActionArbiter } from '../../../../../core/execution/action-arbiter';
import { createQuantityReservations } from '../../../../../persistence/quantities/store';
import { createPaidHomePhysicalInventory } from '../inventory';
import { createPaidHaulingForecastState } from '../seed';
import { createPaidHaulingMovement } from '../movement/frame';
import { createForecastHaulingTransfer } from '../transfer';
import { createPaidHomeTransportPolicy } from '../policy/transport';
import { createPaidHaulingForecastService } from '../service';
import { withinRange } from '../../../../../capabilities/movement/path-model';
import type { PaidHaulingForecastWorker } from '../service';
import type { HomeHaulingInput,HomeWorldEnvironment,HomeWorldShared } from './model';
import { homeWorldInventoryPorts } from './inventory-ports';
import { HomeWorldBodies } from './bodies';
import { homeWorldInput,homeWorldRoutes } from './input';
import { restoreHomeInventory,validateHomeContinuation } from './checkpoint';
import type { HomeHaulingCheckpoint } from './checkpoint';
import { homeWorldReceiptCollector } from './receipts';
/** Composition owns private mechanisms; outside actor policy is supplied through explicit ports. */
export function homeWorldContext(input: HomeHaulingInput,configure: (shared: HomeWorldShared) => HomeWorldEnvironment,
  policy: { minimumBatch: number; requestLifetime: number }, checkpoint?: HomeHaulingCheckpoint) {
  const home = homeWorldInput(input),initialInventory = createPaidHomePhysicalInventory(home,home.ecology);
  const inventory = checkpoint ? restoreHomeInventory(home,checkpoint.inventory) : initialInventory;
  const nextTick = checkpoint?.inventory.nextTick ?? home.observedAt;
  const seed = createPaidHaulingForecastState(home.home,home.observedAt,home.sources.flatMap(source => source.couriers.map(courier =>
    ({ source: source.plan.source,room: source.plan.room,opening: courier.opening }))),[...home.claims.owned,...home.claims.external],checkpoint?.state);
  seedHomeWorldControl(home,seed.state,checkpoint !== undefined,nextTick);
  const bodies = new HomeWorldBodies(home,new Set(seed.workers.map(worker => worker.unit)));
  if (checkpoint) { bodies.restore(checkpoint.bodies); validateHomeContinuation(checkpoint,seed); }
  const arbiter = createActionArbiter(inventory.tick),quantities = createQuantityReservations(seed.state);
  const shared: HomeWorldShared = { state: seed.state,inventory: homeWorldInventoryPorts(inventory,bodies),quantities,arbiter,body: unit => bodies.get(unit) };
  const environment = configure(shared),movement = createPaidHaulingMovement(home.home,home.observedAt,homeWorldRoutes(home),arbiter,environment,checkpoint?.movement);
  const miners = environment.mining ? createHomeMiningActors(home,shared,environment.mining) : undefined;
  function endpoint(worker: PaidHaulingForecastWorker,phase: 'collect' | 'deliver') {
    const target = environment.endpoint(worker,phase,inventory.tick());
    if (!target) return undefined;
    const source = home.sources.find(source => source.couriers.some(courier => courier.paid.request === worker.name))!;
    const expected = phase === 'collect' ? source.plan.station : source.plan.endpoint.position;
    if (!withinRange(target.position,expected,0)) throw new Error('Home world endpoint geometry changed');
    return target;
  }
  const transfer = createForecastHaulingTransfer<PaidHaulingForecastWorker>(seed.state,inventory,arbiter,{
    position: worker => bodies.get(worker.unit).position,
    capacityPool: id => { const store = inventory.observe(id) ?? home.inventories.find(store => store.id === id) ?? home.ecology?.sites?.find(site => site.completion?.store.id === id)?.completion?.store; if (!store) throw new Error('Unknown home world capacity pool'); return store.capacityPool; },
    target(worker,request,phase) {
      const target = endpoint(worker,phase),id = phase === 'collect' ? request.source : request.sink;
      const room = phase === 'collect' ? request.service?.collection.room : request.service?.deposit.room;
      if (!room) throw new Error('Missing home world service geometry');
      if (!environment.visible(room,inventory.tick())) return { status: 'unseen',inRange: false,accepting: false };
      if (!target || target.id !== id || !inventory.observe(id)) return { status: 'missing',inRange: false,accepting: false };
      const service = phase === 'collect' ? request.service!.collection : request.service!.deposit;
      const position = bodies.get(worker.unit).position;
      return { status: 'visible',inRange: withinRange(position,target.position,1) && withinRange(position,service,0),accepting: target.active };
    },
    approach: (worker,binding,request,phase) => {
      const destination = phase === 'collect' ? request.service?.collection : request.service?.deposit;
      if (!destination) throw new Error('Missing home world approach geometry');
      return movement.request(worker.name,{ owner: binding.scope,destination,range: 0,policy: environment.roomPolicy(worker,phase,inventory.tick()) });
    },
  });
  const productive = createPaidHomeTransportPolicy(home.home,home.sources,seed,policy,{ inventory,
    physical: worker => bodies.get(worker.unit),authority: environment.authority,
    collection: worker => endpoint(worker,'collect')?.id,visible: room => environment.visible(room,inventory.tick()),
    roomPolicy: (worker,phase) => environment.roomPolicy(worker,phase,inventory.tick()),move: movement.request,view: transfer.view });
  const service = createPaidHaulingForecastService(seed,{ ...transfer,...productive },nextTick);
  return { home,nextTick,inventory,seed,bodies,shared,movement,transfer,service,miners,receipts: homeWorldReceiptCollector(seed) };
}

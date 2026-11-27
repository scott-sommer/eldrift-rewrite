import { createPaidHomeTransportPolicy } from '../../src/app/remotes/startup/hauling-state/policy/transport';
import { remoteTransportOwner } from '../../src/features/remotes/transport-authority';
import type { RemoteTransportDemand } from '../../src/features/remotes/transport-authority';
import { paidRouteFixture } from './paid-route';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createEnergyInventoryFrame } from '../../src/capabilities/resources/energy-inventory/frame';
import { createPaidHaulingForecastState } from '../../src/app/remotes/startup/hauling-state/seed';
import { createPaidHaulingForecastService } from '../../src/app/remotes/startup/hauling-state/service';
import { createForecastHaulingTransfer } from '../../src/app/remotes/startup/hauling-state/transfer';
import { createPaidHaulingMovement } from '../../src/app/remotes/startup/hauling-state/movement/frame';
import { readPaidHaulingForecastOpening } from '../../src/app/remotes/startup/hauling-state/observation';
import { activatePaidCourierRoute } from '../../src/features/remotes/startup/routes/progress';
import { withinRange } from '../../src/capabilities/movement/path-model';
import { logisticsPool } from '../../src/capabilities/logistics/request';
export function paidHaulingPhysicalFixture(leaseExpiresAt = 1400) {
  const f = paidRouteFixture();
  let demand: RemoteTransportDemand | undefined = { kind: 'mine',id: 'demand',assignment: 'lease',home: 'W0N1',room: 'W0N1',source: 'source',generation: 1,expiresAt: leaseExpiresAt };
  const request = { id: 'first',owner: remoteTransportOwner(demand,'paid-owner'),source: 'container',sink: 'bank',resource: 'energy',quantity: 32,priority: 0,expiresAt: Math.min(130,leaseExpiresAt),
    service: { collection: f.context.plan.collection,deposit: f.context.plan.endpoint.deposit,avoid: [f.context.plan.station] } };
  const record = { id: 'first',kind: 'haul',phase: 'work',payload: { home: 'W0N1',unitId: 'native-id',request },wakeAt: 100,retries: 0,expiresAt: request.expiresAt };
  f.opening.observed.task = { record,id: 'first',wakeAt: 100,expiresAt: request.expiresAt,request,remaining: 32,receipts: [] };
  const seed = createPaidHaulingForecastState('W0N1',100,[{ source: 'source',room: 'W0N1',opening: f.opening }],[]);
  const store = (id: string,energy: number,capacity: number) => ({ id,energy,capacity,usedCapacity: energy,freeEnergyCapacity: capacity-energy });
  const inventory = createEnergyInventoryFrame(100,[store('native-id',32,50),store('container',100,200),store('bank',0,100)]);
  let tick = 100, position = f.point(14), fatigue = 0;
  const arbiter = createActionArbiter(() => tick), movement = createPaidHaulingMovement('W0N1',100,[activatePaidCourierRoute(f.program)],arbiter,{ legal: () => true,terrain: () => 2 });
  const policy = { blockedRooms: [],allowedRooms: ['W0N1'] };
  const transfer = createForecastHaulingTransfer(seed.state,inventory,arbiter,{
    position: () => position,capacityPool: id => logisticsPool('capacity',id),
    target: (_worker,request,phase) => ({ status: 'visible',accepting: true,inRange: withinRange(position,phase === 'collect' ? request.service!.collection : request.service!.deposit,0) }),
    approach: (worker,binding,request,phase) => movement.request(worker.name,{ owner: binding.scope,destination: phase === 'collect' ? request.service!.collection : request.service!.deposit,range: 0,policy }),
  });
  const worker = seed.workers[0]!;
  const productive = createPaidHomeTransportPolicy('W0N1',[{ demand,plan: f.context.plan,couriers: [{ paid: f.context.paid }] }],seed,
    { minimumBatch: 1,requestLifetime: 200 },{ inventory,physical: () => ({ position,fatigue,spawning: false }),authority: () => demand,
      collection: () => 'container',visible: () => true,roomPolicy: () => policy,move: movement.request,view: transfer.view });
  const service = createPaidHaulingForecastService(seed,{ ...transfer,...productive });
  const frames: { tick: number; x: number; energy: number; stage: string; readyAt: number; effects: { kind: string; amount: number; settledAt: number }[] }[] = [];
  function step() {
    inventory.begin(tick);
    const opening = readPaidHaulingForecastOpening('W0N1',seed.state,inventory,worker,{ position,fatigue,spawning: false },attempt => transfer.observe(worker,attempt));
    movement.begin(tick,[{ tick,name: worker.name,unit: worker.unit,position,energy: opening.observed.energy,fatigue,
      phase: opening.continuation.stage === 'deliver' ? 'deliver' : 'collect',readyAt: opening.continuation.readyAt }]);
    service.step(tick,[{ name: worker.name,work: true }]);
    const physical = movement.finish({ plans: [],states: [],requestedUnits: [],occupants: [] }).states[0]!;
    const effects = inventory.finish(inventory.pending().map(intent => intent.id));
    frames.push({ tick,x: position.x,energy: opening.observed.energy,stage: opening.continuation.stage,readyAt: opening.continuation.readyAt,effects });
    position = physical.position; fatigue = physical.fatigue; tick++;
  }
  return { seed,inventory,movement,frames,step,renew(at: number) { demand = { ...demand!,expiresAt: at }; },reassign() { demand = { ...demand!,generation: demand!.generation+1 }; } };
}

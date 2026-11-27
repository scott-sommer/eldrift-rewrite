import { createHomeHaulingWorld } from '../../src/app/remotes/startup/hauling-state/world/driver';
import type { HomeHaulingInput,HomeWorldShared,HomeWorldOperation,HomeConfirmedDelivery } from '../../src/app/remotes/startup/hauling-state/world/model';
import { remoteTransportOwner } from '../../src/features/remotes/transport-authority';
import type { RemoteTransportDemand } from '../../src/features/remotes/transport-authority';
import { paidRouteFixture } from './paid-route';
import { activatePaidCourierRoute } from '../../src/features/remotes/startup/routes/progress';
import type { PaidMovementExternalFrame } from '../../src/app/remotes/startup/hauling-state/movement/model';
import { logisticsPool } from '../../src/capabilities/logistics/request';
export function paidHaulingPhysicalFixture(leaseExpiresAt = 1400,change?: (input: HomeHaulingInput) => void) {
  const f = paidRouteFixture();
  let demand: RemoteTransportDemand | undefined = { kind: 'mine',id: 'demand',assignment: 'lease',home: 'W0N1',room: 'W0N1',source: 'source',generation: 1,expiresAt: leaseExpiresAt };
  const request = { id: 'first',owner: remoteTransportOwner(demand,'paid-owner'),source: 'container',sink: 'bank',resource: 'energy',quantity: 32,priority: 0,expiresAt: Math.min(130,leaseExpiresAt),
    service: { collection: f.context.plan.collection,deposit: f.context.plan.endpoint.deposit,avoid: [f.context.plan.station] } };
  const record = { id: 'first',kind: 'haul',phase: 'work',payload: { home: 'W0N1',unitId: 'native-id',request },wakeAt: 100,retries: 0,expiresAt: request.expiresAt };
  f.opening.observed.task = { record,id: 'first',wakeAt: 100,expiresAt: request.expiresAt,request,remaining: 32,receipts: [] };
  const store = (id: string,energy: number,capacity: number) => ({ id,energy,capacity,usedCapacity: energy,freeEnergyCapacity: capacity-energy,
    capacityPool: logisticsPool('capacity',id),room: 'W0N1',active: true });
  const input: HomeHaulingInput = { home: 'W0N1',observedAt: 100,endpoint: { id: 'bank',energy: 0,capacity: 100,freeCapacity: 100 },
    inventories: [store('container',100,200),store('bank',0,100)],
    bodies: [{ name: 'paid-courier',unit: 'native-id',inventory: store('native-id',32,50) }],
    workers: [{ name: 'paid-courier',owner: 'paid-owner',position: f.point(14),spawning: false,ticksToLive: 1406,energy: 32,fatigue: 0,usedCapacity: 32,
      body: [{ type: 'carry',hits: 100,boost: null },{ type: 'move',hits: 100,boost: null }] }],
    sources: [{ demand,plan: f.context.plan,miners: [],couriers: [{ paid: f.context.paid,opening: f.opening,route: activatePaidCourierRoute(f.program) }] }],
    claims: { owned: [],external: [] } };
  change?.(input);
  let shared!: HomeWorldShared,tick = 100;
  const world = createHomeHaulingWorld(input,ports => {
    shared = ports;
    return { authority: () => demand,visible: () => true,legal: () => true,terrain: () => 2,
      endpoint: (_worker,phase) => ({ id: phase === 'collect' ? 'container' : 'bank',position: phase === 'collect' ? f.context.plan.station : f.context.plan.endpoint.position,active: true }),
      roomPolicy: () => ({ blockedRooms: [],allowedRooms: ['W0N1'] }) };
  },{ minimumBatch: 1,requestLifetime: 200 });
  const seed = { state: shared.state },inventory = { snapshot: () => world.snapshot().inventories };
  const frames: { tick: number; x: number; energy: number; stage: string; readyAt: number; effects: { kind: string; amount: number; settledAt: number }[] }[] = [];
  const deliveries: HomeConfirmedDelivery[] = [];
  function step(operations: readonly HomeWorldOperation[] = [{ kind: 'settle' },{ kind: 'paid',name: 'paid-courier',work: true }],outside: PaidMovementExternalFrame = { plans: [],states: [],requestedUnits: [],occupants: [] }) {
    const result = world.step({ tick,operations,outside,settlementOrder: intents => intents.map(intent => intent.id) });
    const opening = result.openings[0]!;
    frames.push({ tick,x: opening.observed.position.x,energy: opening.observed.energy,stage: opening.continuation.stage,readyAt: opening.continuation.readyAt,effects: result.effects });
    deliveries.push(...result.deliveries); tick++; return result;
  }
  return { seed,inventory,world,shared,deliveries,frames,step,renew(at: number) { demand = { ...demand!,expiresAt: at }; },reassign() { demand = { ...demand!,generation: demand!.generation+1 }; } };
}

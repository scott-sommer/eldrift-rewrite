import type { ForecastHaulingUnit } from '../../src/app/remotes/startup/hauling-state/transfer';
import type { PlannedMovementCommand } from '../../src/capabilities/movement/fixed-step';
import { enableHomeExpiry } from './home-expiry';
import { paidHaulingPhysicalFixture } from './paid-hauling-physical';
import { createHomeHaulingWorld } from '../../src/app/remotes/startup/hauling-state/world/driver';
import { withinRange } from '../../src/capabilities/movement/path-model';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import type { HomeWorldShared,HomeWorldEnvironment } from '../../src/app/remotes/startup/hauling-state/world/model';
/** Scheduled production courier control with explicit current recovery environment and physical paths. */
interface Options { capacity?: number; life?: number; retireAt?: number; leaseExpiresAt?: number; rejoin?: boolean }
export function paidCourierBankingFixture({ capacity = 100,life,retireAt = 101,leaseExpiresAt = 1400,rejoin = true }: Options = {}) {
  const f = paidHaulingPhysicalFixture(leaseExpiresAt),input = f.world.checkpoint().input;
  const courier = input.sources[0]!.couriers[0]!; courier.paid.retireAt = retireAt; courier.opening.observed.retireAt = retireAt; courier.route!.program.retireAt = retireAt;
  const bank = input.inventories.find(store => store.id === 'bank')!; bank.capacity = capacity; bank.freeEnergyCapacity = capacity;
  input.endpoint.capacity = capacity; input.endpoint.freeCapacity = capacity;
  input.inventories.push({ ...bank,id: 'spare',capacity: 100,freeEnergyCapacity: 100,capacityPool: logisticsPool('capacity','spare') });
  if (life !== undefined) { input.workers[0]!.ticksToLive = life; enableHomeExpiry(input); }
  let shared!: HomeWorldShared,authorized = true,bankAccepted = true;
  const configure = (ports: HomeWorldShared): HomeWorldEnvironment => {
    shared = ports;
    const environment = f.configure(ports),currentAuthority = environment.authority;
    environment.authority = (worker,tick) => authorized ? currentAuthority(worker,tick) : undefined;
    function move(actor: ForecastHaulingUnit,command: PlannedMovementCommand) {
      const origin = ports.body(actor.unit).position,x = command.destination.x;
      const path = Array.from({ length: Math.abs(origin.x-x) },(_,index) => fPoint(origin.x+Math.sign(x-origin.x)*(index+1)));
      return ports.recoverCourier(actor.name,command,path);
    }
    environment.lifecycleRoster = () => input.bodies.filter(body => ports.inventory.observe(body.unit)).map(body => ({ name: body.name,id: body.unit }));
    environment.courierBanking = { ...(rejoin ? { rejoin: move } : {}),policy: { terminalReserve: 0 },environment: {
      eligible: () => true,homeReady: () => true,routeReady: () => true,
      retire: () => ({ status: 'done' }),acceptsEnergy: () => true,acceptsSink: (_worker,sink) => sink.id !== 'bank' || bankAccepted,
      destinations: () => ['bank','spare'].map(id => ({ id,room: input.home,kind: 'storage',owned: true,active: true })),
      capacityPool: id => input.inventories.find(store => store.id === id)!.capacityPool,
      target(actor,request,phase) {
        const id = phase === 'collect' ? request.source : request.sink;
        return { status: ports.inventory.observe(id) ? 'visible' : 'missing',inRange: withinRange(ports.body(actor.unit).position,fPoint(id === 'spare' ? 7 : 9),1),accepting: true };
      },
      approach(actor,binding,request) {
        return move(actor,{ owner: binding.scope,destination: fPoint(request.sink === 'spare' ? 8 : 10),range: 0,policy: { blockedRooms: [],allowedRooms: [input.home] } });
      },
    } };
    return environment;
  };
  const world = createHomeHaulingWorld(input,configure,{ minimumBatch: 1,requestLifetime: 100 });
  const frame = (tick: number) => ({ tick,operations: [{ kind: 'settle' as const },...(life === undefined || tick < input.observedAt+life ? [{ kind: 'paid' as const,name: 'paid-courier',work: true }] : [])],
    outside: { plans: [],states: [],requestedUnits: [],occupants: [] },settlementOrder: (intents: readonly { id: string }[]) => intents.map(intent => intent.id),postprocessOrder: (operations: readonly { key: string }[]) => operations.map(operation => operation.key) });
  return { input,world,configure,frame,get shared() { return shared; },
    authority(value: boolean) { authorized = value; },acceptBank(value: boolean) { bankAccepted = value; },renew: f.renew };
}
function fPoint(x: number) { return { room: 'W0N1',x,y: 25 }; }

import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createNativeReservationQuote } from '../../src/app/remotes/reservation/native-quote';
import { createNativeRemoteManagement } from '../../src/app/remotes/management/native';
import { createRemoteManagementStore } from '../../src/features/remotes/management/store';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { sourceMiner, courier } from '../../src/capabilities/spawning/economy-recipes';
import type { ReservationQuote } from '../../src/features/remotes/reservation/model';
import type { RemoteManagementRequest } from '../../src/features/remotes/management/model';
const state = createMemoryPort(() => Memory), home = 'W0N1', assignments = createRemoteAssignmentStore(state);
const quote = createNativeReservationQuote(state,{ maximumRooms: 8,maximumOps: 10000 });
const manager = createNativeRemoteManagement(state,{ maximumRooms: 8,maximumOps: 10000 });
interface Probe extends Memory { roomReservationQuote?: ReservationQuote; roomReservationRows?: unknown[] }
export function loop(): void {
  const memory = Memory as Probe;
  if (Game.time === 1) {
    openState(state,'operator/config',operatorSchema);
    assignments.reconcile({ home,tick: 1,lifetime: 1000,expectedRevision: 0,plans: [{ room: 'W0N0',sources: ['operator-source'],reserve: null,infrastructure: null }] });
    state.write('fixture/room-reservation',{ owner: 'fixture',version: 1,data: { preserved: true } });
  }
  if (!memory.roomReservationQuote || Game.time === 18) {
    const measured = quote({ home,room: 'E0N1',tick: Game.time,bodyBudget: 1300,minimumBufferTicks: 100,replacementMargin: 25,traversal: traversal() });
    if (measured.status !== 'quoted') throw new Error('Room reservation fixture could not quote controller');
    memory.roomReservationQuote = measured;
  }
  if (Game.time === 7) installVersionTwo();
  const beforeVersion = version(), result = manager.advance(request(memory.roomReservationQuote),{ rooms: 1,sources: 1 },() => true);
  const record = createRemoteManagementStore(state,home).read();
  (memory.roomReservationRows ??= []).push({ tick: Game.time,status: result.status,beforeVersion,version: version(),offers: record.offers,
    managed: record.managed,east: assignments.owner('E0N1',Game.time) ?? null,north: assignments.owner('W0N2',Game.time) ?? null,
    manual: assignments.owner('W0N0',Game.time) ?? null,portfolio: 'portfolio' in result ? result.portfolio : null,
    reservation: Game.rooms.E0N1!.controller!.reservation ?? null,spawnEnergy: Game.rooms[home]!.energyAvailable,sentinel: state.read('fixture/room-reservation') });
}
function traversal() {
  return { mode: 'known-safe' as const,username: Game.rooms[home]!.controller!.owner!.username,allies: [],blockedRooms: [],avoidUntil: {},allowKeeper: false,
    maximumAge: 100,maximumRooms: 64,unknownCost: 8,staleCost: 4,keeperCost: 25 };
}
function request(reservation: ReservationQuote): RemoteManagementRequest {
  const commitment = { atomic: false,slots: 0,energyPerTick: 0,spawnLoad: 0 };
  return { home,tick: Game.time,policy: { candidates: [{ room: 'E0N1',commitment,reservation },{ room: 'W0N2',commitment,reservation: null }],traversal: traversal(),
    economics: { regenerationTicks: ENERGY_REGEN_TIME,harvestPower: HARVEST_POWER,miner: { body: sourceMiner(550)!.parts,lifetime: CREEP_LIFE_TIME,replacementMargin: 25 },
      hauler: { body: courier(200)!.parts,lifetime: CREEP_LIFE_TIME,replacementMargin: 25,serviceTicks: 2 },reservation: { energyPerTick: 1,spawnLoad: 0.01,shares: 2 },infrastructurePerTick: 0.05,riskPerTick: 0,
      limits: { maximumHaulers: 40,maximumSpawnLoad: 2,minimumNetYield: 0.1 } },
    portfolio: { maximumSlots: 10,maximumHaulers: 50,maximumSpawnLoad: 4,maximumAge: 100,minimumNetYield: 0.1,completionBonus: 0.15,order: 'nearest' },
    reserve: true,infrastructure: null,leaseLifetime: 100,scanLifetime: 20,reassessInterval: 30 } };
}
function installVersionTwo(): void {
  const record = createRemoteManagementStore(state,home).read();
  for (const offer of record.offers) {
    if (offer.reservation) offer.commitment = offer.reservation.baseCommitment;
    Reflect.deleteProperty(offer,'reservation');
  }
  state.write('remoteManagement/'+home,{ owner: 'remotes',version: 2,data: record });
}
function version(): number { return (state.read('remoteManagement/'+home) as { version: number } | undefined)?.version ?? 0; }

import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { defaults } from '../../src/config/model';
import { createNativeReservationCandidates } from '../../src/app/remotes/reservation/candidates';
import { nativeRemoteManagementPolicy } from '../../src/app/remotes/management/policy';
import { createNativeRemoteManagement } from '../../src/app/remotes/management/native';
import { createRemoteManagementStore } from '../../src/features/remotes/management/store';
import { createReservationSelectionStore } from '../../src/features/remotes/reservation/selection/store';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
const state = createMemoryPort(() => Memory), home = 'W0N1', candidates = createNativeReservationCandidates(state);
const manager = createNativeRemoteManagement(state,{ maximumRooms: 8,maximumOps: 10000 });
export function loop(): void {
  if (Game.time === 1) { openState(state,'operator/config',operatorSchema); state.write('fixture/reserve-selection',{ owner: 'fixture',version: 1,data: { preserved: true } }); }
  if (Game.time === 9) installLegacyTravel();
  const beforeCacheVersion = cacheVersion();
  const config = { ...defaults,remoteReservationEnabled: Game.time < 21 || Game.time >= 25,remoteReservationBodyBudget: Game.time < 5 ? 1299 : 1300,
    remoteReservationQuoteRooms: 1,remoteMaximumPathOps: 10000,remoteMaximumSlots: 10,remoteMaximumHaulers: 50,remoteMaximumSpawnLoad: 4,
    remoteReassessInterval: 10,intelMaximumAge: 100,remoteRoadsEnabled: false,remoteContainersEnabled: false };
  const room = Game.rooms[home]!, base = nativeRemoteManagementPolicy(room,['E0N1','W0N2'],config)!;
  const before = createReservationSelectionStore(state,home).read(), policy = candidates(room,base,config,() => true);
  const result = manager.advance({ home,tick: Game.time,policy },{ rooms: 2,sources: 2 },() => true);
  const selected = createReservationSelectionStore(state,home).read(), record = createRemoteManagementStore(state,home).read();
  const assignments = createRemoteAssignmentStore(state);
  const probe = Memory as Memory & { reservationSelectionRows?: unknown[] };
  (probe.reservationSelectionRows ??= []).push({ tick: Game.time,enabled: config.remoteReservationEnabled,status: result.status,
    beforeRevision: before.revision,revision: selected.revision,next: selected.next,beforeCacheVersion,cacheVersion: cacheVersion(),
    prices: policy.candidates.map(candidate => ({ room: candidate.room,quote: candidate.reservation ?? null })),
    published: selected.published.map(entry => ({ room: entry.room,observedAt: entry.quote?.observedAt ?? null })),
    leases: ['E0N1','W0N2'].map(name => assignments.owner(name,Game.time) ?? null),
    offers: record.offers.map(offer => ({ room: offer.room,commitment: offer.commitment,capacity: offer.quotes.map(quote => quote.assessment.sourceFacts.capacity),fees: offer.quotes.map(quote => quote.assessment.policy.reservation) })),
    spawnEnergy: room.energyAvailable,reservation: Game.rooms.E0N1!.controller!.reservation ?? null,sentinel: state.read('fixture/reserve-selection') });
}

function cacheVersion(): number { return (state.read('remoteReserveTravel/'+home) as { version: number } | undefined)?.version ?? 0; }
function installLegacyTravel(): void {
  const envelope = state.read('remoteReserveTravel/'+home) as { data: { revision: number; clock: number; entries: { identity: string; legs: unknown[] }[] } };
  const previous = envelope.data;
  state.write('remoteReserveTravel/'+home,{ owner: 'remotes',version: 1,data: { revision: previous.revision,clock: previous.clock,identity: previous.entries[0]!.identity,legs: previous.entries[0]!.legs } });
}

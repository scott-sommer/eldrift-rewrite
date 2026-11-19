import { openState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createNativeReservationQuote } from '../../src/app/remotes/reservation/native-quote';
import { createRemoteTravelProgress } from '../../src/features/remotes/management/travel-progress';
import { createReservationTravelProgress } from '../../src/features/remotes/reservation/travel-progress';
const state = createMemoryPort(() => Memory), home = 'W0N1', room = 'E0N1';
const quote = createNativeReservationQuote(state,{ maximumRooms: 8,maximumOps: 10000 });
export function loop(): void {
  if (Game.time === 1) {
    openState(state,'operator/config',operatorSchema);
    createRemoteTravelProgress(state,home).save(0,1,'source-sentinel',[]);
    state.write('fixture/reserve-quote',{ owner: 'fixture',version: 1,data: { preserved: true } });
  }
  const request = { home,room,tick: Game.time,bodyBudget: 1300,minimumBufferTicks: 100,replacementMargin: 25,
    traversal: { mode: 'known-safe' as const,username: Game.rooms[home]!.controller!.owner!.username,allies: [],blockedRooms: [],avoidUntil: {},allowKeeper: false,
      maximumAge: 1000,maximumRooms: 128,unknownCost: 8,staleCost: 4,keeperCost: 25 } };
  const result = quote(request), before = JSON.stringify(Memory.eldrift), paused = quote(request,() => false);
  const pausedUnchanged = before === JSON.stringify(Memory.eldrift);
  const budget = Game.time === 1 ? quote({ ...request,bodyBudget: 650 }) : null;
  const buffer = Game.time === 1 ? quote({ ...request,minimumBufferTicks: 5000 }) : null;
  const memory = Memory as Memory & { reservationQuoteRows?: unknown[] };
  (memory.reservationQuoteRows ??= []).push({ tick: Game.time,result,budget,buffer,paused,pausedUnchanged,reservation: Game.rooms[room]!.controller!.reservation ?? null,spawnEnergy: Game.rooms[home]!.energyAvailable,
    progress: createReservationTravelProgress(state,home).read(),sourceProgress: createRemoteTravelProgress(state,home).read(),sentinel: state.read('fixture/reserve-quote') });
}

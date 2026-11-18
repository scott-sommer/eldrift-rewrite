import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createObservationStore } from '../../src/features/intel/observation/store';
import { createIntelStore } from '../../src/features/intel/store';
const state = createMemoryPort(() => Memory);
export function loop() {
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { observersEnabled: Game.time > 1, observerVisionBudget: Game.time === 4 ? 0 : 1,
    observerCaptureBudget: Game.time === 10 ? 0 : 1, observerCpuBudget: Game.time === 6 ? 0 : 3,
    backgroundEnabled: Game.time !== 8, observerRefreshInterval: 2, observerFailureDelay: 2 };
  settings.rooms = { W0N1: { override: { observerAssignedRooms: ['E0N1','W1N0'] } }, W1N1: { override: { observerAssignedRooms: ['W2N1'] } } };
  saveState(state, 'operator/config', operatorSchema, settings);
  const store = createObservationStore(state), tick = Game.time;
  if (tick === 1) {
    store.submit({ id: 'manual-initial', owner: 'operator', home: 'W0N1', room: 'E0N1', priority: 100, requestedAt: tick, expiresAt: 50 }, tick);
    state.write('observer-witness/room', { owner: 'observer-witness', version: 1, data: { initializedAt: tick, value: ['retained'] } });
  }
  if (tick === 14) store.submit({ id: 'manual-far', owner: 'operator', home: 'W0N1', room: 'W30N30', priority: 100, requestedAt: tick, expiresAt: 30 }, tick);
  if (tick === 16) store.submit({ id: 'manual-unowned', owner: 'operator', home: 'W9N9', room: 'W10N9', priority: 100, requestedAt: tick, expiresAt: 18 }, tick);
  const before = facts();
  botLoop();
  const memory = Memory as Memory & { observerRows?: unknown[] };
  const saved = store.read();
  (memory.observerRows ??= []).push({ tick, before, after: facts(),
    flights: saved.flights, receipts: saved.receipts,
    issued: [...saved.flights, ...saved.receipts].filter(item => item.issuedAt === tick),
    pending: saved.requests.map(request => request.id), cursors: saved.cursors,
    witness: state.read('observer-witness/room') });
}
function facts() {
  const intel = createIntelStore(state);
  return ['E0N1','W1N0','W2N1'].map(room => {
    const view = intel.peek(room, Game.time, 0), summary = view.record.summary;
    return { room, visible: !!Game.rooms[room], seen: view.record.lastSeen, visited: view.record.lastVisit,
      freshness: view.freshness, owner: summary?.controller?.owner ?? null, sources: summary?.sources.length ?? null,
      mineral: summary?.mineral?.type ?? null, exits: summary?.exits.length ?? null };
  });
}

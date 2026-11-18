import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createIntelStore } from '../../src/features/intel/store';
import { createCaptureProgressStore } from '../../src/features/intel/capture-store';
const state = createMemoryPort(() => Memory);
export function loop() {
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { intelEnabled: true, intelCaptureInterval: 1, intelMaximumAge: 0,
    intelCaptureRooms: Game.time === 4 ? 0 : 1 };
  saveState(state, 'operator/config', operatorSchema, settings);
  const store = createIntelStore(state), before = ['E0N1','W0N1','W1N1'].map(room => store.peek(room, Game.time).record.lastSeen);
  const beforeCursor = createCaptureProgressStore(state).read();
  botLoop();
  const rooms = ['E0N1','W0N1','W1N1'].map(room => {
    const view = store.peek(room, Game.time, 0), summary = view.record.summary;
    return { room, visible: !!Game.rooms[room], lastSeen: view.record.lastSeen, lastVisit: view.record.lastVisit,
      freshness: view.freshness, owner: summary?.controller?.owner ?? null, sources: summary?.sources.length ?? null };
  });
  const memory = Memory as Memory & { intelCaptureRows?: unknown[]; intelCaptureSentinel?: { initializedAt: number } };
  if (Game.time === 1) memory.intelCaptureSentinel = { initializedAt: Game.time };
  (memory.intelCaptureRows ??= []).push({ tick: Game.time, before, beforeCursor, rooms,
    cursor: createCaptureProgressStore(state).read(), cpuBudget: 3,
    updated: rooms.filter(room => room.lastSeen === Game.time).map(room => room.room) });
}

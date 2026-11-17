import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createIntelStore } from '../../src/features/intel/store';
import { observeNativeIntel } from '../../src/app/native-intel-observation';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { planSchema } from '../../src/features/planning/plan-state';
const state = createMemoryPort(() => Memory);
export function loop() {
  botLoop();
  const store = createIntelStore(state);
  for (const name of ['W0N1','E0N1']) {
    const summary = observeNativeIntel(name);
    if (summary) store.observeSummary(summary, Game.creeps['intel-visitor']?.pos.roomName === name);
  }
  const remote = store.read('E0N1', Game.time, 2), home = store.read('W0N1', Game.time);
  const summary = remote.record.summary!;
  const row = { tick: Game.time, liveVisible: !!Game.rooms.E0N1, lastSeen: remote.record.lastSeen, lastVisit: remote.record.lastVisit,
    freshness: remote.freshness, owned: remote.record.owned, level: summary.controller!.level,
    owner: summary.controller!.owner, reservation: summary.controller!.reservation?.username ?? null,
    sources: summary.sources.length, mineral: summary.mineral?.type, highway: summary.highway, keeper: summary.keeper,
    homeSeen: home.record.lastSeen, homeOwned: home.record.owned };
  const memory = Memory as Memory & { intelObservation?: (typeof row)[] };
  if (Game.time === 1) initializeUnrelatedState();
  (memory.intelObservation ??= []).push(row);
}
function initializeUnrelatedState(): void {
  const schema = planSchema('E0N1', ['road']);
  const plan = openState(state, 'planning/E0N1', schema);
  plan.revision = 17;
  saveState(state, 'planning/E0N1', schema, plan);
  const memory = Memory as Memory & { intelUnrelated?: unknown };
  memory.intelUnrelated = { initializedAt: Game.time, planning: JSON.stringify(state.read('planning/E0N1')) };
}

import { validScoutHeartbeat } from '../../src/features/intel/scout-validation';
import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createScoutHistoryStore } from '../../src/features/intel/scout-store';
import { createIntelStore } from '../../src/features/intel/store';
import { scoutDangerRooms } from '../../src/features/intel/scout-danger';
import { nativeScoutHeartbeat } from '../../src/app/native-scout-heartbeat';
const state = createMemoryPort(() => Memory);
export function loop() {
  const memory = Memory as Memory & { scoutLifecycleRows?: unknown[]; scoutLifecycleInjectedDeath?: { tick: number; result: number }; scoutLifecycleWitness?: { initializedAt: number; value: string } };
  if (Game.time === 1) {
    const settings = openState(state, 'operator/config', operatorSchema);
    settings.empire = { intelEnabled: true, intelCaptureInterval: 1, intelCaptureCpuBudget: 100 };
    saveState(state, 'operator/config', operatorSchema, settings);
    state.write('sentinel/keep', { owner: 'fixture', version: 1, data: { kept: 17 } });
    memory.scoutLifecycleWitness = { initializedAt: 1, value: JSON.stringify(state.read('sentinel/keep')) };
  }
  botLoop();
  const history = createScoutHistoryStore(state);
  for (const name of ['intel-visitor','expiring-scout']) {
    const creep = Game.creeps[name];
    if (creep) {
      const facts = nativeScoutHeartbeat(creep, 'W0N1', 'E0N1');
      if (!validScoutHeartbeat(facts)) throw new Error('Invalid native scout facts: ' + JSON.stringify(facts));
      history.heartbeat(facts);
    }
  }
  if (Game.time === 4) memory.scoutLifecycleInjectedDeath = { tick: Game.time, result: Game.creeps['intel-visitor']!.suicide() };
  const snapshot = history.read(), store = createIntelStore(state), remote = store.peek('E0N1',Game.time);
  (memory.scoutLifecycleRows ??= []).push({ tick: Game.time, visible: !!Game.rooms.E0N1,
    active: snapshot.active, losses: snapshot.losses, danger: scoutDangerRooms('W0N1', snapshot, Game.time, { window: 5000, minimumLosses: 1 }),
    remoteSeen: remote.record.lastSeen, remoteFailure: remote.record.lastFailure, sources: remote.record.summary?.sources.length,
    homeSeen: store.peek('W0N1',Game.time).record.lastSeen });
}

import { loop as botLoop } from '../../src/main';
import { createNativeDispatch } from '../../src/app/native-dispatch';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { upgradeLifecycleSchema } from '../../src/features/work/upgrade-lifecycle-model';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.rooms = { W0N1: { override: { upgradeLifecycleEnabled: true, upgradeCycleAtRcl8: Game.time > 5,
    upgradeFleetStartEnergy: 100, upgradeFleetStopEnergy: 50 } } };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const lifecycle = openState(state, 'upgrade-lifecycle/W0N1', upgradeLifecycleSchema);
  const controller = Game.rooms.W0N1!.controller!;
  const units = Object.values(Game.creeps);
  const dispatch = createNativeDispatch(state);
  let duplicate: number | null = null;
  if (lifecycle.attempt?.tick === Game.time) duplicate = lifecycle.attempt.kind === 'unclaim'
    ? dispatch.controllers.unclaim(controller, 'duplicate')
    : dispatch.controllers.claim(units[0]!, controller, 'duplicate');
  const row = { tick: Game.time, owned: !!controller.my, level: controller.level,
    cycles: lifecycle.cycles, released: lifecycle.releaseObserved, attempt: lifecycle.attempt, duplicate,
    units: units.map(creep => ({ name: creep.name, owner: creep.memory.population?.owner, spawning: creep.spawning,
      x: creep.pos.x, y: creep.pos.y, ttl: creep.ticksToLive, body: creep.body.map(part => part.type) })) };
  const memory = Memory as Memory & { upgradeCycle?: (typeof row)[] };
  (memory.upgradeCycle ??= []).push(row);
}

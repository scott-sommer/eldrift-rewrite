import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { upgradeLifecycleSchema } from '../../src/features/work/upgrade-lifecycle-model';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.rooms = { E0N1: { override: { upgradeLifecycleEnabled: true, upgradeRoomSponsor: 'W0N1',
    upgradeFleetStartEnergy: 100, upgradeFleetStopEnergy: 50 } } };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const lifecycle = openState(state, 'upgrade-lifecycle/E0N1', upgradeLifecycleSchema);
  const target = Game.rooms.E0N1!.controller!;
  const row = { tick: Game.time, gcl: Game.gcl.level, owned: !!target.my, level: target.level,
    sponsorLevel: Game.rooms.W0N1!.controller!.level, cycles: lifecycle.cycles,
    units: Object.values(Game.creeps).filter(creep => creep.name !== 'observer').map(creep => ({
      name: creep.name, home: creep.memory.population?.home, owner: creep.memory.population?.owner,
      spawning: creep.spawning, room: creep.room.name, x: creep.pos.x, y: creep.pos.y, body: creep.body.map(part => part.type) })) };
  const memory = Memory as Memory & { upgradeClaim?: (typeof row)[] };
  (memory.upgradeClaim ??= []).push(row);
}

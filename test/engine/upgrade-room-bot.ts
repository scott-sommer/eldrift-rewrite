import { upgradeBoostContention } from './upgrade-boost-contention';
import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { upgradeRotationSchema } from '../../src/features/work/upgrade-rotation-schema';
import { upgradeOwner } from '../../src/features/work/upgrade-identity';
const state = createMemoryPort(() => Memory);
interface Unit { name: string; ttl: number; x: number; y: number; boost: number }
interface Row { blocked: boolean; tick: number; slots: { unit: string; slot: number }[]; renewing: string | null; boosting: string[]; retiring: string[]; units: Unit[]; progress: number; reserve: number }
declare global { interface Memory { upgradeRoomEvidence?: Row[] } }
export function loop() {
  const rows = Memory.upgradeRoomEvidence ??= [];
  const settings = openState(state, 'operator/config', operatorSchema);
  const reserve = Game.flags.shortage && Game.time < 8 ? 1000000000 : 0;
  settings.empire = { upgradeRoomEnabled: true, upgradeRoomEmpireReserve: reserve,
    upgradeRoomOtherReserve: 0 };
  saveState(state, 'operator/config', operatorSchema, settings);
  const room = Game.rooms.W0N1!;
  const units = Object.values(Game.creeps).sort((a, b) => a.name.localeCompare(b.name));
  for (const creep of units) creep.memory.population = { owner: upgradeOwner(room.name), home: room.name };
  if (!rows.length) {
    const schema = upgradeRotationSchema(room.name);
    const rotation = openState(state, 'upgrade-room/W0N1', schema);
    rotation.slots = units.map((creep, slot) => ({ unit: creep.id, slot }));
    rotation.renewing = units[6]!.id;
    saveState(state, 'upgrade-room/W0N1', schema, rotation);
  }
  const blocked = upgradeBoostContention(state);
  botLoop();
  const rotation = openState(state, 'upgrade-room/W0N1', upgradeRotationSchema(room.name));
  rows.push({ blocked,tick: Game.time, slots: rotation.slots, renewing: rotation.renewing, boosting: rotation.boosting,
    retiring: rotation.retiring, progress: room.controller!.progress, reserve,
    units: units.map(creep => ({ name: creep.name, ttl: creep.ticksToLive!, x: creep.pos.x, y: creep.pos.y,
      boost: creep.body.filter(part => !!part.boost).length })) });
}

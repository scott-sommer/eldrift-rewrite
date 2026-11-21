import { prepareUpgradeLabToggle, observeUpgradeLabToggle } from './upgrade-lab-toggle';
import { nativeUpgradeLab } from '../../src/app/native-specialist-labs';
import { upgradeBoostContention } from './upgrade-boost-contention';
import { industry,loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { upgradeRotationSchema } from '../../src/features/work/upgrade-rotation-schema';
import { upgradeOwner } from '../../src/features/work/upgrade-identity';
const state = createMemoryPort(() => Memory);
interface Unit { name: string; ttl: number; x: number; y: number; boost: number }
interface Row { enabled: boolean; generic?: ReturnType<typeof observeUpgradeLabToggle>; boostLab: string | null; reactionLabs: string[]; labs: readonly { id: string; mineral: string | null; amount: number; energy: number }[]; blocked: boolean; tick: number; slots: { unit: string; slot: number }[]; renewing: string | null; boosting: string[]; retiring: string[]; units: Unit[]; progress: number; reserve: number }
declare global { interface Memory { upgradeRoomEvidence?: Row[] } }
export function loop() { runUpgradeRoom(); }
export function runUpgradeRoom(toggle = false,loss = false) {
  const rows = Memory.upgradeRoomEvidence ??= [];
  const settings = openState(state, 'operator/config', operatorSchema);
  const reserve = Game.flags.shortage && Game.time < 8 ? 1000000000 : 0;
  const enabled = !toggle || Game.time >= 3;
  settings.empire = { upgradeRoomEnabled: enabled, upgradeRoomEmpireReserve: reserve,
    upgradeRoomOtherReserve: 0,labReactionsEnabled: !!Game.flags.upgradeCoexist,labReactionProduct: 'OH',labReactionTarget: 10 };
  saveState(state, 'operator/config', operatorSchema, settings);
  const room = Game.rooms.W0N1!;
  const units = Object.values(Game.creeps).filter(creep => /^u[0-6]$/.test(creep.name)).sort((a, b) => a.name.localeCompare(b.name));
  for (const creep of units) creep.memory.population = { owner: upgradeOwner(room.name), home: room.name };
  if (!rows.length) {
    const schema = upgradeRotationSchema(room.name);
    const rotation = openState(state, 'upgrade-room/W0N1', schema);
    rotation.slots = units.map((creep, slot) => ({ unit: creep.id, slot }));
    rotation.renewing = units[6]!.id;
    saveState(state, 'upgrade-room/W0N1', schema, rotation);
  }
  if (toggle) prepareUpgradeLabToggle(state,loss);
  const blocked = upgradeBoostContention(state);
  botLoop();
  const rotation = openState(state, 'upgrade-room/W0N1', upgradeRotationSchema(room.name));
  const report = industry.labs.inspect(room.name);
  rows.push({ enabled,...(toggle ? { generic: observeUpgradeLabToggle(state) } : {}),boostLab: nativeUpgradeLab(room)?.id ?? null,reactionLabs: report.assignment ? [...report.assignment.inputs,...report.assignment.outputs] : [],labs: report.labs,blocked,tick: Game.time, slots: rotation.slots, renewing: rotation.renewing, boosting: rotation.boosting,
    retiring: rotation.retiring, progress: room.controller!.progress, reserve,
    units: units.map(creep => ({ name: creep.name, ttl: creep.ticksToLive!, x: creep.pos.x, y: creep.pos.y,
      boost: creep.body.filter(part => !!part.boost).length })) });
}

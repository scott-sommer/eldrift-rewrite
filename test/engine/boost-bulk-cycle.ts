import { industry, loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { haulingOwner } from '../../src/features/logistics/identity';
interface BulkRoomRow { home: string; courier: string; roles: { lab: string }[]; reactionLabs: string[]; buffer: { resource: string | null; amount: number; energy: number } | null; bankX: number; bankK: number; bankOH: number; cargo: number }
declare global { interface Memory {
  boostBulkRows?: { tick: number; rooms: BulkRoomRow[] }[];
  boostBulkResult?: { ok: boolean; rooms: unknown[]; dryRunUnchanged: boolean; reapplyUnchanged: boolean; refusalUnchanged: boolean };
} }
const state = createMemoryPort(() => Memory);
export function runBoostBulk(refused: boolean): void {
  const settings = openState(state,'operator/config',operatorSchema);
  settings.empire = { logisticsEnabled: true,workersEnabled: false,labReactionsEnabled: true,labReactionProduct: 'OH',labReactionTarget: 10,labTransportBatch: 20 };
  saveState(state,'operator/config',operatorSchema,settings);
  for (const creep of Object.values(Game.creeps)) creep.memory.population = { owner: haulingOwner(creep.room.name),home: creep.room.name };
  if (!Memory.boostBulkRows) configure(refused);
  botLoop();
  (Memory.boostBulkRows ??= []).push({ tick: Game.time,rooms: ['W0N1','W1N1'].map(roomRow) });
}
function configure(refused: boolean): void {
  const requests = [{ resource: 'XGH2O',mineral: 60,energy: 40 }], before = JSON.stringify(state.read('operator/config'));
  industry.labs.previewAllBoostRoles(requests); const dryRunUnchanged = before === JSON.stringify(state.read('operator/config'));
  const result = industry.labs.assignAllBoostRoles(requests), applied = JSON.stringify(state.read('operator/config'));
  industry.labs.assignBoostRolesForRooms(['W1N1','W0N1'],requests);
  const reapplyUnchanged = applied === JSON.stringify(state.read('operator/config'));
  Memory.boostBulkResult = { ok: result.ok,rooms: result.rooms,dryRunUnchanged,reapplyUnchanged,refusalUnchanged: before === applied };
  if (result.ok === refused || !dryRunUnchanged || !reapplyUnchanged || (refused && before !== applied)) throw new Error('Bulk allocation contract failed');
}
function roomRow(home: string): BulkRoomRow {
  const room = Game.rooms[home]!, report = industry.labs.inspect(home), role = report.boostRoles[0];
  const lab = role ? Game.getObjectById(role.lab as Id<StructureLab>) : null;
  const courier = Object.values(Game.creeps).find(creep => creep.room.name === home)!;
  return { home,courier: courier.name,roles: report.boostRoles.map(item => ({ lab: item.lab })),reactionLabs: report.assignment ? [...report.assignment.inputs,...report.assignment.outputs] : [],
    buffer: lab ? { resource: lab.mineralType ?? null,amount: lab.mineralAmount ?? 0,energy: lab.store.getUsedCapacity(RESOURCE_ENERGY) } : null,
    bankX: room.storage!.store.getUsedCapacity(RESOURCE_CATALYZED_GHODIUM_ACID),bankK: room.storage!.store.getUsedCapacity(RESOURCE_KEANIUM),bankOH: room.storage!.store.getUsedCapacity(RESOURCE_HYDROXIDE),cargo: courier.store.getUsedCapacity() };
}

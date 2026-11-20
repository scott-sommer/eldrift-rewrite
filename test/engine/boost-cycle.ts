import type { LabState } from '../../src/features/industry/lab-state';
import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createBoostRequests } from '../../src/features/industry/boosts/store';
import type { BoostJob, BoostStep } from '../../src/capabilities/industry/boosts/model';
import { workOwner } from '../../src/features/work/identity';
import { haulingOwner } from '../../src/features/logistics/identity';
export type BoostMode = 'normal' | 'supply' | 'multi' | 'cancel' | 'expiry' | 'destroy' | 'contention' | 'coexist';
interface UnitRow { name: string; status: string; ready: boolean; acknowledged: boolean; work: number; move: number; energy: number; x: number; y: number; lab: string | null; attempt: BoostJob['attempt'] }
interface Row { tick: number; progress: number; units: UnitRow[]; labMineral: number; labEnergy: number; bankK: number; bankOH: number; reactionLabs: string[] }
declare global { interface Memory { boostRows?: Row[]; boostCancelled?: boolean; boostDestroyed?: boolean } }
const state = createMemoryPort(() => Memory), requests = createBoostRequests(state);
const owner = workOwner('W0N1','upgrader');
export function runBoosts(mode: BoostMode): void {
  const room = Game.rooms['W0N1']!;
  const targets = Object.values(Game.creeps).filter(creep => creep.name.startsWith('boost-target'));
  for (const creep of targets) creep.memory.population = { owner,home: room.name };
  Game.creeps['boost-courier']!.memory.population = { owner: haulingOwner(room.name),home: room.name };
  const settings = openState(state,'operator/config',operatorSchema);
  settings.empire = { logisticsEnabled: true,workersEnabled: true,workerMode: 'upgrader',workerUpgradeReserve: 0,workerUpgraderTarget: 0,labReactionsEnabled: mode === 'coexist',labReactionProduct: 'OH',labReactionTarget: 10 };
  saveState(state,'operator/config',operatorSchema,settings);
  seed(mode,room,targets); cancel(mode); destroy(mode,room); release(mode);
  botLoop();
  const lab = room.find(FIND_MY_STRUCTURES).find((item): item is StructureLab => item.structureType === STRUCTURE_LAB && item.pos.x === 17 && item.pos.y === 20);
  const plan = (state.read('industry-labs/W0N1') as { data: LabState } | undefined)?.data.assignment;
  (Memory.boostRows ??= []).push({ tick: Game.time,progress: room.controller!.progress,
    units: targets.map(creep => unitRow(creep,requests.get(owner,creep.name)!)),labMineral: lab?.mineralAmount ?? 0,labEnergy: lab?.store.energy ?? 0,bankK: room.storage!.store.getUsedCapacity(RESOURCE_KEANIUM),bankOH: room.storage!.store.getUsedCapacity(RESOURCE_HYDROXIDE),
    reactionLabs: plan ? [...plan.inputs,...plan.outputs] : [] });
}
function seed(mode: BoostMode,room: Room,units: readonly Creep[]): void {
  if (Memory.boostRows) return;
  const lab = room.find(FIND_MY_STRUCTURES).find((item): item is StructureLab => item.structureType === STRUCTURE_LAB && item.pos.x === 17 && item.pos.y === 20)!;
  for (const creep of units) {
    const steps: BoostStep[] = [{ part: WORK,resource: RESOURCE_CATALYZED_GHODIUM_ACID,count: 2 }];
    if (mode === 'multi') steps.push({ part: MOVE,resource: RESOURCE_ZYNTHIUM_OXIDE,count: 1 });
    requests.submit({ id: creep.name,owner,unit: creep.id,name: creep.name,home: room.name,steps,required: true,preferredLab: lab.id,expiresAt: mode === 'expiry' ? 12 : 80 },Game.time);
  }
}
function cancel(mode: BoostMode): void {
  if (mode !== 'cancel' || Memory.boostCancelled) return;
  if (requests.get(owner,'boost-target')?.status !== 'issued') return;
  requests.cancel(owner,'boost-target'); Memory.boostCancelled = true;
}
function destroy(mode: BoostMode,room: Room): void {
  if (mode !== 'destroy' || Game.time !== 4) return;
  const lab = room.find(FIND_MY_STRUCTURES).find(item => item.structureType === STRUCTURE_LAB && item.pos.x === 17 && item.pos.y === 20)!;
  if (lab.destroy() !== OK) throw new Error('Expected native lab destruction');
  Memory.boostDestroyed = true;
}
function release(mode: BoostMode): void {
  if (!['cancel','expiry','destroy'].includes(mode) || Game.time < 40) return;
  const job = requests.get(owner,'boost-target')!;
  if (!job.acknowledged) requests.acknowledge(owner,'boost-target');
}
function unitRow(creep: Creep,job: BoostJob): UnitRow {
  return { name: creep.name,status: job.status,ready: requests.readiness(owner,creep.name) === 'ready',acknowledged: job.acknowledged,
    work: creep.body.filter(part => part.type === WORK && part.boost === RESOURCE_CATALYZED_GHODIUM_ACID).length,
    move: creep.body.filter(part => part.type === MOVE && part.boost === RESOURCE_ZYNTHIUM_OXIDE).length,
    energy: creep.store.energy,x: creep.pos.x,y: creep.pos.y,lab: job.lab,attempt: job.attempt };
}

import { createLaborTaskBehavior } from '../../src/app/labor-task';
import { createTaskRunner } from '../../src/app/task-runner';
import { createLaborTaskStaging } from '../../src/features/work/stage-labor-task';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { movementPosition } from '../../src/adapters/screeps/movement-traffic';
import type { NativeLaborProof } from './native-labor-model';
import type { LaborTaskPayload } from '../../src/features/work/labor-task';
/** Controlled SDK ports; financial phase deltas do not choose these actions. */
export function runNativeLaborTask(proof: NativeLaborProof, creep: Creep | undefined, storage: StructureStorage): void {
  const state = createMemoryPort(() => proof.stagedTask!.root), name = proof.proposal!.input.request.name;
  if (Game.time === 11) {
    const task = createLaborTaskStaging(state).read(name)?.queue[0], payload = task?.payload as LaborTaskPayload;
    if (task?.phase !== 'pickup' || payload.progress?.pending?.kind !== 'pickup') throw new Error('Expected restored pending pickup');
    proof.actorReloadAt = Game.time;
  }
  const behavior = createLaborTaskBehavior<null>({ now: () => Game.time,
    worker: () => creep ? { id: creep.id,name: creep.name,owner: creep.memory.population!.owner,body: creep.body.filter(part => part.hits > 0).map(part => part.type),position: movementPosition(creep.pos),energy: creep.store.energy,spawning: creep.spawning } : undefined,
    authorized: () => !!storage.room.controller?.my,
    remainingWork: (_,order) => { const site = Game.getObjectById(order.id as Id<ConstructionSite>); return site && site.progressTotal-site.progress || undefined; },
    move: (_,point) => { effect(proof,'move',creep!.moveTo(new RoomPosition(point.x,point.y,point.room),{ range: 0 }),0); },
    pickup: (_,source,energy) => effect(proof,'pickup',creep!.withdraw(Game.getObjectById(source as Id<StructureStorage>)!,RESOURCE_ENERGY,energy),energy),
    work: (_,order) => { const site = Game.getObjectById(order.id as Id<ConstructionSite>)!; return effect(proof,'build',creep!.build(site),Math.min(creep!.store.energy,creep!.getActiveBodyparts(WORK)*BUILD_POWER,site.progressTotal-site.progress)); },
    deposit: (_,source,energy) => effect(proof,'return',creep!.transfer(Game.getObjectById(source as Id<StructureStorage>)!,RESOURCE_ENERGY,energy),energy),
    completed: (_,progress) => { proof.actorResult = { tick: Game.time,...progress }; },
  });
  const result = createTaskRunner(state,{ 'household-labor': behavior },() => Game.time)(name,null);
  if (result?.status === 'failed') throw new Error('Native labor task failed: '+result.reason);
}
function effect(proof: NativeLaborProof, action: string, code: number, energy: number): boolean {
  proof.calls.push({ tick: Game.time,action,code,energy }); return code === OK;
}

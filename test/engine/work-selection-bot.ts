import { loop as botLoop } from '../../src/main';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createCreepActions } from '../../src/adapters/screeps/creep-actions';
import { observeWorkAssessment } from '../../src/adapters/screeps/work-assessment';
import { selectWork } from '../../src/features/work/select';
import { defaultWorkPolicy } from '../../src/features/work/policy';
import { movementPosition } from '../../src/adapters/screeps/movement-traffic';
import { workStep } from '../../src/capabilities/work/step';
const arbiter = createActionArbiter(() => Game.time);
export function loop() {
  botLoop();
  const creep = Game.creeps['build']!;
  const view = observeWorkAssessment(creep.room);
  const order = selectWork(view, movementPosition(creep.pos), 'builder', defaultWorkPolicy)!;
  const target = Game.getObjectById(order.id as Id<ConstructionSite | Structure>)!;
  const actions = createCreepActions(creep, 'work-fixture', arbiter);
  const act = order.kind === 'build' ? () => actions.build(target as ConstructionSite) : order.kind === 'repair'
    ? () => actions.repair(target as Structure) : () => actions.upgrade(target as StructureController);
  const result = workStep({ tick: Game.time, complete: false, target: 'visible', energy: creep.store.energy,
    inRange: creep.pos.inRangeTo(target, 3) }, { act, approach: () => ({ status: 'failed', reason: 'unexpected-travel' }),
    rejected: code => ({ status: 'failed', reason: String(code) }) });
  const road = creep.room.find(FIND_STRUCTURES).find(item => item.structureType === STRUCTURE_ROAD && item.pos.x === 20)!;
  const memory = Memory as Memory & { workSelection?: { kind: string; target: string; result: string; sites: number; hits: number; progress: number }[] };
  (memory.workSelection ??= []).push({ kind: order.kind, target: target.structureType + ':' + target.pos.x + ',' + target.pos.y, result: result.status, sites: view.sites.length,
    hits: road.hits, progress: creep.room.controller!.progress });
}

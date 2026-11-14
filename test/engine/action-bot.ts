import { loop as botLoop } from '../../src/main';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createCreepActions } from '../../src/adapters/screeps/creep-actions';
const arbiter = createActionArbiter(() => Game.time);
export function loop() {
  botLoop();
  const creep = Game.creeps['action-worker']!;
  const evidence = Memory as Memory & { actionEvidence?: { before: number; afterIssue: number; issued: string; conflict: string; observed?: number } };
  if (evidence.actionEvidence) { evidence.actionEvidence.observed = creep.store.energy; return; }
  const actions = createCreepActions(creep, 'harvest-test', arbiter);
  const source = creep.pos.findClosestByRange(FIND_SOURCES)!;
  const before = creep.store.energy;
  const issued = actions.harvest(source);
  const conflict = actions.repair(Game.spawns['Spawn1']!);
  evidence.actionEvidence = { before, afterIssue: creep.store.energy, issued: issued.status, conflict: conflict.status };
}

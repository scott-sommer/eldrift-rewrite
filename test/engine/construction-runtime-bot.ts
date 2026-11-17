import { constructionDefaults } from '../../src/config/construction';
import { loop as runtimeLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createPlanStore } from '../../src/features/planning/plan-store';
import { createPlanProposal } from '../../src/features/planning/plan-proposal';
import { createConstructionProgressStore } from '../../src/features/construction/progress-store';
export function loop() {
  const state = createMemoryPort(() => Memory), plans = createPlanStore(state, 'W0N1', Object.keys(CONTROLLER_STRUCTURES));
  if (plans.read().revision === 0) {
    const proposal = createPlanProposal({ strategy: 'fixture', entries: [
      { type: 'spawn', position: { x: 15, y: 15 }, rcl: 1, priority: -100 },
      { type: 'storage', position: { x: 25, y: 25 }, rcl: 4, priority: -90 },
      ...[23, 24].map(x => ({ type: 'road', position: { x, y: 25 }, rcl: 1, priority: 1 })),
      { type: 'rampart', position: { x: 27, y: 25 }, rcl: 6, priority: 50, minimumStoredEnergy: 50000 }],
    provenance: { candidateId: 'fixture', strategyVersion: 'fixture-v1', observation: 'fixture-observation', policy: 'fixture-policy',
      generatedAt: Game.time, anchor: { x: 25, y: 25 }, transform: 0,
      costs: { hauling: 0, service: 0, capacityShortfall: 0, swamps: 0, defense: 1, migration: 0 } } });
    if (!plans.commit(0, proposal, { tick: Game.time, observation: 'fixture-observation', policy: 'fixture-policy' }, () => true).ok) {
      throw new Error('Fixture plan commit failed');
    }
  }
  const settings = openState(state, 'operator/config', operatorSchema);
  const defaultBudget = !!(globalThis as typeof globalThis & { constructionDefaultBudget?: boolean }).constructionDefaultBudget;
  settings.empire = { constructionEnabled: true, constructionCpuBudget: defaultBudget ? constructionDefaults.constructionCpuBudget : 100, constructionEntries: 20,
    constructionAttempts: 1, constructionRoomSites: 1 };
  saveState(state, 'operator/config', operatorSchema, settings);
  const started = Game.cpu.getUsed();
  runtimeLoop();
  const used = Game.cpu.getUsed() - started;
  const progress = createConstructionProgressStore(state, 'W0N1').read(), plan = plans.read();
  const memory = Memory as Memory & { constructionRuntimeRows?: unknown[] };
  (memory.constructionRuntimeRows ??= []).push({ tick: Game.time, used, revision: progress.revision, next: progress.next,
    level: Game.rooms.W0N1!.controller!.level, energy: Game.rooms.W0N1!.storage?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0,
    sites: Object.values(Game.constructionSites).map(site => site.structureType), planRevision: plan.revision,
    entries: plan.entries.length, bootstrap: plan.provenance?.bootstrap.spawn, snapshot: JSON.stringify(plan),
    roads: Game.rooms.W0N1!.find(FIND_STRUCTURES).filter(item => item.structureType === STRUCTURE_ROAD).map(item => item.pos.x + ':' + item.pos.y),
    roadSites: Object.values(Game.constructionSites).filter(site => site.structureType === STRUCTURE_ROAD).map(site => site.pos.x + ':' + site.pos.y) });
}

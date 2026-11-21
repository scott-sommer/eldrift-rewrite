import { createBoostRequests } from '../../src/features/industry/boosts/store';
import type { StatePort } from '../../src/persistence/versioned-state';
import { nativeUpgradeLab } from '../../src/app/native-specialist-labs';
const owner = 'fixture-upgrade-toggle', id = 'standing-generic';
export function prepareUpgradeLabToggle(state: StatePort): void {
  const creep = Game.creeps['standing-generic']!;
  creep.memory.population = { owner,home: 'W0N1' };
  createBoostRequests(state).submit({ id,owner,unit: creep.id,name: creep.name,home: 'W0N1',preferredLab: nativeUpgradeLab(Game.rooms.W0N1!)!.id,
    steps: [{ part: 'work',resource: 'XGH2O',count: 2 }],required: true,expiresAt: 100 },Game.time);
}
export function observeUpgradeLabToggle(state: StatePort) {
  const job = createBoostRequests(state).get(owner,id)!;
  return { status: job.status,lab: job.lab,boosted: Game.creeps['standing-generic']!.body.filter(part => part.type === 'work' && part.boost === 'XGH2O').length };
}

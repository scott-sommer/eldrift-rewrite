import { createBoostRequests } from '../../src/features/industry/boosts/store';
import type { StatePort } from '../../src/persistence/versioned-state';
import { nativeUpgradeLab } from '../../src/app/native-specialist-labs';
const owner = 'fixture-upgrade-toggle', id = 'standing-generic';
export function prepareUpgradeLabToggle(state: StatePort,acknowledgeFailure = false): void {
  const creep = Game.creeps['standing-generic']!;
  creep.memory.population = { owner,home: 'W0N1' };
  const requests = createBoostRequests(state), existing = requests.get(owner,id);
  if (existing) {
    if (acknowledgeFailure && existing.status === 'failed' && !existing.acknowledged) requests.acknowledge(owner,id);
    return;
  }
  requests.submit({ id,owner,unit: creep.id,name: creep.name,home: 'W0N1',preferredLab: nativeUpgradeLab(Game.rooms.W0N1!)!.id,
    steps: [{ part: 'work',resource: 'XGH2O',count: 2 }],required: true,expiresAt: 100 },Game.time);
}
export function observeUpgradeLabToggle(state: StatePort) {
  const job = createBoostRequests(state).get(owner,id)!;
  return { status: job.status,reason: job.reason,acknowledged: job.acknowledged,lab: job.lab,boosted: Game.creeps['standing-generic']!.body.filter(part => part.type === 'work' && part.boost === 'XGH2O').length };
}

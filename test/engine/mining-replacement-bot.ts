import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { observeMiningStations } from '../../src/adapters/screeps/mining-stations';
import { miningOwner } from '../../src/features/mining/demand';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { miningEnabled: true, mineralMiningEnabled: true, miningBodyBudget: 200 };
  saveState(state, 'operator/config', operatorSchema, settings);
  const incumbent = Game.creeps['incumbent'];
  if (incumbent) {
    const station = observeMiningStations('W0N1', 'safe')!.find(item => item.kind === 'mineral')!;
    incumbent.memory.population = { owner: miningOwner(station), home: 'W0N1' };
  }
  botLoop();
  const memory = Memory as Memory & { replacementEvidence?: { sawIncumbent: boolean; replacements: string[]; harvested: number; queued: number; waitingTicks: number } };
  const evidence = memory.replacementEvidence ??= { sawIncumbent: false, replacements: [], harvested: 0, queued: 0, waitingTicks: 0 };
  evidence.sawIncumbent ||= !!incumbent;
  for (const creep of Object.values(Game.creeps).filter(creep => creep.name !== 'incumbent')) {
    if (!evidence.replacements.includes(creep.name)) evidence.replacements.push(creep.name);
    if (incumbent && !creep.spawning) {
      evidence.waitingTicks++;
      const record = state.read('reservations/empire') as { data: { claims: { holder: string }[] } };
      if (record.data.claims.some(claim => claim.holder === creep.name)) throw new Error('Replacement stole incumbent lease');
      if (creep.pos.isEqualTo(incumbent.pos)) throw new Error('Replacement overlapped incumbent tile');
    }
    evidence.harvested = Math.max(evidence.harvested, creep.store.H ?? 0);
  }
  evidence.queued = createSpawnQueue(state, 'W0N1').list().length;
}


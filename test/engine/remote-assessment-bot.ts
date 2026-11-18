import { openState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createIntelStore } from '../../src/features/intel/store';
import { observeNativeIntel } from '../../src/app/native-intel-observation';
import { createNativeRemoteAssessment } from '../../src/app/native-remote-assessment';
import { selectRemotePortfolio } from '../../src/features/remotes/portfolio';
import type { RemoteAssessment } from '../../src/features/remotes/assessment-model';
import { sourceMiner, courier } from '../../src/capabilities/spawning/economy-recipes';
import type { RemoteAssessmentRequest } from '../../src/features/remotes/assessment-model';
const state = createMemoryPort(() => Memory), intel = createIntelStore(state);
const assess = createNativeRemoteAssessment(state,{ maximumRooms: 8,maximumOps: 10000 });
const limited = createNativeRemoteAssessment(state,{ maximumRooms: 8,maximumOps: 1 });
export function loop() {
  for (const room of Object.keys(Game.rooms)) {
    const summary = observeNativeIntel(room);
    if (summary) intel.observeSummary(summary);
  }
  if (Game.time === 1) {
    openState(state,'operator/config',operatorSchema);
    state.write('sentinel/remote-assessment',{ owner: 'fixture',version: 1,data: { kept: ['remote',19] } });
  }
  const facts = intel.peek('E0N1',Game.time).record.summary!;
  const sources = [...facts.sources].sort((a,b) => a.x-b.x);
  const first = request(sources[0]!.id), second = request(sources[1]!.id);
  const before = JSON.stringify(Memory.eldrift), began = Game.cpu.getUsed();
  const near = assess(first), far = assess(second);
  const portfolio = portfolios(near,far);
  const rejected = Game.time === 1 ? assess({ ...first,economics: { ...first.economics,riskPerTick: 100 } }) : null;
  const unaffordable = Game.time === 1 ? assess({ ...first,economics: { ...first.economics,
    miner: { ...first.economics.miner,body: sourceMiner(800)!.parts } } }) : null;
  const partial = Game.time === 2 ? limited(first) : null;
  const paused = Game.time === 1 ? assess(first,() => false) : null;
  const stale = Game.time === 8 ? assess({ ...first,traversal: { ...first.traversal,maximumAge: 0 } }) : null;
  const memory = Memory as Memory & { remoteAssessmentRows?: unknown[] };
  (memory.remoteAssessmentRows ??= []).push({ tick: Game.time,visible: !!Game.rooms.E0N1,
    observedAt: facts.observedAt,capacity: sources[0]!.capacity,near,far,portfolio,rejected,unaffordable,partial,paused,stale,
    cpu: Game.cpu.getUsed()-began,unchanged: before === JSON.stringify(Memory.eldrift),witness: state.read('sentinel/remote-assessment') });
}
function request(source: string): RemoteAssessmentRequest {
  return { home: 'W0N1',room: 'E0N1',source,tick: Game.time,
    traversal: { mode: 'known-safe',username: Game.rooms.W0N1!.controller!.owner!.username,allies: [],blockedRooms: [],avoidUntil: {},
      allowKeeper: false,maximumAge: 50,maximumRooms: 128,unknownCost: 8,staleCost: 4,keeperCost: 25 },
    economics: { regenerationTicks: ENERGY_REGEN_TIME,harvestPower: HARVEST_POWER,
      miner: { body: sourceMiner(550)!.parts,lifetime: CREEP_LIFE_TIME,replacementMargin: 25 },
      hauler: { body: courier(200)!.parts,lifetime: CREEP_LIFE_TIME,replacementMargin: 25,serviceTicks: 2 },
      reservation: { energyPerTick: 1,spawnLoad: 0.01,shares: 2 },infrastructurePerTick: 0.05,riskPerTick: 0,
      limits: { maximumHaulers: 20,maximumSpawnLoad: 1,minimumNetYield: 0.1 } } };
}

function portfolios(near: RemoteAssessment, far: RemoteAssessment) {
  if (near.status !== 'assessed' || far.status !== 'assessed') return null;
  const offers = [{ room: near.room,sourceIds: [near.source,far.source],quotes: [{ assessment: near },{ assessment: far }],
    commitment: { atomic: false,slots: 0,energyPerTick: 0,spawnLoad: 0 } }];
  const policy = { home: near.home,tick: Game.time,maximumAge: 50,maximumSlots: 2,maximumHaulers: 40,
    maximumSpawnLoad: 2,minimumNetYield: 0.1,completionBonus: 0.15,order: 'nearest' as const };
  return { full: selectRemotePortfolio(offers,policy),fragment: selectRemotePortfolio(offers,{ ...policy,maximumSlots: 1 }),
    refused: selectRemotePortfolio(offers,{ ...policy,maximumSlots: 0 }) };
}

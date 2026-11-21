import { createStartupSpawnTimeline } from '../../src/capabilities/economy/startup/spawn-timeline';
import type { HouseholdTravelQuote } from '../../src/capabilities/economy/startup/household/travel';
import { observeHouseholdTravelProbe } from './household-travel-probe';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createNativeStartupCohort } from '../../src/app/remotes/startup/proposals/cohort';
import type { NativeStartupQuote } from '../../src/app/remotes/startup/projection/model';
import type { StatePort } from '../../src/persistence/versioned-state';
import { createStartupSchedulePlanner } from '../../src/features/remotes/startup/schedules/runner';
import { encodeStartupPlanningInput, decodeStartupPlanningInput } from '../../src/features/remotes/startup/planning/input';
import type { StartupPlanningContext, StartupPlanningInput } from '../../src/features/remotes/startup/planning/model';
type Progress = ReturnType<ReturnType<typeof createStartupSchedulePlanner>['advance']>;
interface ScheduleProbe {
  root: { eldrift?: unknown }; seed: StartupPlanningInput; context: StartupPlanningContext; frames: number;
  rows: { tick: number; frames: number; extensions: number; status: string }[];
  result?: Extract<Progress,{ status: 'complete' }>['result']; readOnly?: boolean; namespace?: unknown;
}
interface ProbeMemory extends Memory { startupScheduleProbe?: ScheduleProbe; householdScheduleProbe?: ScheduleProbe }
/** Isolated planning-only root avoids competing with the existing independent projection proof. */
export function beginStartupScheduleProbe(state: StatePort, quote: NativeStartupQuote): void {
  const measured = observeHouseholdTravelProbe(state,quote);
  const proposal = createNativeStartupCohort(state)('whole-horizon',quote,{ horizon: 4000,validityTicks: 200,protectedEnergy: 350,retirementMargin: 4,
    minimumBatch: 25,minerPriority: 20,courierPriority: 30,courierReadyAt: 0,assumeAssignmentRenewal: true,repairPolicy: { criticalFraction: 0.2,energyReserve: 20 } });
  if (proposal.status !== 'ready') throw new Error('Expected whole-horizon native proposal');
  const { input,room,source,generation,binding,observedAt,expiresAt } = proposal.candidate.query;
  const context = { room,source,generation,binding,observedAt,expiresAt };
  const probe: ScheduleProbe = { root: {},seed: encodeStartupPlanningInput(input),context,frames: 0,rows: [] };
  (Memory as ProbeMemory).startupScheduleProbe = probe; advance(probe,64);
  const household = householdProbe(probe,quote,measured); (Memory as ProbeMemory).householdScheduleProbe = household; advance(household,64);
}
export function resumeStartupScheduleProbe(): void {
  const memory = Memory as ProbeMemory;
  for (const probe of [memory.startupScheduleProbe,memory.householdScheduleProbe]) {
    if (probe && Game.time > probe.context.observedAt) advance(probe,5000);
  }
}
function advance(probe: ScheduleProbe, frames: number): void {
  const state = createMemoryPort(() => probe.root), owner = createStartupSchedulePlanner(state,'W0N1');
  const query = { ...probe.context,tick: Game.time,input: decodeStartupPlanningInput(probe.seed) };
  const progress = owner.advance(query,{ frames,extensions: 16 });
  probe.frames += progress.frames; probe.rows.push({ tick: Game.time,frames: progress.frames,extensions: progress.extensions,status: progress.status });
  if (progress.status !== 'complete') return;
  probe.result = progress.result;
  const before = JSON.stringify(probe.root), cached = owner.advance(query,{ frames: 0,extensions: 0 });
  probe.readOnly = cached.status === 'complete' && !!owner.result(query) && before === JSON.stringify(probe.root);
  const envelope = state.read('remoteStartupSchedules/W0N1') as { owner: string; version: number };
  probe.namespace = { owner: envelope.owner,version: envelope.version,revision: owner.read().revision,complete: owner.read().job?.complete };
}

/** Measured static geometry; destination accounting remains an explicit aggregate funding hypothesis. */
function householdProbe(seed: ScheduleProbe, quote: NativeStartupQuote, measured: HouseholdTravelQuote): ScheduleProbe {
  const input = decodeStartupPlanningInput(seed.seed), spawning = input.project.spawning;
  spawning.requests = [{ id: 'household-probe',name: 'household-probe',owner: 'household-model',room: quote.plan.home,body: [...quote.plan.courier],
    priority: 10,readyAt: 0,expiresAt: 4001,placement: { spawn: quote.plan.spawn.id,exit: { ...quote.plan.spawn.exit } } },...spawning.requests];
  const endpointEnergy = Math.max(0,Math.min(quote.facts.endpoint.energy-quote.facts.stock.claimedEnergy,spawning.cash.homeEnergy-spawning.funding.initialEnergy));
  const preview = createStartupSpawnTimeline(spawning), born = preview.begin(0).find(birth => birth.request === 'household-probe'); preview.finish();
  if (!born) throw new Error('Fixture requires its household birth in the initial admission');
  const firstPickup = born.activeAt+measured.legs.find(leg => leg.kind === 'approach')!.ticks;
  const loadedTicks = measured.legs.find(leg => leg.kind === 'loaded')!.ticks, returnTicks = measured.legs.find(leg => leg.kind === 'return')!.ticks;
  const interval = 1+loadedTicks+1+returnTicks;
  input.household = { endpointEnergy,redistribution: { horizon: 4000,trips: [0,1,2,3].map(index => ({ id: 'home-trip'+index,request: 'household-probe',pickupAt: firstPickup+index*interval,loadedTicks,returnTicks,energy: 100 })) } };
  return { root: {},seed: encodeStartupPlanningInput(input),context: { ...seed.context,binding: seed.context.binding+':measured-home-geometry-aggregate-v2' },frames: 0,rows: [] };
}

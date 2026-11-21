import { createStartupCandidateCatalog } from '../../src/features/remotes/startup/candidates/catalog';
import { createNativeStartupProjection } from '../../src/app/remotes/startup/projection/native';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { decodeStartupPlanningInput } from '../../src/features/remotes/startup/planning/input';
import type { NativeStartupQuote, NativeStartupProjectionOptions } from '../../src/app/remotes/startup/projection/model';
import type { StatePort } from '../../src/persistence/versioned-state';
interface ProjectionMemory extends Memory { nativeProjection?: Record<string,unknown> }
/** Declared finite unreserved cohort, not the ordinary runtime's staged/replacement policy. */
export function nativeProjectionOptions(quote: NativeStartupQuote): NativeStartupProjectionOptions {
  const plan = quote.plan, minerReturn = quote.legs.find(leg => leg.kind === 'miner-return')!.ticks, courierReturn = quote.legs.find(leg => leg.kind === 'courier-loaded')!.ticks;
  const request = (kind: 'miner' | 'courier',priority: number) => ({ id: 'projection-'+kind,name: 'projection-'+kind,owner: 'projection-fixture',room: plan.home,body: plan[kind],priority,readyAt: 0,expiresAt: 1501 });
  return { horizon: 1500,protectedEnergy: 350,unaffordable: 'skip',repairPolicy: { criticalFraction: 0.2,energyReserve: 20 },refills: [],householdFlows: [],sinkChanges: [],births: [
    { kind: 'miner',request: request('miner',20),retireTicks: minerReturn+5 },{ kind: 'courier',request: request('courier',30),retireTicks: courierReturn+5,minimumBatch: 25 },
  ] };
}
export function beginNativeProjection(state: StatePort, quote: NativeStartupQuote): void {
  const projection = createNativeStartupProjection(state)(quote,nativeProjectionOptions(quote));
  if (projection.status !== 'ready' || !quote.facts.authority) throw new Error('Expected ordinary pre-birth native project conversion');
  const owner = createStartupPlanningJob(state,quote.plan.home);
  const request = { room: quote.plan.room,source: quote.plan.source,generation: quote.facts.authority.generation,binding: 'native-prospective:'+quote.identity,
    observedAt: Game.time,expiresAt: Game.time+200,tick: Game.time,expectedRevision: 0,input: projection.input };
  const result = owner.advance(request,64);
  if (owner.assess(request,returnPolicy()) !== undefined) throw new Error('Incomplete native forecast must not be assessed');
  if (result.status !== 'deferred' || result.frames !== 64) throw new Error('Expected saved native projection progress');
  (Memory as ProjectionMemory).nativeProjection = { observedAt: Game.time,costScope: projection.costScope,quoteIdentity: quote.identity,facts: quote.facts,input: owner.read().job!.input,
    declaredPolicy: { finiteBirths: 2,reservation: 'none',refills: 'none',householdFlows: 'none' },steps: [{ tick: Game.time,through: 64,revision: 1,status: result.status }] };
}
/** Continues the original observation scenario only; never treats its result as current birth authority. */
export function resumeNativeProjection(state: StatePort): void {
  const proof = (Memory as ProjectionMemory).nativeProjection; if (!proof) return;
  const owner = createStartupPlanningJob(state,'W0N1'), record = owner.read(), job = record.job; if (!job || record.clock === Game.time) return;
  const query = { ...job,tick: Game.time,input: decodeStartupPlanningInput(job.input) }, before = JSON.stringify(Memory.eldrift);
  if (job.checkpoint.tick === query.input.project.spawning.cash.horizon+1) {
    proof.assessment = owner.assess(query,returnPolicy());
    const catalog = createStartupCandidateCatalog(state,'W0N1');
    proof.candidateChoice = catalog.choose([{ id: 'finite-cohort',query }],returnPolicy(),'final-return');
    proof.candidateRevision = catalog.read().revision;
    proof.expiredCandidateAbsent = catalog.lookup('finite-cohort',{ ...query,tick: query.expiresAt+1 },returnPolicy()) === undefined;
    proof.expiredAssessmentAbsent = owner.assess({ ...query,tick: query.expiresAt+1 },returnPolicy()) === undefined;
    proof.readOnly = !!owner.result(query) && before === JSON.stringify(Memory.eldrift); return;
  }
  const result = owner.advance({ ...query,expectedRevision: record.revision },500), after = owner.read();
  (proof.steps as unknown[]).push({ tick: Game.time,through: after.job!.checkpoint.tick,revision: after.revision,status: result.status });
  if (result.status === 'complete') {
    proof.result = result.result;
    const captured = createStartupCandidateCatalog(state,'W0N1').capture('finite-cohort',query,returnPolicy(),0);
    if (captured !== 'saved') throw new Error('Expected completed native candidate capture');
    proof.candidateCapturedAt = Game.time;
  }
}

function returnPolicy() { return { minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 1500,maximumHouseholdCapital: 100000 }; }

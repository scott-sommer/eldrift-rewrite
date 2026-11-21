import { snapshotStartupProject } from '../../../../capabilities/economy/startup/snapshot';
import { startupProjectIdentity } from '../../../../capabilities/economy/startup/checkpoints/project-identity';
import { extendStartupReplacements } from '../../../../capabilities/economy/startup/replacements';
import type { StatePort } from '../../../../persistence/versioned-state';
import { natural } from '../../assignment-validation';
import { createStartupPlanningJob } from '../planning/runner';
import { decodeStartupPlanningInput, encodeStartupPlanningInput } from '../planning/input';
import { planningContextKey, validPlanningContext } from '../planning/validation';
import type { StartupPlanningQuery } from '../planning/model';
import { createStartupScheduleStore } from './store';
import type { StartupSchedule } from './store';
export interface StartupScheduleBudget { frames: number; extensions: number }
/** Serial finite schedule construction; final-only output and no native effects. */
export function createStartupSchedulePlanner(state: StatePort, home: string) {
  const store = createStartupScheduleStore(state,home), planner = createStartupPlanningJob(state,home);
  function advance(input: StartupPlanningQuery, budget: StartupScheduleBudget, guard: () => boolean = () => true) {
    validate(input,budget,home);
    const seed = { ...input,input: snapshotStartupProject(input.input) }, limits = { ...budget };
    if (seed.tick > seed.expiresAt) return deferred('expired',0,0);
    if (!guard()) return deferred('admission',0,0);
    const record = store.read();
    if (seed.tick < record.clock) return deferred('clock',0,0);
    const identity = startupProjectIdentity(seed.input);
    const cached = result(seed);
    if (cached) return { status: 'complete' as const,...cached,frames: 0,extensions: 0 };
    const job = matches(record.job,seed,identity) ? record.job! : newJob(seed,identity);
    return run(seed,job,record.revision,limits,guard);
  }
  function run(seed: StartupPlanningQuery, initial: StartupSchedule, expected: number, budget: StartupScheduleBudget, guard: () => boolean) {
    let job = initial,revision = expected,frames = 0,extensions = 0;
    while (guard()) {
      const query = { ...seed,input: decodeStartupPlanningInput(job.input) };
      const progress = planner.advance({ ...query,expectedRevision: planner.read().revision },budget.frames-frames,guard);
      frames += progress.frames;
      if (progress.status === 'deferred' && progress.frames === 0) return deferred(progress.reason,frames,extensions);
      const saved = store.save(revision,seed.tick,job);
      if (saved !== 'saved') return deferred(saved,frames,extensions);
      revision++;
      if (progress.status === 'deferred') return deferred(progress.reason,frames,extensions);
      if (job.complete) return { status: 'complete' as const,query,result: progress.result,frames,extensions };
      if (!guard()) return deferred('admission',frames,extensions);
      const next = derive(query,job);
      if (next.status === 'deferred') return deferred(next.reason,frames,extensions);
      if (next.status === 'complete') return finish(query,job,revision,progress.result,frames,extensions);
      if (extensions >= budget.extensions) return deferred('extensions',frames,extensions);
      job = { ...job,input: encodeStartupPlanningInput(next.input) }; extensions++;
      const updated = store.save(revision,seed.tick,job);
      if (updated !== 'saved') return deferred(updated,frames,extensions);
      revision++;
      if (frames >= budget.frames) return deferred('budget',frames,extensions);
    }
    return deferred('admission',frames,extensions);
  }
  function derive(query: StartupPlanningQuery, job: StartupSchedule) {
    const current = planner.read().job;
    if (!current || planningContextKey(current) !== planningContextKey(query) || current.checkpoint.binding !== startupProjectIdentity(query.input)) return { status: 'deferred' as const,reason: 'conflict' };
    return extendStartupReplacements(decodeStartupPlanningInput(job.input),current.checkpoint);
  }
  function finish(query: StartupPlanningQuery, job: StartupSchedule, revision: number, result: NonNullable<ReturnType<typeof planner.result>>, frames: number, extensions: number) {
    const saved = store.save(revision,query.tick,{ ...job,complete: true });
    return saved === 'saved' ? { status: 'complete' as const,query,result,frames,extensions } : deferred(saved,frames,extensions);
  }
  function result(seed: StartupPlanningQuery) {
    validate(seed,{ frames: 0,extensions: 0 },home);
    const record = store.read(), job = record.job;
    if (seed.tick < record.clock || seed.tick > seed.expiresAt || !job?.complete || !matches(job,seed,startupProjectIdentity(seed.input))) return undefined;
    const query = { ...seed,input: decodeStartupPlanningInput(job.input) }, completed = planner.result(query);
    return completed ? { query,result: completed } : undefined;
  }
  return { read: store.read,advance,result,withdraw: store.withdraw };
}
function validate(query: StartupPlanningQuery, budget: StartupScheduleBudget, home: string): void {
  if (![budget.frames,budget.extensions].every(natural) || budget.frames > 10001 || budget.extensions > 16) throw new Error('Invalid startup schedule budget');
  if (!natural(query.tick) || !validPlanningContext(query,home,query.tick) || query.input.project.spawning.room !== home) throw new Error('Invalid startup schedule query');
}
function matches(job: StartupSchedule | null, seed: StartupPlanningQuery, identity: string): boolean { return !!job && planningContextKey(job) === planningContextKey(seed) && job.seedIdentity === identity; }
function newJob(seed: StartupPlanningQuery, seedIdentity: string): StartupSchedule {
  const { room,source,generation,binding,observedAt,expiresAt } = seed;
  return { room,source,generation,binding,observedAt,expiresAt,seedIdentity,input: encodeStartupPlanningInput(seed.input),complete: false };
}
function deferred(reason: string, frames: number, extensions: number) { return { status: 'deferred' as const,reason,frames,extensions }; }

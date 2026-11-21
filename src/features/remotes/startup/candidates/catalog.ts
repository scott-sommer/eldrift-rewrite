import { startupProjectIdentity } from '../../../../capabilities/economy/startup/checkpoints/project-identity';
import { validateStartupReturnPolicy } from '../../../../capabilities/economy/startup/assessment';
import type { StartupReturnPolicy } from '../../../../capabilities/economy/startup/assessment';
import { chooseAssessedStartupProjects } from '../../../../capabilities/economy/startup/choice';
import type { StartupProjectOrder } from '../../../../capabilities/economy/startup/choice';
import type { StatePort } from '../../../../persistence/versioned-state';
import { createStartupPlanningJob } from '../planning/runner';
import { planningContextKey, validPlanningContext } from '../planning/validation';
import type { StartupPlanningQuery } from '../planning/model';
import { natural } from '../../assignment-validation';
import { createStartupCandidateStore } from './store';
import { candidateId } from './validation';
import { startupPolicyIdentity } from './model';
import type { StartupCandidateQuery, StartupCandidateWrite } from './model';
/** Completed evidence only; lookup requires fresh caller-derived input and grants no execution authority. */
export function createStartupCandidateCatalog(state: StatePort, home: string) {
  const store = createStartupCandidateStore(state,home), planner = createStartupPlanningJob(state,home);
  function capture(id: string, query: StartupPlanningQuery, policy: StartupReturnPolicy, expected: number): StartupCandidateWrite {
    validateQuery(id,query,policy,home);
    if (!natural(expected)) throw new Error('Invalid startup candidate revision');
    const record = store.read();
    if (record.revision !== expected || query.tick < record.clock) return 'conflict';
    const assessment = planner.assess(query,policy);
    if (!assessment) return 'unavailable';
    const { room,source,generation,binding,observedAt,expiresAt } = query;
    const entry = { id,room,source,generation,binding,observedAt,expiresAt,recordedAt: query.tick,
      inputIdentity: startupProjectIdentity(query.input),policyIdentity: startupPolicyIdentity(policy),assessment };
    const entries = record.entries.filter(item => item.id !== id && item.expiresAt >= query.tick);
    return store.save(expected,query.tick,[...entries,entry]);
  }
  function lookup(id: string, query: StartupPlanningQuery, policy: StartupReturnPolicy) {
    validateQuery(id,query,policy,home);
    const record = store.read();
    if (query.tick < record.clock || query.tick > query.expiresAt) return undefined;
    const entry = record.entries.find(item => item.id === id);
    if (!entry || query.tick < entry.recordedAt || planningContextKey(entry) !== planningContextKey(query)) return undefined;
    return entry.policyIdentity === startupPolicyIdentity(policy) && entry.inputIdentity === startupProjectIdentity(query.input) ? entry.assessment : undefined;
  }
  function choose(candidates: readonly StartupCandidateQuery[], policy: StartupReturnPolicy, order: StartupProjectOrder) {
    validateStartupReturnPolicy(policy);
    if (!['final-return','payback'].includes(order) || candidates.length > 16 || new Set(candidates.map(item => item.id)).size !== candidates.length) throw new Error('Invalid startup candidate choice');
    const ticks = new Set(candidates.map(item => item.query.tick)), horizons = new Set(candidates.map(item => item.query.input.project.spawning.cash.horizon));
    if (ticks.size > 1 || horizons.size > 1) throw new Error('Incomparable startup candidate frames');
    const assessments = candidates.map(item => ({ id: item.id,assessment: lookup(item.id,item.query,policy) }));
    if (assessments.some(item => !item.assessment)) return { status: 'deferred' as const,missing: assessments.filter(item => !item.assessment).map(item => item.id) };
    return { status: 'complete' as const,...chooseAssessedStartupProjects(assessments.map(item => ({ id: item.id,...item.assessment! })),order) };
  }
  function withdraw(id: string, expected: number, tick: number) {
    if (!candidateId(id)) throw new Error('Invalid startup candidate identity');
    return store.save(expected,tick,store.read().entries.filter(entry => entry.id !== id));
  }
  return { read: store.read,capture,lookup,choose,withdraw };
}
function validateQuery(id: string, query: StartupPlanningQuery, policy: StartupReturnPolicy, home: string): void {
  validateStartupReturnPolicy(policy);
  if (!candidateId(id) || !natural(query.tick) || !validPlanningContext(query,home,query.tick) || query.input.project.spawning.room !== home) throw new Error('Invalid startup candidate query');
  const horizon = query.input.project.spawning.cash.horizon;
  if (!natural(horizon) || horizon < policy.maximumRecoveryTicks || horizon > 10000) throw new Error('Invalid startup candidate horizon');
}

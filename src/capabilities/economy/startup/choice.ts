import { assessStartupProject, validateStartupReturnPolicy } from './assessment';
import type { StartupReturnPolicy } from './assessment';
export interface StartupProjectAlternative {
  id: string; result: Parameters<typeof assessStartupProject>[0]; requiredBirths: readonly string[];
}
export type StartupProjectOrder = 'final-return' | 'payback';
/** Mutually exclusive alternatives at one horizon; never sums independent household forecasts. */
export function chooseStartupProject(alternatives: readonly StartupProjectAlternative[], horizon: number, policy: StartupReturnPolicy, order: StartupProjectOrder) {
  validateChoice(alternatives,horizon,policy,order);
  const assessments = alternatives.map(item => ({ id: item.id,...assessStartupProject(item.result,horizon,policy,item.requiredBirths) }));
  return chooseAssessedStartupProjects(assessments,order);
}
/** Callers retain responsibility for policy, horizon and evidence freshness. */
export function chooseAssessedStartupProjects(assessments: readonly Assessment[], order: StartupProjectOrder) {
  if (!['final-return','payback'].includes(order)) throw new Error('Invalid startup choice order');
  const eligible = assessments.filter(item => item.accepted);
  eligible.sort((a,b) => compare(a,b,order));
  return { selected: eligible[0]?.id ?? null,assessments: assessments.map(item => ({ ...item,rejected: [...item.rejected] })) };
}
function validateChoice(alternatives: readonly StartupProjectAlternative[], horizon: number, policy: StartupReturnPolicy, order: StartupProjectOrder): void {
  validateStartupReturnPolicy(policy);
  if (!Number.isSafeInteger(horizon) || horizon < policy.maximumRecoveryTicks || horizon > 10000) throw new Error('Invalid startup choice horizon');
  if (!['final-return','payback'].includes(order)) throw new Error('Invalid startup choice order');
  if (alternatives.length > 128 || alternatives.some(item => !item.id || item.id.length > 256)) throw new Error('Invalid startup alternatives');
  if (new Set(alternatives.map(item => item.id)).size !== alternatives.length) throw new Error('Duplicate startup alternatives');
}
type Assessment = ReturnType<typeof assessStartupProject> & { id: string };
function compare(a: Assessment, b: Assessment, order: StartupProjectOrder): number {
  const margin = b.recoveryMargin-a.recoveryMargin, payback = a.recoveryAt!-b.recoveryAt!;
  const first = order === 'final-return' ? margin : payback;
  const second = order === 'final-return' ? payback : margin;
  return first || second || a.requiredHouseholdCapital-b.requiredHouseholdCapital || a.id.localeCompare(b.id);
}

import type { ProposalPlacement } from './plan-proposal';
import { planEntry } from './plan-proposal';
import { validPlanEntries } from './plan-state';
/** Use the persistence contract before scoring so malformed manual metadata cannot trap a job save. */
export function validScorePlacements(entries: readonly ProposalPlacement[], types: readonly string[]): boolean {
  if (entries.length > 10000) return false;
  try { return validPlanEntries(entries.map(planEntry), new Set(types)); }
  catch { return false; }
}

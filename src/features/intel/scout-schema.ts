import type { StateSchema } from '../../persistence/versioned-state';
import { natural, object } from './validation';
import { validScoutHeartbeat, validScoutLoss } from './scout-validation';
import type { ScoutHistory, ScoutHeartbeat, ScoutLoss } from './scout-model';
function unique(items: readonly ScoutHeartbeat[], field: 'id' | 'name'): boolean {
  return new Set(items.map(item => item[field])).size === items.length;
}
function valid(value: unknown): value is ScoutHistory {
  if (!object(value) || !natural(value.revision)) return false;
  if (!validActive(value.active) || !validLosses(value.losses)) return false;
  const active = value.active, losses = value.losses;
  return unique(active, 'id') && unique(active, 'name') && unique(losses, 'id')
    && disjoint(active, losses);
}
export const scoutHistorySchema: StateSchema<ScoutHistory> = {
  owner: 'scouting', version: 1, initial: () => ({ revision: 0, active: [], losses: [] }), migrations: {}, valid,
};

function validActive(value: unknown): value is ScoutHeartbeat[] {
  return Array.isArray(value) && value.length <= 512 && value.every(validScoutHeartbeat);
}
function validLosses(value: unknown): value is ScoutLoss[] {
  return Array.isArray(value) && value.length <= 1024 && value.every(validScoutLoss);
}

function disjoint(active: readonly ScoutHeartbeat[], losses: readonly ScoutLoss[]): boolean {
  const ids = new Set(active.map(unit => unit.id));
  return losses.every(loss => !ids.has(loss.id));
}

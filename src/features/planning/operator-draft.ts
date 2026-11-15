import { mergeOperatorPlacements } from './operator-placements';
import { copyPlain } from '../../persistence/plain-data';
import type { PlanEntry } from './plan-model';
import type { FinishDraftInput } from '../../capabilities/planning/finish-draft';
/** Apply manual policy before final roads, capacity/access checks and lock validation. */
export function createOperatorDraftAmendment(existing: readonly PlanEntry[]): NonNullable<FinishDraftInput['amendDraft']> {
  const operators = copyPlain(existing.filter(entry => entry.source === 'operator'));
  return (draft, anchors) => {
    const entries = mergeOperatorPlacements(draft, operators);
    const original = new Set(draft.map(entry => key(entry.type, entry.position.x, entry.position.y)));
    const targets = copyPlain([...anchors]);
    const seen = new Set(targets.map(tile => tile.x + ':' + tile.y));
    for (const entry of operators) {
      if (original.has(key(entry.type, entry.x, entry.y))) continue;
      const positionKey = entry.x + ':' + entry.y;
      if (!seen.has(positionKey)) targets.push({ x: entry.x, y: entry.y });
      seen.add(positionKey);
    }
    return { entries, anchors: targets };
  };
}
function key(type: string, x: number, y: number): string { return type + ':' + x + ':' + y; }

import { classifyIntelRoom } from './classification';
import { intelReadModel } from './freshness';
import { traversalThreat } from './traversal-threats';
import type { IntelRecord } from './model';
import type { IntelTraversalDecision, IntelTraversalPolicy, TraversalBlock } from './traversal-model';
export function decideIntelTraversal(room: string, record: IntelRecord, policy: IntelTraversalPolicy,
  friendly: ReadonlySet<string>, tick: number): IntelTraversalDecision {
  const view = intelReadModel(record, tick, policy.maximumAge);
  const threat = traversalThreat(record, friendly);
  if (threat) return deniedTraversal(threat, true);
  const keeper = classifyIntelRoom(room).keeper;
  if (keeper && !policy.allowKeeper) return deniedTraversal('keeper');
  return knowledgeDecision(view.freshness, keeper, policy);
}
function knowledgeDecision(freshness: 'unknown' | 'fresh' | 'stale', keeper: boolean,
  policy: IntelTraversalPolicy): IntelTraversalDecision {
  const refresh = freshness !== 'fresh';
  if (policy.mode === 'known-safe' && refresh) return deniedTraversal(freshness === 'unknown' ? 'unknown' : 'stale', true);
  const base = freshness === 'unknown' ? policy.unknownCost : refresh ? policy.staleCost : 1;
  return { status: 'allowed', confidence: refresh ? 'uncertain' : 'known', refresh,
    cost: base + (keeper ? policy.keeperCost : 0) };
}
export function deniedTraversal(reason: TraversalBlock, refresh = false): IntelTraversalDecision {
  return Object.freeze({ status: 'blocked', reason, refresh });
}

import { copyPlain } from '../../persistence/plain-data';
import { roomCoordinates } from '../../core/geometry/room-grid';
import { intelSchema } from './schema';
import { decideIntelTraversal, deniedTraversal } from './traversal-decision';
import { validateTraversalPolicy } from './traversal-validation';
import type { IntelTraversalDecision, IntelTraversalPolicy, IntelTraversalPorts } from './traversal-model';
/** Request-owned, bounded assessment; callers must create a new request to observe changed facts. */
export function createIntelTraversal(ports: IntelTraversalPorts, input: IntelTraversalPolicy, tick: number,
  guard: () => boolean = () => true) {
  const policy = copyPlain(input);
  validateTraversalPolicy(policy, tick);
  const blocked = new Set(policy.blockedRooms), friendly = new Set([policy.username, ...policy.allies]);
  const decisions = new Map<string, IntelTraversalDecision>();
  let assessments = 0;
  let incomplete: 'admission' | 'room-budget' | undefined;
  function refuse(reason: 'admission' | 'room-budget'): IntelTraversalDecision {
    if (incomplete !== 'admission') incomplete = reason;
    return deniedTraversal(reason);
  }
  function assess(room: string): IntelTraversalDecision {
    roomCoordinates(room);
    const cached = decisions.get(room);
    if (cached) return cached;
    if (!guard()) return refuse('admission');
    if (assessments >= policy.maximumRooms) return refuse('room-budget');
    assessments++;
    const decision = evaluate(room);
    decisions.set(room, Object.freeze(decision));
    return decision;
  }
  function evaluate(room: string): IntelTraversalDecision {
    if (blocked.has(room)) return deniedTraversal('excluded');
    if ((policy.avoidUntil[room] ?? 0) > tick) return deniedTraversal('temporary');
    const status = ports.status(room);
    if (status !== 'normal') return deniedTraversal('status', true);
    if (!guard()) return refuse('admission');
    const snapshot = ports.intel(room), record = ports.detachedReads ? snapshot : copyPlain(snapshot);
    if (!intelSchema(room).valid(record)) throw new Error('Invalid traversal intel');
    return decideIntelTraversal(room, record, policy, friendly, tick);
  }
  return { assess, allows: (room: string) => assess(room).status === 'allowed',
    cost: (room: string) => { const decision = assess(room); return decision.status === 'allowed' ? decision.cost : Infinity; },
    diagnostics: () => ({ assessedRooms: assessments, incomplete }) };
}

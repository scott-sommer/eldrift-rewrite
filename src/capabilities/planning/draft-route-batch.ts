import { framedIdentity } from '../../core/framed-identity';
import { prepareRouteCosts } from './draft-route-costs';
import type { DraftRouteCostsInput } from './draft-route-costs';
import { draftRevision } from './draft-revision';
import { measureRouteBatch } from './route-cost-batch';
import type { RouteCheckpoint } from './route-checkpoint';
export interface DraftRouteCheckpoint { version: 1; hauling: RouteCheckpoint; service?: RouteCheckpoint }
/** Shares one search budget across hauling and service; partial totals never become layout scores. */
export function draftRouteBatch(
  input: DraftRouteCostsInput, searchRevision: string, previous: DraftRouteCheckpoint | undefined,
  maximumSearches: number, canContinue: () => boolean = () => true,
) {
  if (previous && previous.version !== 1) throw new Error('Invalid draft route checkpoint');
  const prepared = prepareRouteCosts(input);
  const revision = framedIdentity(['draft-route-v2', draftRevision(input, searchRevision, prepared.costs), JSON.stringify([input.serviceWeights, input.hauling])]);
  const hauling = measureRouteBatch({ ...prepared.context, targets: input.hauling },
    revision, previous?.hauling, maximumSearches, canContinue);
  if (!hauling.ok) return { ...hauling, phase: 'hauling' as const };
  const checkpoint: DraftRouteCheckpoint = { version: 1, hauling: hauling.checkpoint };
  if (!hauling.done) {
    if (previous?.service) throw new Error('Premature service measurement');
    return { ok: true as const, done: false as const, checkpoint, searches: hauling.searches };
  }
  const service = measureRouteBatch({ ...prepared.context, targets: prepared.targets },
    revision, previous?.service, maximumSearches - hauling.searches, canContinue);
  if (!service.ok) return { ...service, searches: hauling.searches + service.searches, phase: 'service' as const };
  checkpoint.service = service.checkpoint;
  const searches = hauling.searches + service.searches;
  if (!service.done) return { ok: true as const, done: false as const, checkpoint, searches };
  return { ok: true as const, done: true as const, checkpoint, searches,
    hauling: { ok: true as const, total: hauling.total!, routes: hauling.checkpoint.routes },
    service: { ok: true as const, total: service.total!, routes: service.checkpoint.routes } };
}

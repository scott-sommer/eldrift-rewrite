import { paidContinuationContext } from './continuation-context';
import { continuationRequests,continuationSpawnMatches } from './continuation-requests';
import { copyPlain } from '../../../../../core/plain-data';
import { createMatrixSnapshots } from '../../../../../adapters/screeps/matrix-snapshots';
import { measureRemoteLeg } from '../../../assessment/travel';
import { createNativePaidCourierOpening } from '../../motion-observation/native-opening';
import { createMotionTerrain } from './terrain';
import { nativeMotionEnvironment } from './native-terrain';
import { paidCourierContinuationInput } from './continuation-input';
import type { StatePort } from '../../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../../config/model';
import type { PaidUnitContext } from '../../motion-observation/model';
import type { PaidCourierContinuationResult,PaidCourierContinuationOptions } from './continuation-model';
import type { StaticTravelLeg } from '../../../../../capabilities/movement/path-model';
/** Before dispatch, after paid qualification. Compiles facts only; no geometry/job/finance writes. */
export function createNativePaidCourierContinuation(state: StatePort) {
  const observe = createNativePaidCourierOpening(state),snapshots = createMatrixSnapshots();
  return (input: PaidUnitContext,config: Readonly<RuntimeConfig>,options: PaidCourierContinuationOptions,guard: () => boolean = () => true): PaidCourierContinuationResult => {
    const context = copyPlain(input),current = observe(context,guard); if (current.status === 'deferred') return current;
    const basis = current.opening;
    if (!continuationSpawnMatches(context,basis)) return { status: 'deferred',reason: 'continuation-spawn-placement' };
    if (config.remoteMinimumBatch > context.paid.capacity) return { status: 'deferred',reason: 'continuation-batch' };
    const admitted = paidContinuationContext(state,context,basis,config,snapshots,guard); if (admitted.status === 'deferred') return admitted;
    const { facts,rooms,matrices } = admitted;
    const terrain = createMotionTerrain(nativeMotionEnvironment(matrices,rooms)),requests = continuationRequests(context,basis,options);
    if (!requests) return { status: 'deferred',reason: 'continuation-blocked-bound' };
    const measured = continuationLegs(facts,rooms,requests,terrain,config,snapshots,guard);
    if (measured.status === 'deferred') return measured;
    const legs = measured.legs;
    if (!guard()) return { status: 'deferred',reason: 'budget' };
    const compiled = paidCourierContinuationInput(context,basis,legs,requests.map(request => request.origin),config.remoteMinimumBatch);
    if (!compiled) return { status: 'deferred',reason: 'continuation-retirement-buffer' };
    return { status: 'ready',compilation: copyPlain({ observedAt: Game.time,unit: basis.observed.unit,source: context.cohort.source,basis,routeVersion: admitted.version,topologyVersion: matrices.version,...compiled,terrain: terrain.result() }) };
  };
}

function continuationLegs(facts: Parameters<typeof measureRemoteLeg>[0],rooms: string[],requests: NonNullable<ReturnType<typeof continuationRequests>>,terrain: ReturnType<typeof createMotionTerrain>,config: Readonly<RuntimeConfig>,snapshots: ReturnType<typeof createMatrixSnapshots>,guard: () => boolean) {
  const legs: StaticTravelLeg[] = [];
  for (const request of requests) {
    const measured = measureRemoteLeg(facts,{ ...request,clock: 'action' },rooms,config.remoteMaximumPathOps,snapshots,guard);
    if (measured.status !== 'complete' || !measured.path) return { status: 'deferred' as const,reason: 'continuation-path' };
    const refusal = terrain.path(request.origin,measured.path,guard);
    if (refusal) return { status: 'deferred' as const,reason: refusal };
    legs.push(measured);
  }
  return { status: 'ready' as const,legs };
}

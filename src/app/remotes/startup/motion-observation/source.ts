import { copyPlain } from '../../../../core/plain-data';
import type { StatePort } from '../../../../persistence/versioned-state';
import { observePaidStationAssets,observeSourceWorkers } from './source-assets';
import { createRemoteAssignmentStore } from '../../../../features/remotes/assignment-store';
import { startupFactContext } from '../facts-context';
import { paidSourceLeaseCurrent } from './scope';
import type { PaidSourceContext,PaidSourceResult } from './source-model';
/** Observe current physical assets and their existing owners, never infer free stock from an old forecast. */
export function createNativePaidSourceObservation(state: StatePort) {
  return (context: PaidSourceContext,guard: () => boolean = () => true): PaidSourceResult => {
    if (!guard()) return { status: 'deferred',reason: 'budget' };
    try { return observe(state,context,guard); } catch { return { status: 'deferred',reason: 'paid-source-state' }; }
  };
}
function observe(state: StatePort,input: PaidSourceContext,guard: () => boolean): PaidSourceResult {
  const scope = input.cohort,plan = input.plan,username = Game.rooms[scope.home]?.controller?.owner?.username;
  if (!username || !paidSourceLeaseCurrent(state,input)) return { status: 'deferred',reason: 'paid-source-authority' };
  if (plan.home !== scope.home || plan.room !== scope.room || plan.source !== scope.source || plan.endpoint.id !== scope.endpoint) return { status: 'deferred',reason: 'paid-source-plan' };
  const context = startupFactContext({ ...scope,station: plan.station,username,tick: Game.time },createRemoteAssignmentStore(state));
  if (context.status === 'deferred') return context;
  const { room,source } = context;
  const assets = observePaidStationAssets(state,room,plan.station);
  if (!assets) return { status: 'deferred',reason: 'paid-source-station' };
  const workers = observeSourceWorkers(room,source);
  if (workers.length > 16 || !guard()) return { status: 'deferred',reason: 'paid-source-budget-or-workers' };
  return { status: 'ready',observation: copyPlain({ observedAt: Game.time,source: { id: source.id,position: { room: source.pos.roomName,x: source.pos.x,y: source.pos.y },energy: source.energy,capacity: source.energyCapacity,regenerationIn: source.ticksToRegeneration ?? null },
    ...assets,reservation: room.controller?.reservation ? { ...room.controller.reservation } : null,effects: source.effects ?? [],workers }) };
}

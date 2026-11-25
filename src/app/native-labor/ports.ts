import { createCreepActions } from '../../adapters/screeps/creep-actions';
import { observeStartupEndpoint } from '../remotes/startup/endpoint-facts';
import { startupClaimedPools } from '../remotes/startup/stock';
import { laborBody } from '../../capabilities/economy/startup/household/labor/body';
import type { StatePort } from '../../persistence/versioned-state';
import type { createNativeDispatch } from '../native-dispatch';
import type { LaborTaskPayload } from '../../features/work/labor-task';
import type { LaborProgress } from '../../features/work/labor-progress';
import type { LaborTaskPorts } from '../labor-task-model';
import type { IntentResult } from '../../core/execution/action-arbiter';
import { createLaborClaims, laborScope } from './claims';
import { nativeLaborWork, nativeLaborActor, inLaborRange } from './facts';
type Dispatch = Pick<ReturnType<typeof createNativeDispatch>,'arbiter' | 'movement'>;
export interface NativeLaborPolicy {
  enabled(home: string): boolean;
  failed?(creep: Creep, progress: Readonly<LaborProgress>, payload: LaborTaskPayload, reason: string): void;
  completed(creep: Creep, progress: Readonly<LaborProgress>, payload: LaborTaskPayload): void;
  observeIntent?(creep: Creep, action: string, energy: number, result: IntentResult): void;
}
/** Native quantities and current authority; the application supplies its shared dispatch instance. */
export function createNativeLaborTaskPorts(state: StatePort, dispatch: Dispatch, policy: NativeLaborPolicy): LaborTaskPorts<Creep> {
  const claims = createLaborClaims(state);
  const endpoint = (payload: LaborTaskPayload) => {
    const home = Game.rooms[payload.proposal.input.request.room];
    return home?.controller?.my ? observeStartupEndpoint(payload.proposal.input.source,home,startupClaimedPools(state)) : undefined;
  };
  function issue(creep: Creep, payload: LaborTaskPayload, kind: 'pickup' | 'work' | 'return', amount: number, capacity: number, owner: string, action: string, invoke: () => IntentResult): boolean {
    if (kind !== 'return' && (!policy.enabled(payload.proposal.input.request.room) || creep.body.some(part => part.boost))) return false;
    if (!Game.rooms[payload.proposal.input.request.room]?.controller?.my) return false;
    if (owner !== laborScope(payload) || !dispatch.arbiter.claim(creep.name,owner)) return false;
    const result = claims.issue(creep,payload,kind,amount,capacity,invoke);
    if (result) policy.observeIntent?.(creep,action,amount,result);
    return result?.status === 'issued';
  }
  return { now: () => Game.time,worker: nativeLaborActor,
    authorized(creep,payload) {
      claims.releaseObserved(creep,payload);
      const home = payload.proposal.input.request.room;
      if (!policy.enabled(home) || creep.memory.population?.home !== home || creep.body.some(part => part.boost) || !endpoint(payload)) return false;
      if (!dispatch.arbiter.claim(creep.name,laborScope(payload))) return false;
      if (!claims.protectCargo(creep,payload)) return false;
      claims.releaseObserved(creep,payload); return true;
    },
    recoverable(creep,payload) {
      claims.releaseObserved(creep,payload);
      if (!endpoint(payload) || creep.memory.population?.home !== payload.proposal.input.request.room) return false;
      return dispatch.arbiter.claim(creep.name,laborScope(payload)) && claims.protectCargo(creep,payload);
    },
    failed: (creep,progress,payload,reason) => policy.failed?.(creep,progress,payload,reason),
    remainingWork: (_,order) => nativeLaborWork(order)?.remaining,
    move: (creep,destination,owner) => { dispatch.movement.move(creep,{ owner,destination,range: 0,policy: { version: 'home-labor-v1',blockedRooms: [],costs: {},maximumRooms: 1 } }); },
    pickup(creep,payload,amount,owner) {
      const source = endpoint(payload); if (!source || !inLaborRange(creep,source.position,1)) return false;
      return issue(creep,payload,'pickup',amount,Math.max(0,source.energy-payload.proposal.input.policy.reserve),owner,'pickup',() => createCreepActions(creep,owner,dispatch.arbiter).withdraw(Game.getObjectById(source.id as Id<Structure>)!,RESOURCE_ENERGY,amount));
    },
    work(creep,payload,maximum,owner) {
      const order = payload.proposal.input.order, view = nativeLaborWork(order); if (!view || !inLaborRange(creep,order.position,3)) return false;
      const amount = Math.min(creep.store.energy,laborBody(creep.body.filter(part => part.hits > 0).map(part => part.type),order.kind).rate,view.nativeLimit);
      if (amount < 1 || amount > maximum) return false;
      const capacity = order.kind === 'repair' ? Math.ceil(view.remaining/100) : view.remaining;
      return issue(creep,payload,'work',amount,capacity,owner,order.kind,() => nativeWork(creep,owner,dispatch,order.kind,view.target));
    },
    deposit(creep,payload,amount,owner) {
      const source = endpoint(payload); if (!source || !inLaborRange(creep,source.position,1)) return false;
      return issue(creep,payload,'return',amount,source.freeCapacity,owner,'return',() => createCreepActions(creep,owner,dispatch.arbiter).transfer(Game.getObjectById(source.id as Id<Structure>)!,RESOURCE_ENERGY,amount));
    },
    completed: policy.completed,
  };
}
function nativeWork(creep: Creep, owner: string, dispatch: Dispatch, kind: 'build' | 'repair' | 'upgrade', target: ConstructionSite | Structure | StructureController) {
  const actions = createCreepActions(creep,owner,dispatch.arbiter);
  if (kind === 'build') return actions.build(target as ConstructionSite);
  if (kind === 'repair') return actions.repair(target as Structure);
  return actions.upgrade(target as StructureController);
}

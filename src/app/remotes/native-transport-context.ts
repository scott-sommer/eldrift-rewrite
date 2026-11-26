import { selectedTransportSource, selectedTransportRequest } from './transport-service';
import type { RemoteTransportService } from './transport-service';
import { eligibleTransportSource, transportSources } from './native-transport-sources';
import type { RemoteTransportSource } from './native-transport-sources';
import type { StatePort } from '../../persistence/versioned-state';
import type { LogisticsRequest } from '../../capabilities/logistics/request';
import { createRemoteAssignmentStore } from '../../features/remotes/assignment-store';
import { remoteTransportAuthority, remoteTransportOwner, transportToken } from '../../features/remotes/transport-authority';
import type { RemoteTransportDemand } from '../../features/remotes/transport-authority';
import { createIntelStore } from '../../features/intel/store';
import { nativeCargoSink, nativeCargoSinks } from '../native-cargo-recovery';
import { createNativeRemoteMovement } from './native-movement';
import type { NativeRemoteOptions } from './native-movement';
import type { NativeRemoteBankingPolicy } from './native-banking';
import type { RemoteActorBinding } from './actor';
import type { createNativeDispatch } from '../native-dispatch';
export interface NativeRemoteTransportOptions extends NativeRemoteOptions {
  minimumBatch: number; requestLifetime: number; service?: RemoteTransportService; banking?: NativeRemoteBankingPolicy;
}
export function createNativeRemoteTransportContext(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, binding: RemoteActorBinding, options: NativeRemoteTransportOptions) {
  if (![options.minimumBatch,options.requestLifetime].every(value => Number.isSafeInteger(value) && value >= 1)) throw new Error('Invalid remote transport limits');
  const assignments = createRemoteAssignmentStore(state), intel = createIntelStore(state);
  const travel = createNativeRemoteMovement(state,dispatch,options), policy = { terminalReserve: 0,...options.banking };
  function current(input: RemoteTransportDemand | undefined): RemoteTransportDemand | undefined {
    const value = input && assignments.resolve(input,Game.time);
    return value?.kind === 'mine' && value.home === binding.home ? value : undefined;
  }
  function owns(request: LogisticsRequest): boolean {
    const value = remoteTransportAuthority(request.owner);
    return value?.home === binding.home && value.actor === binding.owner;
  }
  function authority(request: LogisticsRequest): RemoteTransportDemand | undefined {
    const token = transportToken(request);
    if (!token || !owns(request) || !selectedTransportRequest(request,options.service)) return undefined;
    const value = assignments.resolve(token,Game.time);
    return value?.kind === 'mine' ? value : undefined;
  }
  function source(creep: Creep, demand: RemoteTransportDemand) {
    const route = travel.route(creep,binding.home,demand.room);
    if (!route) return undefined;
    const summary = intel.peek(demand.room,Game.time).record.summary;
    if (!neutral(summary?.controller,creep.owner.username)) return undefined;
    const target = summary?.sources.find(source => source.id === demand.source);
    if (!target) return undefined;
    const position = { room: demand.room,x: target.x,y: target.y };
    const room = Game.rooms[demand.room];
    return { position,route,visible: !!room,endpoint: room && transportSources(room,position).find(source => selectedTransportSource(source,options.service)) };
  }
  function sinks() {
    const room = Game.rooms[binding.home];
    if (!room?.controller?.my || policy.acceptsResource && !policy.acceptsResource(RESOURCE_ENERGY)) return [];
    const selected = options.service && nativeCargoSink(room,options.service.endpoint,RESOURCE_ENERGY,policy.terminalReserve);
    const candidates = options.service ? selected ? [selected] : [] : nativeCargoSinks(room,RESOURCE_ENERGY,policy.terminalReserve);
    return candidates.filter(policy.acceptsSink ?? (() => true));
  }
  function route(creep: Creep, request: LogisticsRequest, phase: 'collect' | 'deliver') {
    const demand = authority(request);
    if (!demand || request.resource !== RESOURCE_ENERGY) return undefined;
    if (phase === 'deliver') return sinks().some(sink => sink.id === request.sink) ? travel.route(creep,binding.home,binding.home,true) : undefined;
    const view = source(creep,demand);
    return view && validSource(request.source,view.position,options.service) ? view.route : undefined;
  }
  return { current,owns,authority,source,sinks,route,travel,owner: (demand: RemoteTransportDemand) => remoteTransportOwner(demand,binding.owner) };
}
function neutral(controller: { owner: string | null; reservation: { username: string } | null } | null | undefined, username: string): boolean {
  return !controller?.owner && (!controller?.reservation || controller.reservation.username === username);
}

function validSource(id: string, source: { room: string; x: number; y: number }, service?: RemoteTransportService): boolean {
  const target = Game.getObjectById(id as Id<RemoteTransportSource>);
  return !!target && eligibleTransportSource(target,source) && selectedTransportSource(target,service);
}

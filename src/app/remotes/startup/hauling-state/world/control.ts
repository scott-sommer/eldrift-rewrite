import { haulingDefinitions } from '../opening';
import { peekState } from '../../../../../persistence/versioned-state';
import type { StatePort,StateSchema } from '../../../../../persistence/versioned-state';
import { remoteAssignmentSchema } from '../../../../../features/remotes/assignment-schema';
import { reservationSchema } from '../../../../../persistence/reservations/schema';
import type { TaskRecord } from '../../../../../persistence/tasks/schema';
import { stationTile } from '../../../../../capabilities/mining/station';
import { taskSchema } from '../../../../../persistence/tasks/schema';
import { createRemoteAssignmentStore } from '../../../../../features/remotes/assignment-store';
import { sameTransportAuthority } from '../policy/bindings';
import { remoteTaskDefinition } from '../../../task';
import type { RemoteTaskPayload } from '../../../task';
import { taskScope } from '../../../../task-runner';
import { seedHaulingRecord } from '../private-state';
import type { HomeHaulingInput } from './model';
import type { PaidMinerObservation } from '../../motion-observation/source-model';
export const homeMinerDefinitions = { ...haulingDefinitions,'remote-mine': remoteTaskDefinition };
/** Seed complete control once; restore validates current owners without replaying the opening. */
export function seedHomeWorldControl(home: HomeHaulingInput,state: StatePort,restored: boolean,frame = home.observedAt): void {
  const miners = home.sources.flatMap(source => source.miners);
  if (!home.control) { if (miners.length) throw new Error('Missing private miner control'); return; }
  owner(state,'remotes/assignments',remoteAssignmentSchema,home.control.assignments,restored);
  owner(state,'reservations/empire',reservationSchema,home.control.reservations,restored);
  validateControlClock(home,state,frame);
  validateMinerRoster(home);
  for (const source of home.sources) for (const miner of source.miners) {
    const name = miner.paid.request,schema = taskSchema(name,homeMinerDefinitions),observation = miner.observation;
    if (restored) { if (!peekState(state,'tasks/'+name,schema)) throw new Error('Missing restored miner task state'); continue; }
    validateMinerOpening(home,source,observation,state);
    validateMinerStation(home,source,observation,state);
    seedHaulingRecord(state,'tasks/'+name,schema,{ unit: name,queue: observation.task ? [observation.task.record] : [] });
  }
}
function owner<T>(state: StatePort,key: string,schema: StateSchema<T>,opening: T | null,restored: boolean): void {
  if (restored) { const current = peekState(state,key,schema); if (opening && !current) throw new Error('Missing restored home control owner'); }
  else if (opening) seedHaulingRecord(state,key,schema,opening);
}
function validateMinerOpening(home: HomeHaulingInput,source: HomeHaulingInput['sources'][number],observation: PaidMinerObservation,state: StatePort): void {
  if (observation.observedAt !== home.observedAt) throw new Error('Private miner opening clock mismatch');
  const task = observation.task;
  if (!task) { if (observation.assigned) throw new Error('Assigned private miner has no task'); return; }
  const record = task.record,payload = record.payload as RemoteTaskPayload;
  validateMinerHeader(observation,record,home.observedAt);
  validateMinerAuthority(home,source,payload,state);
}

function validateMinerHeader(observation: PaidMinerObservation,record: TaskRecord,tick: number): void {
  const task = observation.task!;
  if (record.expiresAt <= tick || record.id !== task.id || record.wakeAt !== task.wakeAt || record.expiresAt !== task.expiresAt || task.scope !== taskScope(observation.name,record.id)) throw new Error('Private miner task header mismatch');
}
function validateMinerRoster(home: HomeHaulingInput): void {
  const names = home.sources.flatMap(source => [...source.miners.map(miner => miner.paid.request),...source.couriers.map(courier => courier.paid.request)]);
  if (names.length > 64 || new Set(names).size !== names.length) throw new Error('Duplicate or excessive private worker roster');
}
function validateMinerStation(home: HomeHaulingInput,source: HomeHaulingInput['sources'][number],observation: PaidMinerObservation,state: StatePort): void {
  const resource = 'mining-tile:'+stationTile(source.plan.station);
  const claim = peekState(state,'reservations/empire',reservationSchema)?.claims.find(claim => claim.resource === resource && claim.expiresAt > home.observedAt) ?? null;
  if (JSON.stringify(claim) !== JSON.stringify(observation.claim)) throw new Error('Private miner station claim mismatch');
  const assigned = claim?.holder === observation.name && claim.scope === observation.task?.scope;
  if (assigned !== observation.assigned) throw new Error('Private miner station owner mismatch');
}

function validateControlClock(home: HomeHaulingInput,state: StatePort,frame: number): void {
  const assignments = peekState(state,'remotes/assignments',remoteAssignmentSchema);
  if (assignments && (assignments.clock > frame || assignments.revision < (home.control?.assignments?.revision ?? 0))) throw new Error('Invalid private assignment continuation clock/revision');
  if ((peekState(state,'reservations/empire',reservationSchema)?.claims.length ?? 0) > 512) throw new Error('Private station claim bound exceeded');
}

function validateMinerAuthority(home: HomeHaulingInput,source: HomeHaulingInput['sources'][number],payload: RemoteTaskPayload,state: StatePort): void {
  const demand = createRemoteAssignmentStore(state).resolve(payload.token,home.observedAt);
  if (payload.home !== home.home || demand?.kind !== 'mine' || !sameTransportAuthority(source.demand,demand,home.observedAt)) throw new Error('Private miner task authority mismatch');
  if (demand.room !== source.plan.room || demand.source !== source.plan.source) throw new Error('Private miner source plan mismatch');
}

import type { StatePort } from '../../src/persistence/versioned-state';
import { peekState } from '../../src/persistence/versioned-state';
import { remoteFleetIdentity } from '../../src/features/remotes/fleet/identity';
import { reservationIdentity } from '../../src/features/remotes/reservation/identity';
import { scoutHome } from '../../src/features/intel/scout-identity';
import { distributorOwner } from '../../src/features/logistics/identity';
import { remoteTransportAuthority } from '../../src/features/remotes/transport-authority';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { createRemoteManagementStore } from '../../src/features/remotes/management/store';
import { createRemoteDiscoveryStore } from '../../src/features/remotes/discovery/store';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { logisticsQueueSchema } from '../../src/features/logistics/request-schema';
import { quantitySchema } from '../../src/persistence/quantities/schema';
import { reservationSchema } from '../../src/persistence/reservations/schema';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { validRemoteTaskPayload } from '../../src/app/remotes/task';
import { validHaulingPayload } from '../../src/app/hauling-task';
import { bodyCost } from '../../src/capabilities/spawning/body';
import { traceReceipts } from './receipt-trace';
import type { ReceiptTrace } from './receipt-trace';
interface Birth { cost: number; family: string; seenAt: number; owner: string; id?: string; target?: string; activeAt?: number }
export interface PipelineMemory extends Memory {
  pipelineRows?: unknown[]; pipelineBirths?: Record<string,Birth>; pipelineRemote?: ReceiptTrace; pipelineLocal?: ReceiptTrace; pipelineStopped?: number;
}
const home = 'W0N1', remote = 'E0N1';
export function pipelineFamily(owner: string): string | undefined {
  return remoteFleetIdentity(owner)?.kind ?? (reservationIdentity(owner) ? 'reserver' : scoutHome(owner) ? 'scout' : owner === distributorOwner(home) ? 'distributor' : undefined);
}
export function pipelineIncome(memory: PipelineMemory): number { return Object.values(memory.pipelineRemote?.amounts ?? {}).reduce((sum,value) => sum+value,0); }
export function snapshotPipeline(state: StatePort, memory: PipelineMemory, probe?: Record<string,unknown>): void {
  const actors = Object.values(Game.creeps).filter(creep => pipelineFamily(creep.memory.population?.owner ?? ''));
  const births = trackBirths(memory,actors), holders = remoteHolders(births);
  const records = peekState(state,'logistics-requests/'+home,logisticsQueueSchema)?.records ?? [];
  const isRemote = (record: typeof records[number]) => !!remoteTransportAuthority(record.request.owner) || holders.has(record.request.source);
  traceReceipts(records.filter(isRemote),memory.pipelineRemote ??= { amounts: {},bindings: {} });
  traceReceipts(records.filter(record => !isRemote(record)),memory.pipelineLocal ??= { amounts: {},bindings: {} });
  const room = Game.rooms[home]!, source = Game.rooms[remote]?.find(FIND_SOURCES)[0];
  const lease = createRemoteAssignmentStore(state).owner(remote,Game.time), manager = createRemoteManagementStore(state,home).read();
  const pending = createSpawnQueue(state,home).list();
  (memory.pipelineRows ??= []).push({ ...(probe ? { probe } : {}),tick: Game.time,stopped: memory.pipelineStopped ?? null,visible: !!Game.rooms[remote],
    discovered: createRemoteDiscoveryStore(state,home).read().published,lease: lease ? { generation: lease.generation,sources: lease.plan.sources.length,reserve: !!lease.plan.reserve } : null,
    source: source ? { energy: source.energy,capacity: source.energyCapacity } : null,reservation: Game.rooms[remote]?.controller?.reservation?.ticksToEnd ?? null,
    offers: manager.offers.map(offer => ({ room: offer.room,reservationCost: offer.commitment.energyPerTick,sources: offer.quotes.map(quote => ({ capacity: quote.assessment.sourceFacts.capacity,netRate: quote.assessment.economics.status === 'evaluated' ? quote.assessment.economics.netRate : null })) })),
    income: pipelineIncome(memory),localTransfers: Object.values(memory.pipelineLocal!.amounts).reduce((sum,value) => sum+value,0),
    birthCost: Object.values(births).reduce((sum,birth) => sum+(birth.seenAt < Game.time ? birth.cost : 0),0),
    homeEnergy: room.find(FIND_STRUCTURES).reduce((sum,item) => sum+('store' in item ? Number(item.store.energy ?? 0) : 0),0),
    actorAfter: (state.read('remoteActors/'+home) as { data?: { after?: string } } | undefined)?.data?.after ?? null,
    remotePending: pending.filter(request => ['miner','courier','reserver'].includes(pipelineFamily(request.owner) ?? '')).length,
    unrelated: pending.find(request => request.id === 'unrelated-pipeline'),sentinel: state.read('fixture/remote-pipeline'),
    quantityClaims: (peekState(state,'quantity-reservations/empire',quantitySchema)?.claims ?? []).filter(claim => holders.has(claim.holder)).length,
    miningClaims: (peekState(state,'reservations/empire',reservationSchema)?.claims ?? []).filter(claim => holders.has(claim.holder)).length,
    units: actors.map(creep => snapshotUnit(state,creep)) });
}
function trackBirths(memory: PipelineMemory, actors: Creep[]): Record<string,Birth> {
  const births = memory.pipelineBirths ??= {};
  for (const creep of actors) {
    const owner = creep.memory.population!.owner;
    births[creep.name] ??= { cost: bodyCost(creep.body.map(part => part.type)),family: pipelineFamily(owner)!,seenAt: Game.time,owner };
    const target = remoteFleetIdentity(owner)?.room ?? reservationIdentity(owner)?.room;
    if (target) births[creep.name]!.target = target;
    if (typeof creep.id === 'string') births[creep.name]!.id = creep.id;
    if (!creep.spawning) births[creep.name]!.activeAt ??= Game.time;
  }
  return births;
}
function remoteHolders(births: Record<string,Birth>): Set<string> {
  return new Set(Object.entries(births).filter(([,birth]) => ['miner','courier','reserver'].includes(birth.family)).flatMap(([name,birth]) => [name,birth.id ?? '',birth.owner]));
}
function snapshotUnit(state: StatePort, creep: Creep) {
  const definitions = { 'remote-mine': { phases: ['work'],validPayload: validRemoteTaskPayload },reserve: { phases: ['work'],validPayload: validRemoteTaskPayload },haul: { phases: ['work'],validPayload: validHaulingPayload } };
  return { name: creep.name,family: pipelineFamily(creep.memory.population!.owner),room: creep.pos.roomName,spawning: creep.spawning,ttl: creep.ticksToLive ?? null,cargo: creep.store.energy,
    tasks: peekState(state,'tasks/'+creep.name,taskSchema(creep.name,definitions))?.queue.length ?? 0 };
}

import { capturePipelineCalibration, noteCalibrationPolicy } from './pipeline-cohort-calibration';
import { createRemoteFleetStore } from '../../src/features/remotes/fleet/store';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { fleetServicePlan } from '../../src/app/remotes/fleet/service-policy';
import type { RemoteFleetBirthPolicy } from '../../src/app/remotes/startup/model';
import type { RemoteFleetProfile } from '../../src/features/remotes/fleet/model';
import type { StartupTravelPlan } from '../../src/features/remotes/startup/travel-model';
export interface PipelineServiceMemory extends Memory {
  pipelineServiceMode?: boolean; pipelineServicePlans?: Record<string,{ generation: number; plan: StartupTravelPlan }>;
  pipelineServiceCalls?: Record<string,{ count: number; firstAt: number; lastAt: number; matches: boolean }>;
}
const state = createMemoryPort(() => Memory);
function selected(profile: Readonly<RemoteFleetProfile>) {
  const record = (Memory as PipelineServiceMemory).pipelineServicePlans?.[profile.source];
  return record?.generation === profile.generation ? fleetServicePlan(profile,record.plan) : null;
}
function placement(profile: Readonly<RemoteFleetProfile>) {
  const plan = selected(profile); return plan ? { spawn: plan.spawn.id,exit: { ...plan.spawn.exit } } : null;
}
export const pipelineServicePolicy: RemoteFleetBirthPolicy = {
  prepare(profile,config,guard) {
    if (!(Memory as PipelineServiceMemory).pipelineServiceMode) return undefined;
    noteCalibrationPolicy('prepare-'+profile.kind);
    if (selected(profile)) return placement(profile);
    if (!guard()) { noteCalibrationPolicy('guard'); return null; }
    const plan = prepare(profile);
    if (!plan) { noteCalibrationPolicy('geometry'); return null; }
    if (!capturePipelineCalibration(state,profile,plan,config,guard)) { noteCalibrationPolicy('capture'); return null; }
    ((Memory as PipelineServiceMemory).pipelineServicePlans ??= {})[profile.source] = { generation: profile.generation,plan };
    return placement(profile);
  },
  current: profile => (Memory as PipelineServiceMemory).pipelineServiceMode ? placement(profile) : undefined,
  service: profile => (Memory as PipelineServiceMemory).pipelineServiceMode ? selected(profile) : undefined,
};
function prepare(profile: Readonly<RemoteFleetProfile>): StartupTravelPlan | undefined {
  const home = Game.rooms[profile.home], room = Game.rooms[profile.room], source = room?.find(FIND_SOURCES).find(source => source.id === profile.source), spawn = home?.find(FIND_MY_SPAWNS)[0], endpoint = home?.storage;
  if (!source || !spawn || !endpoint || !room) return undefined;
  const station = room.find(FIND_STRUCTURES).find(item => item.structureType === STRUCTURE_CONTAINER && item.pos.getRangeTo(source) === 1);
  const profiles = createRemoteFleetStore(state,profile.home).read().actors.filter(item => item.source === profile.source);
  const miner = profiles.find(item => item.kind === 'miner'), courier = profiles.find(item => item.kind === 'courier');
  if (!station || !miner || !courier) return undefined;
  const point = (room: string,x: number,y: number) => ({ room,x,y });
  return { home: home!.name,room: room.name,source: source.id,spawn: { id: spawn.id,position: point(home!.name,spawn.pos.x,spawn.pos.y),exit: point(home!.name,46,25) },station: point(room.name,station.pos.x,station.pos.y),collection: point(room.name,station.pos.x-1,station.pos.y),endpoint: { id: endpoint.id,position: point(home!.name,endpoint.pos.x,endpoint.pos.y),deposit: point(home!.name,endpoint.pos.x+1,endpoint.pos.y) },miner: [...miner.body],courier: [...courier.body] };
}

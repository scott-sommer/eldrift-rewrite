import type { SelfBuildInput } from '../../../capabilities/economy/startup/build-model';
import { forecastSelfBuild } from '../../../capabilities/economy/startup/self-build';
import type { RuntimeConfig } from '../../../config/model';
import type { RemoteFleetProfile } from '../../../features/remotes/fleet/model';
import type { SourceStartupSurvey } from './model';
import { healthyRemoteActor } from '../fleet/health';
import { remoteFleetIdentity } from '../../../features/remotes/fleet/identity';
export function sourceHasMiner(profile: RemoteFleetProfile): boolean {
  return Object.values(Game.creeps).some(creep => matchingMiner(creep,profile));
}
export function courierReady(profile: RemoteFleetProfile, miner: RemoteFleetProfile | undefined, survey: SourceStartupSurvey, config: Readonly<RuntimeConfig>): boolean {
  if (!miner || !sourceHasMiner(miner)) return false;
  if (survey.status === 'ready') return true;
  if (!survey.source || !survey.site) return false;
  const lead = Math.min(1500,profile.body.length*3+profile.travelTicks+config.remoteStartupCourierLead);
  return Object.values(Game.creeps).some(creep => buildsInTime(creep,miner,survey,lead));
}
function buildsInTime(creep: Creep, profile: RemoteFleetProfile, survey: SourceStartupSurvey, lead: number): boolean {
  if (!matchingMiner(creep,profile) || creep.spawning || !healthyRemoteActor(creep,profile)) return false;
  if (!creep.pos.isEqualTo(survey.site!.pos)) return false;
  if (!modelSupported(creep,survey.source!)) return false;
  const input = buildInput(creep,profile,survey,lead);
  return !!input && forecastSelfBuild(input).status === 'complete';
}
function buildInput(creep: Creep, profile: RemoteFleetProfile, survey: SourceStartupSurvey, lead: number): SelfBuildInput | undefined {
  const budget = Math.min(lead,Math.max(0,(creep.ticksToLive ?? 0)-profile.retireTicks)), capacity = creep.store.getCapacity(RESOURCE_ENERGY);
  if (!capacity || budget === 0) return undefined;
  const source = survey.source!, site = survey.site!, work = creep.getActiveBodyparts(WORK);
  return { remainingProgress: site.progressTotal-site.progress,carriedEnergy: creep.store.energy,carryCapacity: capacity,
    harvestPower: work*HARVEST_POWER,buildPower: work*BUILD_POWER,maximumTicks: budget,
    source: { energy: source.energy,capacity: source.energyCapacity,regenerationTicks: ENERGY_REGEN_TIME,regenerationIn: source.ticksToRegeneration ?? null } };
}

function matchingMiner(creep: Creep, profile: RemoteFleetProfile): boolean {
  if (!creep.my || creep.memory.population?.home !== profile.home) return false;
  const identity = remoteFleetIdentity(creep.memory.population.owner);
  return identity?.kind === 'miner' && identity.home === profile.home && identity.room === profile.room && identity.source === profile.source;
}

function modelSupported(creep: Creep, source: Source): boolean {
  return !creep.body.some(part => !!part.boost) && !source.effects?.length;
}

import type { StatePort } from '../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../config/model';
import type { RemoteFleetProfile } from '../../../features/remotes/fleet/model';
import { remoteFleetIdentity } from '../../../features/remotes/fleet/identity';
import { reservationIdentity } from '../../../features/remotes/reservation/identity';
import { createRemoteAssignmentStore } from '../../../features/remotes/assignment-store';
import { courierReady, sourceHasMiner } from './readiness';
import type { StartupSurvey } from './model';
export function startupPhaseAllows(state: StatePort, owner: string, config: Readonly<RuntimeConfig>, profiles: RemoteFleetProfile[], survey: StartupSurvey): boolean {
  const fleet = remoteFleetIdentity(owner);
  if (fleet) return config.remoteStartupPolicy === 'economic' || sourcePhaseAllows(profiles,owner,config,survey);
  const reservation = reservationIdentity(owner);
  if (!reservation) return true;
  const lease = createRemoteAssignmentStore(state).owner(reservation.room,Game.time);
  return lease?.home === reservation.home && lease.plan.sources.every(source => {
    const miner = profiles.find(profile => profile.room === reservation.room && profile.source === source && profile.kind === 'miner');
    return survey(reservation.room,source).status === 'ready' && !!miner && sourceHasMiner(miner);
  });
}

function sourcePhaseAllows(profiles: RemoteFleetProfile[], owner: string, config: Readonly<RuntimeConfig>, survey: StartupSurvey): boolean {
  const profile = profiles.find(item => item.owner === owner); if (!profile) return false;
  const observed = survey(profile.room,profile.source);
  if (profile.kind === 'miner') return observed.status === 'ready' || observed.status === 'building' || config.remoteContainersEnabled && config.constructionEnabled;
  const miner = profiles.find(item => item.room === profile.room && item.source === profile.source && item.kind === 'miner');
  return courierReady(profile,miner,observed,config);
}

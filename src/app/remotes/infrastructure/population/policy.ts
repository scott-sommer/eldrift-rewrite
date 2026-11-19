import type { RuntimeConfig } from '../../../../config/model';
import type { RemoteOutpostDemand } from '../../../../features/remotes/infrastructure/model';
import { remoteFleetWorkEnabled } from '../../fleet/spawn-policy';
export function constructionWorkersEnabled(config: Readonly<RuntimeConfig>): boolean {
  return remoteFleetWorkEnabled(config) && config.constructionEnabled && config.remoteConstructionWorkersEnabled && config.remoteConstructionMaximumWorkers > 0;
}
export function constructionWorkAllowed(demand: RemoteOutpostDemand, config: Readonly<RuntimeConfig>): boolean {
  return constructionWorkersEnabled(config) && (!demand.infrastructure.roads || config.remoteRoadsEnabled)
    && (!demand.infrastructure.containers || config.remoteContainersEnabled);
}
export function constructionSpawningEnabled(config: Readonly<RuntimeConfig>): boolean {
  return constructionWorkersEnabled(config) && config.remoteSpawningEnabled;
}

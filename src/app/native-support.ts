import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import type { RoomFeature } from './runtime-model';
import type { createNativeDispatch } from './native-dispatch';
import type { createNativeRecovery } from './native-recovery';
import { createNativeSupportCourier } from './native-support-courier';
import { supportRouteTargets } from './native-support-routes';
import { observeSupportStores, observeSupportSinks } from '../adapters/screeps/support-observation';
import { observePopulation } from '../adapters/screeps/population';
import { supportSources, supportSinks } from '../features/recovery/support-endpoints';
import { supportOwner } from '../features/recovery/support-identity';
import { maintainSupportFleet } from '../features/recovery/support-fleet';
import { reconcileSupportRequests } from '../features/recovery/support-requests';
import { courier } from '../capabilities/spawning/economy-recipes';
type Configuration = (room: string) => Readonly<RuntimeConfig>;
export function createNativeSupportFeature(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>,
  config: Configuration, recovery: ReturnType<typeof createNativeRecovery>) {
  const executor = createNativeSupportCourier(state, dispatch, home => config(home).recoverySupportReserve);
  function runRoute(home: Room, target: string, donor: Readonly<RuntimeConfig>): void {
    const owner = supportOwner(home.name, target);
    const targetRoom = Game.rooms[target];
    const targetConfig = config(target);
    const { active, selected } = routeAssessment(home.name, targetRoom, targetConfig, donor.recoverySupportEnabled, recovery);
    const units = observePopulation().filter(unit => unit.room === home.name && unit.owner === owner)
      .map(unit => ({ ...unit, capacity: Game.creeps[unit.name]!.store.getCapacity() }));
    maintainSupportFleet(state, { home: home.name, target, enabled: !!selected,
      requestedCapacity: selected?.requestedEnergy ?? 0, body: courier(Math.min(home.energyCapacityAvailable, donor.recoverySupportBodyBudget))?.parts,
      travelTicks: donor.recoverySupportTravelTicks, requestLifetime: donor.recoverySupportLifetime }, units, Game.time);
    reconcileSupportRequests(state, { home: home.name, target, active: active && (!!selected || units.length > 0),
      batch: targetConfig.recoverySupportBatch, lifetime: donor.recoverySupportLifetime },
    supportSources(observeSupportStores(home), donor.recoverySupportReserve), supportSinks(observeSupportSinks(targetRoom)), Game.time);
    if (selected || units.length) dispatch.activate();
    for (const unit of units) executor.run(Game.creeps[unit.name]!, active);
  }
  const feature: RoomFeature = { id: 'recovery-support', urgency: 'urgent', interval: 1,
    run({ room, config: settings }) {
      const home = Game.rooms[room.name];
      if (!home?.controller?.my) return;
      for (const target of supportRouteTargets(state, home.name)) runRoute(home, target, settings.values);
    } };
  return { feature, definitions: executor.definitions };
}
function routeAssessment(home: string, target: Room | undefined, config: Readonly<RuntimeConfig>,
  enabled: boolean, recovery: ReturnType<typeof createNativeRecovery>) {
  const assessment = target && config.recoveryEnabled ? recovery(target, config) : undefined;
  const active = !!assessment?.active && config.recoveryEconomyEnabled && enabled;
  const selected = active ? assessment?.donors.find(item => item.room === home) : undefined;
  return { active, selected };
}

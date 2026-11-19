import type { StatePort } from '../../src/persistence/versioned-state';
import { stateKey } from '../../src/persistence/state-key';
import { createRemoteManagementStore } from '../../src/features/remotes/management/store';
import { createRemoteTravelProgress } from '../../src/features/remotes/management/travel-progress';
import { createRemoteFleetStore } from '../../src/features/remotes/fleet/store';
/** Fixture reconstructs the prior wire schemas; it does not alter cargo, lifetimes, assignments or journals. */
export function installLegacyRemoteTiming(state: StatePort, home: string): void {
  const manager = createRemoteManagementStore(state,home).read();
  for (const offer of manager.offers) for (const quote of offer.quotes) {
    Reflect.deleteProperty(quote.assessment.travel,'minerReturnTicks');
    if (quote.assessment.economics.status === 'evaluated') Reflect.deleteProperty(quote.assessment.economics,'timing');
  }
  const travel = createRemoteTravelProgress(state,home).read(), fleet = createRemoteFleetStore(state,home).read();
  travel.legs = travel.legs.slice(0,3);
  for (const actor of fleet.actors) if (actor.kind === 'miner') actor.retireTicks = actor.travelTicks+actor.marginTicks;
  state.write(stateKey('remoteManagement',home),{ owner: 'remotes',version: 1,data: manager });
  state.write(stateKey('remoteTravel',home),{ owner: 'remotes',version: 1,data: travel });
  state.write(stateKey('remoteFleet',home),{ owner: 'remotes',version: 1,data: fleet });
}
export function remoteTimingVersions(state: StatePort, home: string) {
  return ['remoteManagement','remoteTravel','remoteFleet'].map(prefix => (state.read(stateKey(prefix,home)) as { version: number } | undefined)?.version ?? null);
}

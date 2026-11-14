import type { StatePort } from '../persistence/versioned-state';
import type { createNativeDispatch } from './native-dispatch';
import { createNativeRouteCourier } from './native-route-courier';
import { createNativeUpgradeSupplyView } from './native-upgrade-supply-view';
import { upgradeSupplyTarget } from '../features/work/upgrade-supply-identity';
export function createNativeUpgradeSupplyCourier(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>,
  reserve: (home: string) => number) {
  return createNativeRouteCourier(state, dispatch, { version: 'upgrade-supply',
    target: upgradeSupplyTarget, observe: createNativeUpgradeSupplyView(reserve) });
}

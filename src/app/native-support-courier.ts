import type { StatePort } from '../persistence/versioned-state';
import type { createNativeDispatch } from './native-dispatch';
import { createNativeRouteCourier } from './native-route-courier';
import { createNativeSupportView } from './native-support-view';
import { supportTarget } from '../features/recovery/support-identity';
export function createNativeSupportCourier(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>,
  reserve: (home: string) => number) {
  return createNativeRouteCourier(state, dispatch, {
    version: 'recovery-support', target: supportTarget, observe: createNativeSupportView(reserve),
  });
}

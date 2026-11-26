import { afterEach, expect, test, vi } from 'vitest';
import { pendingEconomicContext } from '../../../src/app/remotes/startup/economic/context';
import { createStartupSelections } from '../../../src/features/remotes/startup/selection-store';
import { economicCohortFixture } from '../../fixtures/startup-economic';
import type { RemoteFleetProfile } from '../../../src/features/remotes/fleet/model';
const route = vi.hoisted(() => vi.fn());
vi.mock('../../../src/app/remotes/native-route',() => ({ nativeRemoteRoute: route }));
afterEach(() => { vi.unstubAllGlobals(); route.mockReset(); });
function fixture() {
  const f = economicCohortFixture(), profile = { home: f.home,room: f.query.room,source: f.query.source,generation: 1 } as RemoteFleetProfile;
  createStartupSelections(f.state,f.home).publish(0,1,{ generation: 1,binding: f.query.binding,expiresAt: f.query.expiresAt,quote: f.context.quote });
  vi.stubGlobal('Game',{ time: 2,rooms: { [f.home]: { controller: { owner: { username: 'bot' } } } },creeps: {} });
  return { ...f,profile };
}
test('deferred route evidence is not fabricated into a changed-binding context that destroys a valid checkpoint',() => {
  const f = fixture(), before = f.root(); route.mockReturnValue(undefined);
  expect(pendingEconomicContext(f.state,f.profile,f.config,() => true)).toBeUndefined(); expect(f.root()).toBe(before); expect(f.planner.read().job).not.toBeNull();
});
test('budget exhaustion after route lookup defers the context without changing planning ownership',() => {
  const f = fixture(), before = f.root(); route.mockReturnValue({ allowedRooms: f.context.rooms });
  expect(pendingEconomicContext(f.state,f.profile,f.config,() => false)).toBeUndefined(); expect(f.root()).toBe(before);
});

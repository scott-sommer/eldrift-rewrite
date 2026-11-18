import { expect, test } from 'vitest';
import { managementFixture } from '../fixtures/remote-management';
import { selectRemotePortfolio } from '../../src/features/remotes/portfolio';
import { createRemoteFleetStore } from '../../src/features/remotes/fleet/store';
import { publishRemoteFleet } from '../../src/features/remotes/fleet/plan';
import { remoteFleetIdentity, remoteFleetOwner } from '../../src/features/remotes/fleet/identity';
import { createRemoteActorCursor } from '../../src/features/remotes/fleet/actor-cursor';
function fixture() {
  const f = managementFixture(); f.manager().advance(f.request,{ rooms: 1,sources: 2 },() => true);
  const offers = f.manager().read().offers, policy = { ...f.request.policy.portfolio,home: f.request.home,tick: f.request.tick };
  const portfolio = selectRemotePortfolio(offers,policy), store = createRemoteFleetStore(f.state,f.request.home);
  const publish = (maximum = 100) => publishRemoteFleet(f.state,f.request.home,f.request.tick,f.assignments.read().assignments,portfolio,offers,maximum);
  return { ...f,offers,policy,portfolio,store,publish };
}
test('committed source forecasts publish measured bodies, travel, replacement and transport counts without identity churn', () => {
  const f = fixture(); expect(f.publish().status).toBe('published');
  const first = f.store.read(); expect(first.actors).toHaveLength(4);
  for (const actor of first.actors) {
    expect(remoteFleetIdentity(actor.owner)).toEqual({ home: actor.home,room: actor.room,source: actor.source,kind: actor.kind });
    const source = f.portfolio.bundles[0]!.sources.find(source => source.source === actor.source)!;
    expect(actor.desired).toBe(actor.kind === 'miner' ? 1 : source.economics.haulers); expect(actor.retireTicks).toBeGreaterThanOrEqual(actor.travelTicks);
  }
  f.request.tick++; expect(f.publish().status).toBe('published'); expect(f.store.read().actors.map(actor => actor.owner)).toEqual(first.actors.map(actor => actor.owner));
  first.actors[0]!.body.length = 0; expect(f.store.read().actors[0]!.body.length).toBeGreaterThan(0);
});
test('capacity rejection preserves the existing registry, while an empty portfolio retains scoped retirement work', () => {
  const f = fixture(); f.publish(); const before = f.store.read();
  expect(f.publish(0).status).toBe('capacity'); expect(f.store.read()).toEqual(before);
  expect(publishRemoteFleet(f.state,f.request.home,21,[],{ ...f.portfolio,bundles: [] },[],100).status).toBe('published');
  expect(f.store.read().actors).toHaveLength(4); expect(f.store.read().actors.every(actor => actor.desired === 0)).toBe(true);
});
test('actor identities reject malformed fields and fair cursor survives service recreation', () => {
  const f = fixture(), identity = { home: 'W0N1',room: 'E0N1',source: 'source:with/slashes',kind: 'miner' as const };
  expect(remoteFleetIdentity(remoteFleetOwner(identity))).toEqual(identity);
  expect(remoteFleetIdentity('remote-fleet:["W0N1","E0N1","source","unknown"]')).toBeUndefined();
  expect(remoteFleetIdentity('remote-fleet:["bad","E0N1","source","miner"]')).toBeUndefined();
  createRemoteActorCursor(f.state,'W0N1').save('a'); createRemoteActorCursor(f.state,'E0N1').save('b');
  expect(createRemoteActorCursor(f.state,'W0N1').order([{ name: 'a' },{ name: 'b' }])[0]!.name).toBe('b');
  const cursor = createRemoteActorCursor(f.state); cursor.save('b');
  expect(createRemoteActorCursor(f.state).order([{ name: 'a' },{ name: 'b' },{ name: 'c' }]).map(item => item.name)).toEqual(['c','a','b']);
});

test('portfolio worker budgets constrain miners plus measured transport instead of failing after lease commitment', () => {
  const f = fixture(), maximumUnits = 1+f.portfolio.bundles[0]!.sources[0]!.economics.haulers;
  const selected = selectRemotePortfolio(f.offers,{ ...f.policy,maximumUnits });
  expect(selected.slots+selected.haulers).toBeLessThanOrEqual(maximumUnits);
  expect(selected.slots).toBe(1);
});

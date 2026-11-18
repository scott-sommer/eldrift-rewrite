import { copyPlain } from '../../../persistence/plain-data';
import type { RemoteAssignment } from '../assignment-model';
import type { RemotePortfolio, RemoteRoomOffer, RemoteBundle } from '../portfolio-model';
import { createRemoteFleetStore } from './store';
import type { StatePort } from '../../../persistence/versioned-state';
import { remoteFleetOwner } from './identity';
import type { RemoteFleetProfile } from './model';
/** Publish measured body/travel requirements only after the corresponding scoped lease commit. */
export function publishRemoteFleet(state: StatePort, home: string, tick: number, assignments: RemoteAssignment[], portfolio: RemotePortfolio,
  offers: RemoteRoomOffer[], maximumUnits: number) {
  if (!Number.isSafeInteger(maximumUnits) || maximumUnits < 0 || maximumUnits > 1000) throw new Error('Invalid remote fleet capacity');
  const store = createRemoteFleetStore(state,home), previous = store.read();
  const actors = portfolio.bundles.flatMap(bundle => bundleProfiles(home,assignments,offers,bundle));
  if (actors.reduce((sum,actor) => sum+actor.desired,0) > maximumUnits) return { status: 'capacity' as const };
  const owners = new Set(actors.map(actor => actor.owner));
  const retired = previous.actors.filter(actor => !owners.has(actor.owner)).map(actor => ({ ...actor,desired: 0 }));
  if (actors.length+retired.length > 256) return { status: 'capacity' as const };
  return { status: store.save(previous.revision,tick,[...actors,...retired]) ? 'published' as const : 'conflict' as const };
}
function profile(actor: Omit<RemoteFleetProfile,'owner'>): RemoteFleetProfile { return { ...copyPlain(actor),owner: remoteFleetOwner(actor) }; }

function bundleProfiles(home: string, assignments: RemoteAssignment[], offers: RemoteRoomOffer[], bundle: RemoteBundle): RemoteFleetProfile[] {
  const assignment = assignments.find(item => item.home === home && item.plan.room === bundle.room);
  if (!assignment) throw new Error('Missing committed remote fleet assignment');
  return bundle.sources.flatMap(source => sourceProfiles(home,assignment,offers,source));
}
function sourceProfiles(home: string, assignment: RemoteAssignment, offers: RemoteRoomOffer[], source: RemoteBundle['sources'][number]): RemoteFleetProfile[] {
  const facts = workforceQuote(assignment,offers,source.source);
  const common = { home,room: assignment.plan.room,source: source.source,generation: assignment.generation };
  return [profile({ ...common,kind: 'miner',body: [...facts.policy.miner.body],desired: 1,travelTicks: facts.travel.minerTicks,
    marginTicks: facts.policy.miner.replacementMargin ?? 0,retireTicks: facts.travel.minerTicks+(facts.policy.miner.replacementMargin ?? 0),priority: 20 }),
    profile({ ...common,kind: 'courier',body: [...facts.policy.hauler.body],desired: source.economics.haulers,travelTicks: facts.travel.outboundTicks,
      marginTicks: facts.policy.hauler.replacementMargin ?? 0,retireTicks: source.economics.tripTicks+(facts.policy.hauler.replacementMargin ?? 0),priority: 30 })];
}

function workforceQuote(assignment: RemoteAssignment, offers: RemoteRoomOffer[], source: string) {
  const facts = offers.find(offer => offer.room === assignment.plan.room)?.quotes.find(quote => quote.assessment.source === source)?.assessment;
  if (!facts || !assignment.plan.sources.includes(source)) throw new Error('Missing quoted remote workforce');
  return facts;
}

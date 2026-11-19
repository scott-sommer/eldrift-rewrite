import { createRemoteRoomOffer } from '../reservation/room-offer';
import { validateRemoteOffers } from '../portfolio-validation';
import { selectRemotePortfolio } from '../portfolio';
import { assessRemoteEconomics } from '../../../capabilities/economy/remote-economics';
import { validateTraversalPolicy } from '../../intel/traversal-validation';
import { natural, room } from '../assignment-validation';
import type { RemoteManagementRequest, RemoteScanBudget } from './model';
export function validateManagementRequest(request: RemoteManagementRequest): void {
  if (!room(request.home) || !natural(request.tick)) throw new Error('Invalid remote management clock/home');
  const policy = request.policy;
  if (policy.traversal.mode !== 'known-safe') throw new Error('Remote management requires known-safe policy');
  validateTraversalPolicy(policy.traversal,request.tick);
  const offers = policy.candidates.map(candidate => createRemoteRoomOffer(candidate,['validation']));
  validateRemoteOffers(offers,{ ...policy.portfolio,home: request.home,tick: request.tick });
  const economic = policy.economics;
  assessRemoteEconomics({ ...economic,capacity: 1500,miner: { ...economic.miner,travelTicks: 0,returnTicks: 0 },
    hauler: { ...economic.hauler,outboundTicks: 0,returnTicks: 0 } });
  if (!validTiming(policy)) throw new Error('Invalid remote management timing');
  if (typeof policy.reserve !== 'boolean' || !validInfrastructure(policy.infrastructure)) throw new Error('Invalid remote management work policy');
  selectRemotePortfolio([],{ ...policy.portfolio,home: request.home,tick: request.tick });
}
export function validateScanBudget(budget: RemoteScanBudget): void {
  if (!natural(budget.rooms) || budget.rooms > 64 || !natural(budget.sources) || budget.sources > 128) throw new Error('Invalid remote scan budget');
}
function validTiming(policy: RemoteManagementRequest['policy']): boolean {
  return [policy.leaseLifetime,policy.scanLifetime,policy.reassessInterval].every(value => natural(value) && value > 0 && value <= 1000000)
    && policy.leaseLifetime > policy.scanLifetime+policy.reassessInterval;
}
function validInfrastructure(value: RemoteManagementRequest['policy']['infrastructure']): boolean {
  return value === null || typeof value.roads === 'boolean' && typeof value.containers === 'boolean';
}

import { remoteMinerTiming, remoteHaulerTiming } from './remote-timing';
import { operatingBody, operatingHauler } from './remote-body';
import { remoteProduction } from './remote-production';
import { validateEconomicResult, validateRemoteEconomics } from './remote-validation';
import type { RemoteEconomicsInput, RemoteEconomicsResult, RemoteEconomics, RemoteBudgetRejection } from './remote-model';
/** Steady-state expected service with planned replacement; not an observed throughput promise. */
export function assessRemoteEconomics(input: RemoteEconomicsInput): RemoteEconomicsResult {
  validateRemoteEconomics(input);
  const timing = { miner: remoteMinerTiming(input.miner),hauler: remoteHaulerTiming(input.hauler) };
  const miner = operatingBody(input.miner,timing.miner);
  if (!miner) return { status: 'infeasible', reason: 'miner-service' };
  const hauler = operatingHauler(input.hauler,timing.hauler);
  if (!hauler) return { status: 'infeasible', reason: 'hauler-service' };
  if (!miner.work) return { status: 'infeasible', reason: 'no-harvest' };
  if (!hauler.capacity) return { status: 'infeasible', reason: 'no-carry' };
  const production = remoteProduction(input,miner,hauler);
  const energy = { mining: miner.cost / miner.replacementTicks, hauling: production.haulers * hauler.cost / hauler.replacementTicks,
    reservation: input.reservation.energyPerTick / input.reservation.shares,
    infrastructure: input.infrastructurePerTick, risk: input.riskPerTick, total: 0 };
  energy.total = energy.mining + energy.hauling + energy.reservation + energy.infrastructure + energy.risk;
  const spawn = { mining: miner.spawnTicks / miner.replacementTicks,
    hauling: production.haulers * hauler.spawnTicks / hauler.replacementTicks,
    reservation: input.reservation.spawnLoad / input.reservation.shares, total: 0 };
  spawn.total = spawn.mining + spawn.hauling + spawn.reservation;
  const netRate = production.deliveredRate - energy.total;
  const rejected: RemoteBudgetRejection[] = [];
  if (netRate < input.limits.minimumNetYield) rejected.push('net-yield');
  if (spawn.total > input.limits.maximumSpawnLoad) rejected.push('spawn-load');
  const result: RemoteEconomics = { status: 'evaluated',timing, ...production, netRate, energy, spawn,
    reservationShares: input.reservation.shares, accepted: !rejected.length, rejected };
  validateEconomicResult(result);
  return result;
}

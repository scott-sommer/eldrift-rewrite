import { framedIdentity } from '../../src/core/framed-identity';
import type { RemotePortfolioPolicy, RemoteQuote, RemoteRoomOffer } from '../../src/features/remotes/portfolio-model';
export function portfolioPolicy(overrides: Partial<RemotePortfolioPolicy> = {}): RemotePortfolioPolicy {
  return { home: 'W0N1',tick: 20,maximumAge: 10,maximumSlots: 4,maximumHaulers: 20,
    maximumSpawnLoad: 1,minimumNetYield: 0.1,completionBonus: 0.15,order: 'nearest',...overrides };
}
export function remoteOffer(room = 'E0N1', distances = [20,40]): RemoteRoomOffer {
  const sourceIds = distances.map((_,index) => room + '-source-' + index);
  const quotes = distances.map((distance,index): RemoteQuote => ({
    assessment: { status: 'assessed',id: 'remote-source:' + framedIdentity(['W0N1',sourceIds[index]!]),home: 'W0N1',room,
      source: sourceIds[index]!,observedAt: 15,sourceFacts: { id: sourceIds[index]!,x: 10,y: 10,capacity: 1500 },
      reservation: { state: 'none',username: null,remainingTicks: 0,observedAt: 15 },
      travel: { status: 'complete',minerTicks: distance,outboundTicks: distance,returnTicks: distance * 2,
        rooms: room === 'E0N1' ? ['W0N1',room] : ['W0N1','W0N2',room],operations: 100 },
      economics: { status: 'infeasible',reason: 'no-carry' } },
    policy: { regenerationTicks: 300,harvestPower: 2,miner: { body: ['work','work','work','move','move'],lifetime: 1500 },
      hauler: { body: ['carry','carry','move','move'],lifetime: 1500,serviceTicks: 2 },
      reservation: { energyPerTick: 1,spawnLoad: 0.01,shares: 99 },infrastructurePerTick: 0.05,riskPerTick: 0,
      limits: { maximumHaulers: 20,maximumSpawnLoad: 1,minimumNetYield: 0.1 } }
  }));
  return { room,sourceIds,quotes,commitment: { atomic: false,slots: 0,energyPerTick: 0,spawnLoad: 0 } };
}

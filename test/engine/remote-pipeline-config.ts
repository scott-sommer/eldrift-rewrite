import type { RuntimeConfig } from '../../src/config/model';
export function pipelineScenarioConfig(): Partial<RuntimeConfig> {
  return { scoutsEnabled: true,scoutSpawningEnabled: true,scoutCount: 1,scoutAssignedRooms: ['E0N1'],scoutDemandInterval: 1,scoutPlanCpuBudget: 100,scoutControlCpuBudget: 100,
    remoteManagementEnabled: true,remoteWorkersEnabled: true,remoteSpawningEnabled: true,remoteReservationEnabled: true,remoteReservationBodyBudget: 1300,remoteReservationEnergyReserve: 0,
    remoteWorkerCpuBudget: 100,remoteCpuBudget: 100,backgroundCpuFraction: 0.9,remoteDepth: 1,remoteBlockedRooms: ['W0N0','W0N2','W1N1'],remoteDiscoveryRefresh: 10,remoteDiscoveryReads: 4,
    remoteMaximumSlots: 2,remoteWorkerMaximumUnits: 10,remoteMaximumSpawnLoad: 2,remoteMaximumPathOps: 10000,remoteReassessInterval: 30,
    remoteLeaseLifetime: 200,remoteScanLifetime: 50,intelMaximumAge: 200,remoteContainersEnabled: false,
    logisticsEnabled: true,energyRequestsEnabled: true,distributorSpawningEnabled: true,distributorTarget: 1,distributorBodyBudget: 150,
    recoveryEnabled: false,miningEnabled: false,energyBankingEnabled: false,storeBalancingEnabled: false,preservationEnabled: false };
}

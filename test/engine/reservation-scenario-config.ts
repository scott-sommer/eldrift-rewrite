import type { RuntimeConfig } from '../../src/config/model';
export function reservationScenarioConfig(mode: 'normal' | 'admission' | 'cancel' = 'normal'): Partial<RuntimeConfig> {
  return { remoteManagementEnabled: true,remoteWorkersEnabled: true,remoteSpawningEnabled: true,remoteReservationEnabled: true,
    remoteReservationBodyBudget: 1300,remoteReservationEnergyReserve: mode === 'admission' ? 8000 : 0,remoteReservationMinimumBuffer: 100,remoteReservationQuoteRooms: 1,
    remoteWorkerCpuBudget: 100,remoteCpuBudget: 0,remoteMaximumSlots: 2,remoteMaximumSpawnLoad: 2,remoteMaximumPathOps: 10000,
    remoteReassessInterval: 30,remoteLeaseLifetime: 200,remoteScanLifetime: 50,intelMaximumAge: 200,remoteContainersEnabled: false,
    logisticsEnabled: true,energyRequestsEnabled: true,distributorSpawningEnabled: true,distributorTarget: 1,distributorBodyBudget: 150,
    recoveryEnabled: false,energyBankingEnabled: false,preservationEnabled: false };
}

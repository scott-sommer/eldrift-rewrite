export interface RemoteStartupConfig {
  remoteStartupPolicy: 'eager' | 'staged' | 'economic';
  remoteStartupEnergyReserve: number; remoteStartupCourierLead: number;
  remoteStartupHorizon: number; remoteStartupFrames: number; remoteStartupPlanningLead: number;
  remoteStartupMinimumMargin: number; remoteStartupMaximumCapital: number;
}
export const remoteStartupDefaults: Readonly<RemoteStartupConfig> = Object.freeze({
  remoteStartupPolicy: 'eager',remoteStartupEnergyReserve: 0,remoteStartupCourierLead: 0,
  remoteStartupHorizon: 1500,remoteStartupFrames: 20,remoteStartupPlanningLead: 100,
  remoteStartupMinimumMargin: 0,remoteStartupMaximumCapital: 10000,
});
const integer = (value: unknown, minimum: number, maximum: number) => typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
export const remoteStartupValidators: { [K in keyof RemoteStartupConfig]: (value: unknown) => boolean } = {
  remoteStartupPolicy: value => typeof value === 'string' && ['eager','staged','economic'].includes(value),
  remoteStartupEnergyReserve: value => integer(value,0,1000000),remoteStartupCourierLead: value => integer(value,0,1500),
  remoteStartupHorizon: value => integer(value,1,10000),remoteStartupFrames: value => integer(value,1,10001),
  remoteStartupPlanningLead: value => integer(value,1,1500),remoteStartupMinimumMargin: value => integer(value,0,1000000),
  remoteStartupMaximumCapital: value => integer(value,0,1000000),
};

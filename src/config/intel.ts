export interface IntelConfig {
  intelEnabled: boolean;
  intelCaptureInterval: number;
  intelMaximumAge: number;
  intelCaptureCpuBudget: number;
  intelCaptureRooms: number;
  intelCaptureScans: number;
}
export const intelDefaults: Readonly<IntelConfig> = Object.freeze({
  intelEnabled: false, intelCaptureInterval: 50, intelMaximumAge: 5000,
  intelCaptureCpuBudget: 3, intelCaptureRooms: 4, intelCaptureScans: 32,
});
function integer(value: unknown, minimum: number, maximum: number): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}
export const intelValidators: { [K in keyof IntelConfig]: (value: unknown) => boolean } = {
  intelEnabled: value => typeof value === 'boolean',
  intelCaptureInterval: value => integer(value, 1, 1000000),
  intelMaximumAge: value => integer(value, 0, 1000000),
  intelCaptureCpuBudget: value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000,
  intelCaptureRooms: value => integer(value, 0, 1000),
  intelCaptureScans: value => integer(value, 0, 10000),
};
const empireKeys = new Set(['intelCaptureCpuBudget', 'intelCaptureRooms', 'intelCaptureScans']);
export function validateIntelScope(key: string, layer: string): void {
  if (empireKeys.has(key) && layer !== 'environment' && layer !== 'empire') {
    throw new Error(`${layer}.${key}: shared capture budget requires environment or empire scope`);
  }
}

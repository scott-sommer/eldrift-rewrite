export interface SelfBuildInput {
  remainingProgress: number; carriedEnergy: number; carryCapacity: number;
  harvestPower: number; buildPower: number; maximumTicks: number;
  source: { energy: number; capacity: number; regenerationTicks: number; regenerationIn: number | null };
}
export interface SelfBuildState {
  ticks: number; remainingProgress: number; carriedEnergy: number; sourceEnergy: number; regenerateAt: number | null;
  harvestedEnergy: number; constructionEnergy: number; regeneratedEnergy: number; harvestTicks: number; buildTicks: number; idleTicks: number;
}
export interface SelfBuildForecast extends Omit<SelfBuildState,'regenerateAt'> {
  status: 'complete' | 'incomplete'; regenerationIn: number | null;
}

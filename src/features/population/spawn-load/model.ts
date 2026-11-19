export const spawnLoadWindow = 1500;
export interface SpawnLoadSample { busy: number; starved: number; spawns: number }
export interface SpawnLoadSegment extends SpawnLoadSample { from: number; to: number }
export interface SpawnLoadRecord { home: string; revision: number; clock: number; segments: SpawnLoadSegment[] }
export interface SpawnLoadReport { load: number; coverage: number; busyTicks: number; starvedTicks: number; spawnCount: number }

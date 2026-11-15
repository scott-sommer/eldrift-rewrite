import type { PlacedTile } from './template';
export interface CorePlacement extends PlacedTile {
  rcl: number;
  priority: number;
  tag: 'core' | 'storage' | 'terminal';
}
export type StructureLimits = Readonly<Record<string, readonly number[]>>;

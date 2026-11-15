import type { Tile } from '../../core/geometry/local-grid';
import type { TerrainCell, TerrainCosts } from './terrain';
export interface FixedObject { id: string; kind: 'source' | 'controller' | 'mineral'; position: Tile }
export interface Infrastructure { id: string; type: string; position: Tile; walkable: boolean; owned: boolean }
export interface PlanningConstraint { id: string; kind: 'keep-clear' | 'blocked' | 'locked'; position: Tile; type?: string }
export interface AssessmentInput {
  terrain: readonly TerrainCell[];
  objects: readonly FixedObject[];
  infrastructure: readonly Infrastructure[];
  constraints: readonly PlanningConstraint[];
  costs?: TerrainCosts;
  margin?: number;
}

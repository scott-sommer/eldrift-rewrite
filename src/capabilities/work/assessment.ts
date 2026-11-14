import type { Position } from '../movement/step';
export interface WorkTarget { id: string; position: Position }
export interface WorkSite extends WorkTarget { type: string; progress: number; total: number; ready: boolean }
export interface WorkStructure extends WorkTarget { type: string; hits: number; maximum: number; eligible: boolean; excluded: boolean }
export interface WorkController extends WorkTarget { owned: boolean; level: number; downgrade: number }
export interface WorkAssessment { sites: readonly WorkSite[]; structures: readonly WorkStructure[]; controller?: WorkController }
export interface WorkOrder extends WorkTarget {
  kind: 'build' | 'repair' | 'upgrade';
  priority: number;
  score: number;
  targetHits?: number;
}

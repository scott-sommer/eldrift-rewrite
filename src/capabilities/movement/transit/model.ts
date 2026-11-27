import type { Position } from '../step';
export interface TransitPlan {
  unit: string; order?: string; owner: string; priority: number; weight: number; recovery: number;
  origin: Position; path: readonly Position[]; group?: string;
}
export interface TransitState {
  unit: string; position: Position; index: number; fatigue: number; readyAt: number; arrivedAt?: number; lastAt?: number;
}

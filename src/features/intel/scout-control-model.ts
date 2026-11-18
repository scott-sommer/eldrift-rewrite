import type { ExecutionState, Outcome } from '../../core/execution/model';
import type { Position } from '../../capabilities/movement/step';
export const scoutControlPhases = ['choose','stabilize','travel','evade'] as const;
export interface ScoutControl extends ExecutionState {
  id: string; home: string; objective: string | null; assigned: string[]; assignmentIndex: number;
  room: string; enteredAt: number; visited: boolean; lastTick: number | null; lastPosition: Position | null;
  previousRoom: string | null; transitionAt: number | null; stuck: number; oscillations: number;
  moving: boolean; escapeCursor: number; avoidUntil: Record<string, number>;
}
export interface ScoutControlPolicy {
  assigned: readonly string[]; stabilizeTicks: number; hostileAvoidTicks: number; routeAvoidTicks: number;
  stuckTicks: number; oscillationLimit: number;
}
export interface ScoutControlPorts {
  next(control: Readonly<ScoutControl>): string | undefined;
  fallback?(avoid: Readonly<Record<string, number>>): Outcome | undefined;
  stabilize(cursor: number): Outcome;
  travel(room: string, avoid: Readonly<Record<string,number>>): Outcome;
  escape(avoid: Readonly<Record<string,number>>, cursor: number): string | undefined;
  capture(visited: boolean): void;
  failure(room: string, reason: string): void;
}
export interface ScoutControlContext {
  tick: number; position: Position; canMove: boolean; dangerous: boolean;
  policy: ScoutControlPolicy; ports: ScoutControlPorts;
}

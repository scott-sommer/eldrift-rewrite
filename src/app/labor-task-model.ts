import type { Position } from '../capabilities/movement/step';
import type { BodyPart } from '../capabilities/spawning/body';
import type { WorkOrder } from '../capabilities/work/assessment';
import type { LaborTaskPayload } from '../features/work/labor-task';
import type { LaborProgress } from '../features/work/labor-progress';
export interface LaborActor { id: string; name: string; owner: string; body: readonly BodyPart[]; position: Position; energy: number; spawning: boolean }
export interface LaborTaskPorts<Context> {
  now(context: Context): number;
  worker(context: Context): LaborActor | undefined;
  authorized(context: Context, payload: LaborTaskPayload): boolean;
  remainingWork(context: Context, order: WorkOrder): number | undefined;
  move(context: Context, destination: Position, owner: string): void;
  pickup(context: Context, payload: LaborTaskPayload, energy: number, owner: string): boolean;
  work(context: Context, payload: LaborTaskPayload, maximum: number, owner: string): boolean;
  deposit(context: Context, payload: LaborTaskPayload, energy: number, owner: string): boolean;
  completed(context: Context, progress: Readonly<LaborProgress>): void;
}

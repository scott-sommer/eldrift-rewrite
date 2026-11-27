import type { Position } from '../../../../../capabilities/movement/step';
import type { StartupProjectMotionInput } from '../../../../../capabilities/economy/startup/courier-trips/project-model';
import type { NativeStartupQuote } from '../model';
export type NativeMotionQuote = NativeStartupQuote & { rooms: readonly string[] };
export interface MotionGeometryEnvironment { topology: string; rate(position: Position): 1 | 2 | 10 | undefined }
export type NativeMotionGeometry = { status: 'ready'; observedAt: number; quoteIdentity: string; geometry: Pick<StartupProjectMotionInput,'routes' | 'terrain'> } | { status: 'deferred'; reason: string };

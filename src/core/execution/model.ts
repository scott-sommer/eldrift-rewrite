export type Outcome =
  | { status: 'running' }
  | { status: 'done' }
  | { status: 'failed'; reason: string }
  | { status: 'blocked'; retryAt: number; reason: string }
  | { status: 'transition'; phase: string };
export interface ExecutionState {
  phase: string;
  retries: number;
  wakeAt: number;
  expiresAt: number;
}
export interface ExecutionResult {
  state: ExecutionState;
  outcome: Exclude<Outcome, { status: 'transition' }>;
  steps: number;
}
export type Handlers<Context> = Readonly<Record<string, (context: Context) => Outcome>>;

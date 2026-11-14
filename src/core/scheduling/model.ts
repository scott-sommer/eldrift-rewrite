export interface ScheduledWork {
  id: string;
  room?: string;
  urgency: 'urgent' | 'background';
  interval: number;
  run(): void;
}
export interface SchedulerBudget {
  tick: number;
  tickLimit: number;
  bucket: number;
  backgroundEnabled: boolean;
  backgroundCpuFraction: number;
  minimumBucket: number;
}
export interface Failure {
  id: string;
  room?: string;
  tick: number;
  error: unknown;
}
export interface SchedulerPorts {
  usedCpu(): number;
  reportFailure(failure: Failure): void;
}
export interface ScheduleEntry {
  work: ScheduledWork;
  due: number;
}

import type { ConfigInput, EffectiveConfig } from '../config/model';
import type { Failure, SchedulerPorts } from '../core/scheduling/model';
import type { ObservationSource, RoomView, TickView } from '../world/model';
export interface FeatureContext {
  readonly world: TickView;
  readonly room: RoomView;
  readonly config: EffectiveConfig;
}
export interface RoomFeature {
  readonly id: string;
  readonly urgency: 'urgent' | 'background';
  readonly interval: number;
  run(context: FeatureContext): void;
}
export interface RuntimePorts extends SchedulerPorts {
  observations: ObservationSource;
  config(room?: string): ConfigInput;
  clock(): { tick: number; tickLimit: number; bucket: number };
}
export interface RuntimeResult {
  world: TickView;
  failures: readonly Failure[];
}

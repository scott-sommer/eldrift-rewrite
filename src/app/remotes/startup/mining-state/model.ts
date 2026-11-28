import type { Position } from '../../../../capabilities/movement/step';
import type { Outcome } from '../../../../core/execution/model';
import type { MiningStation } from '../../../../capabilities/mining/station';
import type { RemoteMiningDemand } from '../../mining-task';
export interface ForecastMinerWorker { name: string; unit: string }
/** Current usable infrastructure, with native range/activity/ownership checks already applied by its observer. */
export interface ForecastMiningInfrastructure { sink?: string; site?: string; repair?: { id: string; hits: number; hitsMax: number } }
/** Current modeled environment and non-transfer work effects; no live SDK access. */
export interface ForecastMiningPorts {
  allowed(worker: ForecastMinerWorker,demand: RemoteMiningDemand): boolean;
  tile(worker: ForecastMinerWorker,demand: RemoteMiningDemand): Position;
  station(worker: ForecastMinerWorker,demand: RemoteMiningDemand): MiningStation | undefined;
  infrastructure(worker: ForecastMinerWorker,station: MiningStation): ForecastMiningInfrastructure;
  harvestPower(worker: ForecastMinerWorker): number;
  move(worker: ForecastMinerWorker,owner: string,destination: Position): Outcome;
  retire(worker: ForecastMinerWorker,home: string,owner: string): Outcome;
  build(worker: ForecastMinerWorker,site: string,id: string): number;
  repair(worker: ForecastMinerWorker,target: string,id: string): number;
}

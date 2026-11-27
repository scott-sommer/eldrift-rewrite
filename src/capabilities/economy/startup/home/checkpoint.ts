import { keys,record,integer,requireCheckpoint } from '../checkpoints/validation';
import { boundedProjectCheckpoint } from '../checkpoints/project';
import { restoreSinkCheckpoint } from '../checkpoints/sink';
import { createStartupProjectTimeline } from '../project-timeline';
import { trafficOccupancy } from '../../../movement/traffic/validation';
import { startupHomeOccupants } from './occupants';
import { startupHomeTimelineInput } from './timeline-input';
import { startupHomeIdentity } from './identity';
import { readHomeSourceCheckpoint } from './source-checkpoint';
import { validateHomeCheckpointLinks } from './checkpoint-links';
import type { prepareStartupHomeProject } from './input';
import type { StartupHomeCheckpoint } from './checkpoint-model';
export function readStartupHomeCheckpoint(input: ReturnType<typeof prepareStartupHomeProject>,value: unknown): StartupHomeCheckpoint {
  const raw = boundedProjectCheckpoint(value);
  requireCheckpoint(record(raw) && keys(raw,['format','binding','tick','timeline','sink','sources',...(input.household ? ['household'] : [])]));
  const saved = raw as StartupHomeCheckpoint;
  requireCheckpoint(saved.format === 1 && saved.binding === startupHomeIdentity(input));
  requireCheckpoint(integer(saved.tick,0,input.spawning.cash.horizon+1));
  createStartupProjectTimeline(startupHomeTimelineInput(input),saved);
  restoreSinkCheckpoint(input.sink.capacity,input.spawning.cash.horizon,saved.sink);
  requireCheckpoint(Array.isArray(saved.sources) && saved.sources.length === input.sources.length);
  saved.sources = input.sources.map((source,index) => readHomeSourceCheckpoint(source,saved.sources[index],saved.tick,saved.timeline.births));
  validateHomeCheckpointLinks(input,saved);
  const couriers = saved.sources.flatMap(source => source.trips.map(trip => ({ unit: trip.transit.unit,position: trip.transit.position })));
  trafficOccupancy([...couriers,...startupHomeOccupants(input.blockers,Math.max(0,saved.tick-1))]);
  return saved;
}

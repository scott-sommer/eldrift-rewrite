import type { StartupEnergyCheckpoint, StartupEnergyEvent } from './model';
interface ReplayPorts {
  quiet(through: number): void;
  action(event: StartupEnergyEvent): void;
  settle(tick: number): readonly StartupEnergyEvent[];
}
/** Visit stored event groups, not elapsed frames. A quiet gap is valid only if no gift was possible. */
export function replayRegeneration(saved: StartupEnergyCheckpoint, ports: ReplayPorts): void {
  const through = saved.ambientThrough;
  if (!Number.isSafeInteger(through) || through! < -1 || through! > 10000) throw new Error('Invalid ambient checkpoint clock');
  let index = 0, previous = -1;
  while (index < saved.events.length) {
    const tick = saved.events[index]!.tick;
    if (tick <= previous || tick > through!+1) throw new Error('Invalid ambient event order');
    ports.quiet(tick-1);
    const group = replayActions(saved.events,index,ports); index = group.next;
    const ambient = group.ambient;
    const actual = tick <= through! ? ports.settle(tick) : [];
    if (JSON.stringify(actual.map(identity)) !== JSON.stringify(ambient.map(identity))) throw new Error('Ambient event conservation');
    previous = tick;
  }
  ports.quiet(through!);
}
function identity(event: StartupEnergyEvent) { return [event.kind,event.holder,event.tick,event.energy,event.kind === 'charge' ? event.spawn : event.structure]; }

function replayActions(events: readonly StartupEnergyEvent[], start: number, ports: ReplayPorts) {
  let next = start, passive = false; const ambient: StartupEnergyEvent[] = [], tick = events[start]!.tick;
  while (next < events.length && events[next]!.tick === tick) {
    const event = events[next++]!;
    if (event.kind === 'ambient') { passive = true; ambient.push(event); }
    else { if (passive) throw new Error('Action after ambient settlement'); ports.action(event); }
  }
  return { next,ambient };
}

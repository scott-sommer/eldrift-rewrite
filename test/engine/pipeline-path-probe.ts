interface OperationMetric {
  actor: string; operation: string; window: string; calls: number; totalCpu: number; maximumCpu: number; firstAt: number; lastAt: number;
}
export interface PathProbeMemory extends Memory {
  pipelineConfiguredPathProbeMode?: boolean;
  pipelinePathProbe?: { rows: Record<string,OperationMetric>; droppedCalls: number };
}
let actor: string | undefined;
const reloads = new Set([311,591,861]);
export function observePathActor(phase: string): void {
  const match = /^actor:([^:]+):(begin|done|yield|deferred)$/.exec(phase);
  if (match) actor = match[2] === 'begin' ? match[1] : undefined;
}
function record(operation: string, cpu: number): void {
  const memory = Memory as PathProbeMemory, metrics = memory.pipelinePathProbe ??= { rows: {},droppedCalls: 0 };
  const subject = actor ?? 'background', window = reloads.has(Game.time) ? 'reload:'+Game.time : 'normal';
  const key = JSON.stringify([subject,operation,window]);
  let row = Object.hasOwn(metrics.rows,key) ? metrics.rows[key] : undefined;
  if (!row) {
    if (Object.keys(metrics.rows).length >= 256) { metrics.droppedCalls++; return; }
    row = metrics.rows[key] = { actor: subject,operation,window,calls: 0,totalCpu: 0,maximumCpu: 0,firstAt: Game.time,lastAt: Game.time };
  }
  row.calls++; row.totalCpu += cpu; row.maximumCpu = Math.max(row.maximumCpu,cpu); row.lastAt = Game.time;
}
/** Preserve SDK overloads, receiver, arguments and exact returned object; only timing is observed. */
function measured<F extends (...args: never[]) => unknown>(original: F, label: (args: unknown[]) => string): F {
  return function(this: unknown,...args: unknown[]) {
    const start = Game.cpu.getUsed();
    try { return Reflect.apply(original,this,args); }
    finally { record(label(args),Game.cpu.getUsed()-start); }
  } as unknown as F;
}
/** Injected only into diagnostic bundles; the native global and frozen SDK remain untouched. */
export function pathProbeSearch(...args: Parameters<typeof PathFinder.search>): ReturnType<typeof PathFinder.search> {
  const native = (globalThis as unknown as { PathFinder: typeof PathFinder }).PathFinder;
  if (!(Memory as PathProbeMemory).pipelineConfiguredPathProbeMode) return Reflect.apply(native.search,native,args);
  return Reflect.apply(measured(native.search,() => 'search'),native,args);
}
export function withPipelinePathProbe(run: () => void): void {
  if (!(Memory as PathProbeMemory).pipelineConfiguredPathProbeMode) { run(); return; }
  const find = Room.prototype.find; actor = undefined;
  try {
    Room.prototype.find = measured(find,args => 'find:'+(typeof args[0] === 'number' ? args[0] : 'invalid'));
    run();
  } finally { Room.prototype.find = find; actor = undefined; }
}

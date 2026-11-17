export interface CapacityEdge { from: number; to: number; capacity: number }
interface ResidualEdge { to: number; reverse: number; capacity: number }
/** Original Edmonds-Karp implementation. Each batch limits augmentations; BFS edge scans can yield across calls. */
export function createResidualNetwork(size: number, edges: readonly CapacityEdge[], source: number, sink: number) {
  const construction = buildNetwork(size, edges, source, sink), graph = construction.graph;
  let flow = 0, done = false, reachable: number[] = [];
  let pending: ReturnType<typeof searchPath> | undefined;
  return { advance(maximumAugmentations: number, guard: () => boolean = () => true, maximumScans = Number.MAX_SAFE_INTEGER) {
    validateAugmentationBudget(maximumAugmentations);
    validateScanBudget(maximumScans);
    const prepared = construction.advance(maximumScans, guard);
    let augmentations = 0, scans = prepared.scans;
    if (!prepared.done) return { done, flow, augmentations, scans };
    while (!done && augmentations < maximumAugmentations && scans < maximumScans && guard()) {
      pending ??= searchPath(graph, source, sink);
      const step = pending.next(); scans++;
      if (!step.done) continue;
      const search = step.value; pending = undefined;
      if (search.parents[sink] === undefined) {
        done = true; reachable = search.queue.sort((a, b) => a - b); break;
      }
      flow += augment(graph, search.parents, source, sink);
      validateFlow(flow);
      augmentations++;
    }
    return { done, flow, augmentations, scans, ...(done ? { reachable: [...reachable] } : {}) };
  } };
}
function addEdge(graph: ResidualEdge[][], edge: CapacityEdge): void {
  graph[edge.from]!.push({ to: edge.to, reverse: graph[edge.to]!.length, capacity: edge.capacity });
  graph[edge.to]!.push({ to: edge.from, reverse: graph[edge.from]!.length - 1, capacity: 0 });
}
function* searchPath(graph: ResidualEdge[][], source: number, sink: number) {
  const parents: ({ from: number; edge: number } | undefined)[] = Array(graph.length);
  const seen = new Set([source]), queue = [source];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const from = queue[cursor]!;
    for (let edge = 0; edge < graph[from]!.length; edge++) {
      yield;
      const next = graph[from]![edge]!;
      if (next.capacity === 0 || seen.has(next.to)) continue;
      seen.add(next.to); parents[next.to] = { from, edge }; queue.push(next.to);
      if (next.to === sink) return { parents, queue };
    }
  }
  return { parents, queue };
}
function augment(graph: ResidualEdge[][], parents: ({ from: number; edge: number } | undefined)[], source: number, sink: number): number {
  let amount = Number.MAX_SAFE_INTEGER;
  for (let node = sink; node !== source;) {
    const parent = parents[node]!;
    amount = Math.min(amount, graph[parent.from]![parent.edge]!.capacity); node = parent.from;
  }
  for (let node = sink; node !== source;) {
    const parent = parents[node]!, edge = graph[parent.from]![parent.edge]!;
    edge.capacity -= amount; graph[node]![edge.reverse]!.capacity += amount; node = parent.from;
  }
  return amount;
}

function buildNetwork(size: number, edges: readonly CapacityEdge[], source: number, sink: number) {
  if (!Number.isSafeInteger(size) || size < 2 || size > 10000) throw new Error('Invalid network size');
  const validNode = (node: number) => Number.isSafeInteger(node) && node >= 0 && node < size;
  if (!validNode(source) || !validNode(sink) || source === sink) throw new Error('Invalid terminals');
  const graph: ResidualEdge[][] = Array.from({ length: size }, () => []);
  const snapshot = edges.map(edge => { validateEdge(edge, validNode); return { ...edge }; });
  let cursor = 0;
  return { graph, advance(maximum: number, guard: () => boolean) {
    let scans = 0;
    while (cursor < snapshot.length && scans < maximum && guard()) {
      addEdge(graph, snapshot[cursor++]!); scans++;
    }
    // A false guard prevents the caller's BFS loop too; consumed budget prevents early search.
    return { scans, done: cursor === snapshot.length };
  } };

}

function validateEdge(edge: CapacityEdge, validNode: (node: number) => boolean): void {
  if (!validNode(edge.from) || !validNode(edge.to) || edge.from === edge.to) throw new Error('Invalid edge endpoints');
  if (!Number.isSafeInteger(edge.capacity) || edge.capacity < 0) throw new Error('Invalid capacity');
}

function validateScanBudget(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid flow scan budget');
}

function validateAugmentationBudget(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid flow budget');
}

function validateFlow(flow: number): void {
  if (!Number.isSafeInteger(flow)) throw new Error('Flow overflow');
}

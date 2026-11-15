import type { Position } from '../../capabilities/movement/step';
export interface WorkerSourceAssignment { source: string; position: Position }
export function chooseWorkerSource(sources: readonly { id: string; position: Position }[],
  assignments: readonly WorkerSourceAssignment[]): WorkerSourceAssignment | undefined {
  const count = (source: { id: string; position: Position }) => assignments.filter(assignment =>
    assignment.source === source.id && assignment.position.room === source.position.room).length;
  const selected = [...sources].sort((a, b) => count(a) - count(b) || a.id.localeCompare(b.id))[0];
  return selected ? { source: selected.id, position: { ...selected.position } } : undefined;
}

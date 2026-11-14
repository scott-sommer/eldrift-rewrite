import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';

export function tracePosition(map, line, column) {
  if (!Number.isInteger(line) || line < 1 || !Number.isInteger(column) || column < 1) {
    throw new Error('Stack line and column must be positive integers (one-based).');
  }
  const original = originalPositionFor(new TraceMap(map), { line, column: column - 1 });
  if (original.source === null) throw new Error('No source mapping for this position.');
  return { ...original, column: original.column + 1 };
}

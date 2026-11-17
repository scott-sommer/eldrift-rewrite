/** Reduce expensive clock reads while bounding work between observations by a fixed call count. */
export function sampledGuard(guard: () => boolean, interval: number): () => boolean {
  if (!Number.isSafeInteger(interval) || interval < 1 || interval > 1024) throw new Error('Invalid guard interval');
  let remaining = 0, admitted = true;
  return () => {
    if (!admitted) return false;
    if (remaining === 0) { admitted = guard(); remaining = interval; }
    remaining--;
    return admitted;
  };
}

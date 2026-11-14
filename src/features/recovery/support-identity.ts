const prefix = 'recovery-support:';
export function isSupportScope(owner: string): boolean { return owner.startsWith(prefix); }
/** The donor/target pair is the population and request scope, independent of creep names. */
export function supportOwner(home: string, target: string): string {
  if (!home || !target || home === target) throw new Error('Invalid support route');
  return prefix + JSON.stringify([home, target]);
}
export function supportTarget(owner: string, home: string): string | undefined {
  if (!home || !owner.startsWith(prefix)) return undefined;
  try {
    const value: unknown = JSON.parse(owner.slice(prefix.length));
    return validRoute(value, home) ? value[1] : undefined;
  } catch { return undefined; }
}
function validRoute(value: unknown, home: string): value is [string, string] {
  return Array.isArray(value) && value.length === 2 && value[0] === home
    && typeof value[1] === 'string' && value[1].length > 0 && value[1] !== home;
}

const prefix = 'upgrade-supply:';
export function upgradeSupplyTarget(owner: string, home: string): string | undefined {
  if (!owner.startsWith(prefix)) return undefined;
  try {
    const route: unknown = JSON.parse(owner.slice(prefix.length));
    return validRoute(route, home) ? route[1] : undefined;
  } catch { return undefined; }
}
function validRoute(route: unknown, home: string): route is [string, string] {
  return !!home && Array.isArray(route) && route.length === 2 && route[0] === home
    && typeof route[1] === 'string' && route[1].length > 0 && route[1] !== home;
}

export function isUpgradeSupplyScope(owner: string): boolean { return owner.startsWith(prefix); }

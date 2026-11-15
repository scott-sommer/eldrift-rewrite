/** Exact ordered string tuple: lengths prevent delimiter ambiguity without nested JSON escaping. */
export function framedIdentity(parts: readonly string[]): string {
  return parts.map(part => part.length + ':' + part).join('');
}

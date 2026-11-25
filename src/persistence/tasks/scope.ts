/** Common reservation scope for task owners and lifecycle cleanup. */
export function taskScope(unit: string, task: string): string {
  return `task:${JSON.stringify([unit, task])}`;
}

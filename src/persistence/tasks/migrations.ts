/** Version 1 had no retry/expiry fields; retain its unlimited lifetime explicitly. */
export function migrateTasksV1(value: unknown): unknown {
  if (!value || typeof value !== 'object' || !('queue' in value) || !Array.isArray(value.queue)) throw new Error('Invalid v1 tasks');
  return { ...value, queue: value.queue.map(task => {
    if (!task || typeof task !== 'object') throw new Error('Invalid v1 task');
    return { ...task, retries: 0, expiresAt: Number.MAX_SAFE_INTEGER };
  }) };
}

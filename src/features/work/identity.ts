/** Shared ownership identity for room workers; logistics only supplies their stores. */
export function workOwner(room: string): string { return 'work:' + room; }

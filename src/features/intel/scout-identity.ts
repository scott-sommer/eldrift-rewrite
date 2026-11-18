import { validScoutRoom } from './scout-validation';
export function scoutOwner(home: string): string {
  if (!validScoutRoom(home)) throw new Error('Invalid scout home');
  return `scout:${home}`;
}
export function scoutHome(owner: string): string | undefined {
  const home = owner.startsWith('scout:') ? owner.slice(6) : '';
  return validScoutRoom(home) ? home : undefined;
}

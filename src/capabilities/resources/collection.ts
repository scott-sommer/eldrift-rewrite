import type { Position } from '../movement/step';
export interface CollectionSource {
  id: string;
  position: Position;
  kind: 'drop' | 'container' | 'storage' | 'terminal' | 'link' | 'remains';
  stock: number;
  /** Uncommitted stock after shared allocations. */
  available: number;
  controllerLink?: boolean;
}
export interface CollectionOrder { source: CollectionSource; amount: number; reserve: number }

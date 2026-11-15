export interface ServiceRecipe {
  type: string; count: number; minimum: number; minRange: number; maxRange: number;
  priority: number; tag: 'service' | 'utility'; required: boolean;
}
export const compactServiceRecipes: readonly ServiceRecipe[] = [
  { type: 'spawn', count: 3, minimum: 1, minRange: 1, maxRange: 4, priority: -430, tag: 'service', required: true },
  { type: 'tower', count: 6, minimum: 3, minRange: 2, maxRange: 6, priority: -340, tag: 'service', required: true },
  { type: 'extension', count: 60, minimum: 2, minRange: 2, maxRange: 10, priority: -400, tag: 'service', required: true },
  { type: 'observer', count: 1, minimum: 8, minRange: 4, maxRange: 10, priority: -210, tag: 'utility', required: false },
  { type: 'powerSpawn', count: 1, minimum: 8, minRange: 3, maxRange: 9, priority: -240, tag: 'utility', required: false },
  { type: 'nuker', count: 1, minimum: 8, minRange: 5, maxRange: 12, priority: -220, tag: 'utility', required: false },
];

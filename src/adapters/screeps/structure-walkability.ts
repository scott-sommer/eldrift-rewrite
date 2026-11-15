export function blocksMovement(structure: AnyStructure): boolean {
  if (structure.structureType === STRUCTURE_RAMPART) return !structure.my && !structure.isPublic;
  return (OBSTACLE_OBJECT_TYPES as readonly string[]).includes(structure.structureType);
}

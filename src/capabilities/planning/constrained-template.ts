import type { TemplateTile } from './template';
/** Legacy constrained offsets; roads intentionally overlap two lab tiles. */
export const legacyConstrainedTemplate: readonly TemplateTile[] = [
  { type: 'storage', offset: { x: 0, y: 0 } },
  { type: 'terminal', offset: { x: 1, y: 0 } },
  { type: 'link', offset: { x: 0, y: 1 } },
  { type: 'lab', offset: { x: -1, y: -2 } },
  { type: 'lab', offset: { x: 1, y: -2 } },
  { type: 'lab', offset: { x: -1, y: -1 } },
  { type: 'lab', offset: { x: 0, y: -1 } },
  { type: 'lab', offset: { x: 1, y: -1 } },
  { type: 'lab', offset: { x: -1, y: -3 } },
  { type: 'lab', offset: { x: 0, y: -3 } },
  { type: 'lab', offset: { x: 1, y: -3 } },
  { type: 'lab', offset: { x: 0, y: -2 } },
  { type: 'lab', offset: { x: 0, y: -4 } },
  { type: 'road', offset: { x: -2, y: -4 } },
  { type: 'road', offset: { x: -1, y: -5 } },
  { type: 'road', offset: { x: 0, y: -5 } },
  { type: 'road', offset: { x: 1, y: -5 } },
  { type: 'road', offset: { x: 2, y: -4 } },
  { type: 'road', offset: { x: -2, y: -3 } },
  { type: 'road', offset: { x: 2, y: -3 } },
  { type: 'road', offset: { x: -2, y: -2 } },
  { type: 'road', offset: { x: 2, y: -2 } },
  { type: 'road', offset: { x: -2, y: -1 } },
  { type: 'road', offset: { x: 2, y: -1 } },
  { type: 'road', offset: { x: -2, y: 0 } },
  { type: 'road', offset: { x: -1, y: 0 } },
  { type: 'road', offset: { x: 0, y: -1 } },
  { type: 'road', offset: { x: 1, y: -1 } },
  { type: 'road', offset: { x: 2, y: 0 } },
  { type: 'road', offset: { x: -2, y: 1 } },
  { type: 'road', offset: { x: -1, y: 1 } },
  { type: 'road', offset: { x: 1, y: 1 } },
  { type: 'road', offset: { x: 2, y: 1 } },
  { type: 'road', offset: { x: -1, y: 2 } },
  { type: 'road', offset: { x: 0, y: 2 } },
  { type: 'road', offset: { x: 1, y: 2 } },
];

/** Open a lab service corridor while retaining all ten labs and range-two reaction geometry. */
export const constrainedTemplate: readonly TemplateTile[] = [...legacyConstrainedTemplate.map(entry => {
  if (entry.type !== 'lab' || entry.offset.x !== 0) return entry;
  if (entry.offset.y === -2) return { ...entry, offset: { x: 0, y: -5 } };
  if (entry.offset.y === -1) return { ...entry, offset: { x: 2, y: -3 } };
  return entry;
}), { type: 'road', offset: { x: 0, y: -2 } }];

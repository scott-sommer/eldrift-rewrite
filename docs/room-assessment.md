# Room assessment and geometry

ED-23 is in progress. It depends on completed ED-13/16, independently of ED-22's remaining role audit.

## Geometry foundation

core/geometry/local-grid.ts defines local integer tiles, row-major indices, bounded eight-neighbour adjacency and explicit room margins. World-room coordinates remain in room-grid.ts; local indices do not encode world-room identity. Invalid inputs fail rather than wrapping across borders.

core/geometry/transforms.ts selectively ports the eight stable transform indices from legacy room.layout.shared.js TRANSFORMS. Indices0–3 are rotations,4–7 reflections. Relative offsets may be negative; translated placements must remain within the requested margin. Transform calculation has no RoomPosition/Game dependency or side effects. Missing fit returns undefined; malformed anchor/transform throws. This supplies a reusable geometry boundary without coupling it to a layout strategy.

Tests enumerate all2500 local indices, validate adjacency uniqueness/bounds, check corner/edge/interior counts, preserve all eight legacy mappings, verify inverse rotations/reflections and exercise placement margins/invalid inputs.595tests/182files pass6.09s while native regression runs concurrently. Quality318production/285testfiles has zero Lizard violations.

## Remaining acceptance work

- Integrate these primitives with deterministic room assessment and consolidate applicable existing coordinate helpers.
- Compute connected buildable regions, clearance, exits and terrain costs.
- Describe immutable source/controller/mineral locations, adjacent work/access tiles, existing anchors and manual/locked constraints separately.
- Define versioned stable fingerprint inputs and explicit visibility/freshness metadata.
- Add open, constrained, disconnected, swamp-heavy and occupied room fixtures.
- Keep observations and assessment separate from construction, destructive actions and strategy selection.

No ED-23 acceptance checkbox is completed by geometry primitives alone. Native suite begun at374a549 does not exercise these new, currently unconnected modules.

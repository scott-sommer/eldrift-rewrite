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

## Connected regions and clearance

capabilities/planning/grid-analysis.ts consumes a validated2500-cell boolean eligibility mask. Eight-connected components have stable IDs equal to their smallest row-major index and sorted member indices. Region traversal is iterative, with each accepted tile visited once.

Clearance is Chebyshev distance to the nearest ineligible tile or outside-room cell. Blocked cells have0, free edge cells1; an open room's central cells have25. A square footprint with radius clearance-1 fits within eligible cells. This convention is explicit to avoid confusing clearance with footprint width. Regions/clearance describe the supplied mask; they do not yet claim that terrain-only passability equals buildability.

Fixtures cover open, divided, diagonal-only, obstructed and fully blocked masks. An independent direct-distance oracle checks every tile against three obstacles and the room boundary. Input is not mutated; wrong-sized, nonboolean and sparse masks are rejected.599tests/183files initially pass4.91s; quality319production/286testfiles zero Lizard violations. Final sparse-mask validation is included in the recorded final checks.

Terrain costs, exits, object/access/anchor constraints, fingerprint/freshness and native observation remain pending. No construction/action API is used. The prior149-check engine aggregate is unchanged; these pure modules are not yet runtime consumers.

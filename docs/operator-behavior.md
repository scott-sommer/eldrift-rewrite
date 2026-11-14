# Operator behavior findings

Evidence: source review at frozen baseline. These are porting requirements, not engine test results.

- utilV2.processBuildFlags (3007) parses type and optional RCL, queues entries in the flag position's room with source=flag and priority=-1000. The room-name text is parsed but positioning uses flag.pos.roomName. Preserve manual priority; validate mismatched room text explicitly instead of silently assuming it controls placement. Sixteen structure types include factory, nuker and power spawn; construction support does not prove operating automation exists.
- utilV2.processClaimFlags (3425) accepts exact first token CreateRoom, requires a home token, records Override/AutoExpand and target position, and removes the flag only after queueClaimIntent returns OK. Preserve successful-consumption semantics and test retry/idempotency. controller invokes it at tick modulo 50 = 15.
- spawner.evaluateRoom (1482) bypasses normal population evaluation in Upgrade rooms; controller (705) selects the specialist mode. Preserve the mode and dedicated spawning/supply policy, not only upgrader actions.
- spawner (1496) recognizes NewSpawn/CreateRoom plus Override for bootstrap; getMemory (2575) still assigns NewSpawn flags. Preserve compatibility until an explicit migration is documented.
- spawner (1509-1511) recognizes Steal, Transfer and Down controls. Their resource/combat behavior belongs to logistics and military policy respectively.
- Direct Outpost flag spawning (2204) and Reserve flag spawning (2238) are commented out. Active outposter demand instead uses reservation threat/core state; active reservers use getOrderedReservationTargets after the commented section. Preserve working reservation/outpost capabilities and console operations; classify direct flag compatibility separately, rather than claiming those blocks execute.
- utilV2.processMiningFlags (870) and controller cadence (1199) provide the active Mine processing path.
- mission.createMissionPlanFromFlags (679) parses stage number/type, position, formation/direction/fpos, target collections and Hunt room lists. Types include Rally, Form, Train, Tar, Claim, Portal, Hunt and Sign. The new parser must reject malformed/sparse stage input explicitly and retain valid stage semantics.
- spawner (2403) reads Lab/Boost flags for mineral-courier servicing. Lab markers are control inputs; reaction and boost execution remain separate industry capabilities.

Remaining review: combat safety flags, patrol/scout/sign controls, vassal ownership, squad rally and lab marker production; verify console aliases with destructive effects. Keep ED-10 open until this record covers those controls.

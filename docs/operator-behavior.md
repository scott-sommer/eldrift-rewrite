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

## Defense and specialist controls

- defend.checkSafeMode (55-68) is called before the early return in defend.run. Its condition requires closestHostile == null and closestHostile != undefined simultaneously, so the intended Safe trigger cannot fire. defenseManager.checkSafeMode has a viable comparison. Port the intended range-triggered safety policy and add a correction regression, preserving strict distance < configured range unless intentionally changed.
- controller.runVassals (1531) consumes Memory.roomCache[controllerRoom].vassals, clears expired invasion state, and inspects damaged economic units in visible rooms. The occupied transition requires both a predicate and its negation; fix with documented timing semantics and tests. An occupied entry currently breaks the entire loop, another isolation case to test. The older flag-memory implementation below line 1588 is unreachable.
- consoleCommands.processVassals (104) supplies the operator entrypoint. Flag syntax remains a compatibility adapter; durable state belongs to the remote/expansion policy.
- consoleCommands.processPatrol (144) selects named patrol flags. Preserve the operator-created route workflow and avoid prefix collisions in the typed parser.
- controller (1162) calls formation.run with Game.flags.formation. controller (1358) uses exact Dismantle1:<homeRoom>. squad.tnt (145) matches an exact squad-name rally flag and uses the squad name as power-bank ID in power mode (180).
- utilV2 (1076-1077) creates Lab1 and Lab2 reagent markers, followed by numbered output labs. Keep input/output lab geometry separate from marker parsing and resource allocation.
- consoleCommands.clearRoomData (591) defaults unclaim=true, attempts owned-controller unclaim, then removes flags and queued/cached state. Game.unclaimRoom aliases this function. Preserve an explicit destructive operator operation; never call it during ordinary additive replanning or test setup against live rooms.

These findings refine the static baseline. Actual scenario validation belongs to ED-13/ED-14 and the feature tickets. The initial source map does not imply every legacy branch has been tested.

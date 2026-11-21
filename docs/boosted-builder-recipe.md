# Configurable boosted builder recipe (ED-36)

Legacy spawner.js824–833 at baseline f2bbf7e8 selects20WORK/20CARRY/10MOVE when configured labs list XZHO2/XLH2O/XKH2O. The portable builderBody(budget,true) recipe already existed in the rewrite, but ordinary worker recruitment never selected it. This checkpoint wires that capability through the ordinary worker population owner and existing birth-boost contract pipeline.

Set workerBuilderRecipe:'boosted', workerBoostPolicy:'required' and workerBodyBudget at least3500. The recipe costs3500energy, has50parts and a150tick spawn duration. Default workerBuilderRecipe:'standard' preserves current standard builder behavior. Config resolution refuses the optimized recipe with off/optional boost policy or an unknown recipe. Budget below3500 produces no large-builder demand; it does not silently fall back to an unboosted body.

The boosted recipe requires exact strongest-tier MOVE/CARRY/BUILD effects:10MOVE XZHO2,20CARRY XKH2O and20WORK XLH2O. Whole-kit funding requires300/600/600compound and1000boostenergy (200/400/400for the effects) at the existing game prices. Lower tiers cannot fund this optimized recipe. Existing compound-role restrictions, stock floors, lab-local energy isolation, outstanding-birth promises and per-recruitment-pass budget ownership remain in force. Standard builders retain the existing strongest-available tier fallback. Fortifier/upgrader body selection is unchanged.

Selection remains lazy inside missing-birth admission; a full kit can fund only one new queued identity. A missing selector or unavailable kit cannot enqueue the optimized body unboosted, and an explicitly optional returned contract refuses. The actual chosen50part body supplies replacement/spawn timing. Existing pending requests keep their identities and original contracts rather than being rewritten when policy changes. After actual spawning, the existing birth metadata/adoption, body action fence, boost movement, next-tick part confirmation and acknowledgement rules still own readiness. Funding/queue acceptance does not mean the creep is boosted.

This deliberately corrects the legacy recipe's reliance on configured compound names: the new path respects the room energy budget and requires a fully funded top-tier contract before admission. Recipe selection is explicit configuration rather than an implicit body change whenever lab configuration changes. Full automatic body optimization across tiers, specialist/mission producers and other role recipes remain incomplete.

## Qualification and next work

Unit/coordinator tests cover exact body/effect counts, whole-kit debit, resource-role restrictions, local kit energy, lower-tier refusal, insufficient energy, absent/optional contract refusal, lazy queue/reset identity and configuration constraints. Type/lint/boundary/Lizard/bundle and full unit results are recorded with the checkpoint in Jira. Existing worker-boost cases qualify regressions; they do not establish native execution of this50part builder.

Next native qualification must provide enough owned active spawn/extension energy for3500, three compatible stocked labs and one complete kit, request two optimized builders, and verify only one actual50part birth. Preserve a reset during incubation and during each admitted boost. Observe actual10XZHO2MOVE/20XKH2OCARRY/20XLH2OWORK before allowing ordinary builder work, then validate real construction/repair progress, stock conservation and cleanup. Add shortage/lower-tier refusal and explicit standard-policy behavior. No native optimized-builder qualification is claimed yet.

## Rollback

No memory schema changes. The new workerBuilderRecipe key must be removed from every persisted layer before loading older validators. Keep current code to settle or deliberately cancel queued/incubating boost-contracted births and adopted jobs under existing acknowledgement/claim/journal rules. Preserve actual50part actors and their admitted work; no body can be resized by configuration rollback. Older spawning schema3/birth metadata/boost-role and industry rollback obligations still apply. Cross-version rehearsal remains required.

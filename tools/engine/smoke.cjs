const boostedBuilderMode = ['shortage','lower'].find(mode => process.argv.includes('--boosted-builder-'+mode)) ?? (process.argv.includes('--boosted-builder') ? 'normal' : undefined);
const { boostedBuilderWorld,verifyBoostedBuilder } = require('./boosted-builder.cjs');
const { changeEmpireOwnership } = require('./lab-empire-loss.cjs');
const labEmpireMode = ['policy','participant','loss','vision','intel'].find(mode => process.argv.includes('--lab-empire-'+mode)) ?? (process.argv.includes('--lab-empire') ? 'normal' : undefined);
const labEmpire = !!labEmpireMode;
const { labEmpireWorld,verifyLabEmpire } = require('./lab-empire.cjs');
const boostBulkMode = process.argv.includes('--boost-bulk-refused') ? 'refused' : process.argv.includes('--boost-bulk') ? 'normal' : undefined;
const { boostBulkWorld,verifyBoostBulk } = require('./boost-bulk.cjs');
const boostRoleMode = ['automatic','refused','switch','remove'].find(mode => process.argv.includes('--boost-role-'+mode)) ?? (process.argv.includes('--boost-role') ? 'normal' : undefined);
const { boostRoleWorld,verifyBoostRoles } = require('./boost-roles.cjs');
const workerBoostMode = process.argv.includes('--worker-boost-shortage') ? 'shortage' : process.argv.includes('--worker-boost-optional') ? 'optional' : process.argv.includes('--worker-boost') ? 'normal' : undefined;
const { workerBoostWorld,verifyWorkerBoosts } = require('./worker-boosts.cjs');
const boostMode = ['operator','birth','alias','supply','multi','cancel','expiry','destroy','contention','coexist'].find(mode => process.argv.includes('--boost-'+mode)) ?? (process.argv.includes('--boost') ? 'normal' : undefined);
const { boostWorld,createBoostChanges,verifyBoosts } = require('./boosts.cjs');
const changeBoosts = createBoostChanges();
const labChainMode = process.argv.includes('--lab-chain-prestock') ? 'prestock' : process.argv.includes('--lab-chain-reserves') ? 'reserves' : process.argv.includes('--lab-chain-priority') ? 'priority' : process.argv.includes('--lab-chain-depleted') ? 'depleted' : process.argv.includes('--lab-chain') ? 'normal' : undefined;
const { labChainWorld,verifyLabChain } = require('./lab-chain.cjs');
const labSupplyMode = process.argv.includes('--lab-replan') ? 'replan' : process.argv.includes('--lab-operator') ? 'operator' : process.argv.includes('--lab-supply-depleted') ? 'depleted' : process.argv.includes('--lab-supply-switch') ? 'switch' : process.argv.includes('--lab-supply-cancel') ? 'cancel' : process.argv.includes('--lab-supply') ? 'normal' : undefined;
const { labSupplyWorld,verifyLabSupply } = require('./lab-supply.cjs');
const labReactionMode = process.argv.includes('--lab-reactions-invalid') ? 'invalid' : process.argv.includes('--lab-reactions-destroy') ? 'destroy' : process.argv.includes('--lab-reactions') ? 'normal' : undefined;
const { labReactionsWorld,changeLabReactions,verifyLabReactions } = require('./lab-reactions.cjs');
const startupMode = ['staged','refusal','admission','selected','selection-expiry'].find(mode => process.argv.includes('--remote-startup-'+mode));
const { remoteStartupWorld,createStartupChanges,verifyRemoteStartup } = require('./remote-startup.cjs');
const startupChanges = createStartupChanges(startupMode);
const reachabilityMode = ['blocked','arrival','withdraw'].find(mode => process.argv.includes('--remote-reachability-'+mode));
const { remoteReachabilityWorld,changeRemoteReachability,verifyRemoteReachability } = require('./remote-reachability.cjs');
const remoteCapacityMode = ['idle','starved','busy','off'].find(mode => process.argv.includes('--remote-capacity-'+mode));
const { remoteCapacityWorld,changeRemoteCapacity,verifyRemoteCapacity } = require('./remote-capacity.cjs');
const reservationVision = process.argv.includes('--reservation-vision');
const { reservationVisionWorld,changeReservationVision,verifyReservationVision } = require('./reservation-vision.cjs');
const remotePipeline = process.argv.includes('--remote-pipeline');
const { remotePipelineWorld,changeRemotePipeline,verifyRemotePipeline } = require('./remote-pipeline.cjs');
const reservationPopulationCancellation = process.argv.includes('--reservation-population-cancel');
const reservationPopulationAdmission = process.argv.includes('--reservation-population-admission');
const reservationPopulation = reservationPopulationCancellation || reservationPopulationAdmission || process.argv.includes('--reservation-population');
const { reservationPopulationWorld,changeReservationPopulation,verifyReservationPopulation,verifyReservationPopulationAdmission,verifyReservationPopulationCancellation } = require('./reservation-population.cjs');
const reservationSelection = process.argv.includes('--reservation-selection');
const { reservationSelectionWorld,changeReservationSelection,verifyReservationSelection } = require('./reservation-selection.cjs');
const roomReservation = process.argv.includes('--room-reservation');
const { roomReservationWorld,changeRoomReservation,verifyRoomReservation } = require('./room-reservation.cjs');
const reservationQuote = process.argv.includes('--reservation-quote');
const { reservationQuoteWorld,changeReservationQuote,verifyReservationQuote } = require('./reservation-quote.cjs');
const remoteRoadAdmission = process.argv.includes('--remote-road-admission');
const remoteRoadAuto = remoteRoadAdmission || process.argv.includes('--remote-road-auto');
const { remoteRoadAutoWorld,changeRemoteRoadAuto,verifyRemoteRoadAuto,verifyRemoteRoadAdmission } = require('./remote-road-auto.cjs');
const remoteRoadWork = process.argv.includes('--remote-road-work');
const { remoteRoadWorkWorld,changeRemoteRoadWork,verifyRemoteRoadWork } = require('./remote-road-work.cjs');
const remoteReturn = process.argv.includes('--remote-return');
const { remoteReturnWorld,changeRemoteReturn,verifyRemoteReturn } = require('./remote-return.cjs');
const remoteFleetMode = process.argv.includes('--remote-fleet-migration') ? 'migration' : process.argv.includes('--remote-fleet-border') ? 'border' : process.argv.includes('--remote-fleet-lifetime') ? 'lifetime' : process.argv.includes('--remote-fleet-bootstrap') ? 'bootstrap' : process.argv.includes('--remote-fleet-budget') ? 'budget' : process.argv.includes('--remote-fleet-damage') ? 'damage' : process.argv.includes('--remote-fleet-cancel') ? 'cancel' : process.argv.includes('--remote-fleet-replacement') ? 'replacement' : process.argv.includes('--remote-fleet') ? 'normal' : undefined;
const { remoteFleetWorld,createRemoteFleetChanges,verifyRemoteFleet } = require('./remote-fleet.cjs');
const remoteFleetChanges = createRemoteFleetChanges(remoteFleetMode);
const remoteRuntime = process.argv.includes('--remote-runtime');
const { remoteRuntimeWorld,changeRemoteRuntime,verifyRemoteRuntime } = require('./remote-runtime.cjs');
const remoteManagement = process.argv.includes('--remote-management');
const { remoteManagementWorld,changeRemoteManagement,verifyRemoteManagement } = require('./remote-management.cjs');
const remoteInfrastructure = process.argv.includes('--remote-infrastructure');
const { remoteInfrastructureWorld,changeRemoteInfrastructure,verifyRemoteInfrastructure } = require('./remote-infrastructure.cjs');
const remoteTransportMode = process.argv.includes('--remote-transport-drops') ? 'drops' : process.argv.includes('--remote-transport-contention') ? 'contention' : process.argv.includes('--remote-transport-threat') ? 'threat' : process.argv.includes('--remote-transport') ? 'normal' : undefined;
const { remoteTransportWorld,createRemoteTransportChanges,verifyRemoteTransport } = require('./remote-transport.cjs');
const remoteTransportChanges = createRemoteTransportChanges(remoteTransportMode);
const remoteBankingMode = process.argv.includes('--remote-banking-gap') ? 'gap' : process.argv.includes('--remote-banking-sink-loss') ? 'sink-loss' : process.argv.includes('--remote-banking-full') ? 'full' : process.argv.includes('--remote-banking') ? 'normal' : undefined;
const { remoteBankingWorld,createRemoteBankingChanges,verifyRemoteBanking } = require('./remote-banking.cjs');
const remoteBankingChanges = createRemoteBankingChanges(remoteBankingMode);
const remoteMining = process.argv.includes('--remote-mining');
const { remoteMiningWorld,changeRemoteMining,verifyRemoteMining } = require('./remote-mining.cjs');
const remoteReservation = process.argv.includes('--remote-reservation');
const { remoteReservationWorld,changeRemoteReservation,verifyRemoteReservation } = require('./remote-reservation.cjs');
const remoteAssessment = process.argv.includes('--remote-assessment');
const { remoteAssessmentWorld, changeRemoteAssessment, verifyRemoteAssessment } = require('./remote-assessment.cjs');
const scoutFallback = process.argv.includes('--scout-fallback');
const { scoutFallbackWorld, reloadScoutFallback, verifyScoutFallback } = require('./scout-fallback.cjs');
const observerRuntime = process.argv.includes('--observer-runtime');
const { observerRuntimeWorld, changeObserverRuntime, verifyObserverRuntime } = require('./observer-runtime.cjs');
const constructionRetry = process.argv.includes('--construction-retry');
const { verifyConstructionRetry } = require('./construction-retry.cjs');
const constructionRemote = process.argv.includes('--construction-remote');
const { constructionRemoteWorld, verifyConstructionRemote } = require('./construction-remote.cjs');
const constructionBudget = process.argv.includes('--construction-budget');
const constructionLifecycle = process.argv.includes('--construction-lifecycle');
const { changeConstructionLifecycle, verifyConstructionLifecycle } = require('./construction-lifecycle.cjs');
const constructionRuntime = constructionBudget || constructionLifecycle || process.argv.includes('--construction-runtime');
const constructionRun = constructionRetry || constructionRuntime || process.argv.includes('--construction');
const defenseCutReload = process.argv.includes('--defense-cut-reload');
const defenseCut = defenseCutReload || process.argv.includes('--defense-cut');
const stampLateReset = process.argv.includes('--stamp-late-reset');
const { createStampLateReload, verifyStampLateReload } = require('./stamp-late-reload.cjs');
const reloadLateStamp = createStampLateReload();
const stampBudget = stampLateReset || process.argv.includes('--stamp-budget');
const { verifyStampBudget, captureStampBudget } = require('./stamp-budget.cjs');
const stampFailure = process.argv.includes('--stamp-failure');
const { verifyStampFailure } = require('./stamp-failure.cjs');
const irregularStampRoom = process.argv.includes('--irregular-stamp-room');
const autoStampRoom = process.argv.includes('--auto-stamp-room');
const stampRoom = stampBudget || stampFailure || irregularStampRoom || autoStampRoom || process.argv.includes('--stamp-room');
const { verifyStampRoom } = require('./stamp-room.cjs');
const stampDraft = process.argv.includes('--stamp-draft');
const { verifyStampDraft, reloadStampDraft } = require('./stamp-draft.cjs');
const planningRoom = process.argv.includes('--planning-room');
const { planningRoomWorld, reloadPlanningRoom, verifyPlanningRoom } = require('./planning-room.cjs');
const planningBudget = process.argv.includes('--planning-budget');
const { verifyPlanningBudget } = require('./planning-budget.cjs');
const planningRuntime = process.argv.includes('--planning-runtime');
const { verifyPlanningRuntime } = require('./planning-runtime.cjs');
const planningCpu = process.argv.includes('--planning-cpu');
const { capturePlanningCpu, verifyPlanningCpu } = require('./planning-cpu.cjs');
const planningJob = planningCpu || process.argv.includes('--planning-job');
const { reloadPlanningJob, verifyPlanningJob } = require('./planning-job.cjs');
const constrainedDraftResume = process.argv.includes('--constrained-draft-resume');
const { reloadConstrainedDraft, verifyConstrainedDraftResume } = require('./constrained-draft-resume.cjs');
const standardDraftResume = process.argv.includes('--standard-draft-resume');
const { reloadStandardDraft, verifyStandardDraftResume } = require('./standard-draft-resume.cjs');
const planningCommit = process.argv.includes('--planning-commit');
const { reloadCommittedPlan, verifyPlanningCommit } = require('./planning-commit.cjs');
const planningRouteReload = process.argv.includes('--planning-route-reload');
const planningRouteResume = planningRouteReload || process.argv.includes('--planning-route-resume');
const { verifyPlanningRouteResume, reloadPlanningRoutes } = require('./planning-route-resume.cjs');
const layoutPlacement = process.argv.includes('--layout-placement');
const { verifyLayoutPlacement } = require('./layout-placement.cjs');
const roomAssessment = process.argv.includes('--room-assessment');
const { verifyRoomAssessment, changeAssessmentSites } = require('./room-assessment.cjs');
const { artRegionWorld, verifyArtRegion } = require('./art-region.cjs');
const artBuilder = process.argv.includes('--art-builder');
const artRegion = artBuilder || process.argv.includes('--art-region');
const { fortifierWorkWorld, verifyFortifierWork, legacyFortifierWorld, verifyLegacyFortifier } = require('./fortifier-work.cjs');
const legacyFortifier = process.argv.includes('--legacy-fortifier');
const fortifierWork = process.argv.includes('--fortifier-work') || legacyFortifier;
const { workerMinerTravelWorld, verifyWorkerMinerTravel } = require('./worker-miner-travel.cjs');
const workerMinerTravel = process.argv.includes('--worker-miner-travel');
const { workerMinerWorld, workerMinerAutomaticWorld, verifyWorkerMiner, replaceWorkerDeposit, verifyWorkerMinerReplacement } = require('./worker-miner.cjs');
const workerMinerReplacement = process.argv.includes('--worker-miner-replacement');
const workerMinerAutomatic = process.argv.includes('--worker-miner-automatic');
const workerMiner = process.argv.includes('--worker-miner') || workerMinerReplacement || workerMinerAutomatic;
const { workDependenciesWorld, verifyWorkDependencies } = require('./work-dependencies.cjs');
const workDependencies = process.argv.includes('--work-dependencies');
const { bootstrapAssignmentWorld, depleteAssignedSource, verifyBootstrapAssignment } = require('./bootstrap-assignment.cjs');
const bootstrapAssignment = process.argv.includes('--bootstrap-assignment');
const { bootstrapSalvageWorld, verifyBootstrapSalvage } = require('./bootstrap-salvage.cjs');
const bootstrapSalvage = process.argv.includes('--bootstrap-salvage') ? 'enabled'
  : process.argv.includes('--bootstrap-salvage-disabled') ? 'disabled'
  : process.argv.includes('--bootstrap-salvage-depleted') ? 'depleted' : undefined;
const { colonyResilienceWorld, disruptColony, verifyColonyResilience } = require('./colony-resilience.cjs');
const colonyResilience = process.argv.includes('--colony-resilience');
const { upgradeRebuildWorld, changeUpgradeRebuild, verifyUpgradeRebuild } = require('./upgrade-rebuild.cjs');
const upgradeRebuild = process.argv.includes('--upgrade-rebuild');
const { masterBootstrapWorld, verifyMasterBootstrap } = require('./upgrade-master-bootstrap.cjs');
const masterBootstrap = process.argv.includes('--master-bootstrap');
const { supplyReplacementWorld, ageSupplyCourier, verifySupplyReplacement } = require('./supply-replacement.cjs');
const supplyReplacement = process.argv.includes('--supply-replacement');
const { sponsorLossWorld, loseSupplySponsor, verifySponsorLoss } = require('./supply-sponsor-loss.cjs');
const sponsorLoss = process.argv.includes('--supply-sponsor-loss');
const { supplyEndpointWorld, changeSupplyEndpoint, verifySupplyEndpoint } = require('./upgrade-supply-endpoints.cjs');
const supplyEndpoint = process.argv.includes('--supply-terminal') ? 'terminal'
  : process.argv.includes('--supply-terminal-full') ? 'full' : process.argv.includes('--supply-target-loss') ? 'loss' : undefined;
const { supplyFleetWorld, changeSupplyFleet, verifySupplyFleet } = require('./upgrade-supply-fleet.cjs');
const supplyFleetLoss = process.argv.includes('--supply-fleet-loss');
const supplyFleet = process.argv.includes('--supply-fleet') || supplyFleetLoss;
const { supplyCycleWorld, verifySupplyCycle } = require('./upgrade-supply-cycle.cjs');
const supplyMaster = process.argv.includes('--supply-master') || !!supplyEndpoint;
const supplyCargoHold = process.argv.includes('--supply-cargo-hold');
const supplyCargo = process.argv.includes('--supply-cargo') || supplyCargoHold;
const supplyCycle = process.argv.includes('--supply-cycle') || supplyMaster || supplyCargo;
const { groundDeliveryWorld, reloadGroundDelivery, verifyGroundDelivery } = require('./ground-delivery.cjs');
const groundRecovery = process.argv.includes('--ground-recovery');
const groundDelivery = process.argv.includes('--ground-delivery') || groundRecovery;
const { upgradeMasterWorld, ageUpgradeMaster, verifyUpgradeMaster } = require('./upgrade-master.cjs');
const { changeMasterLayout, verifyMasterLayoutLoss, removeMasterStorage, verifyMasterStorageLoss } = require('./master-layout-loss.cjs');
const masterLoadedLoss = process.argv.includes('--master-loaded-loss');
const masterStorageLoss = masterLoadedLoss || process.argv.includes('--master-storage-loss');
const masterLayoutLoss = process.argv.includes('--master-layout-loss');
const masterContention = process.argv.includes('--upgrade-master-contention');
const upgradeMaster = process.argv.includes('--upgrade-master') || masterContention || masterLayoutLoss || masterStorageLoss;
const { upgradeFleetWorld, verifyUpgradeFleet, changeUpgradeFleet } = require('./upgrade-fleet.cjs');
const upgradeFleetLoss = process.argv.includes('--upgrade-fleet-loss');
const upgradeFleet = process.argv.includes('--upgrade-fleet') || upgradeFleetLoss;
const { upgradeRoomWorld, verifyUpgradeRoom, reloadUpgradeRoom } = require('./upgrade-room.cjs');
const upgradeRoom = process.argv.includes('--upgrade-room') || process.argv.includes('--upgrade-room-shortage');
const { structureActionsWorld, verifyStructureActions } = require('./structure-actions.cjs');
const structureActions = process.argv.includes('--structure-actions');
const { upgradeServiceWorld, verifyUpgradeService } = require('./upgrade-service.cjs');
const upgradeService = process.argv.includes('--upgrade-service');
const { workerCargoWorld, verifyWorkerCargo } = require('./worker-cargo.cjs');
const workerCargoMode = process.argv.includes('--worker-cargo') ? 'store' : process.argv.includes('--worker-cargo-drop') ? 'drop' : process.argv.includes('--worker-cargo-hold') ? 'hold' : undefined;
const { recoveryBankingWorld, verifyRecoveryBanking } = require('./recovery-banking.cjs');
const recoveryBanking = process.argv.includes('--recovery-banking');
const { distributorRecoveryWorld, changeDistributorEnergy, verifyDistributorRecovery } = require('./distributor-recovery.cjs');
const distributorRecovery = process.argv.includes('--distributor-recovery');
const { upgradeLossWorld, changeUpgradeLoss, verifyUpgradeLoss } = require('./upgrade-loss.cjs');
const upgradeLoss = process.argv.includes('--upgrade-loss');
const { upgradeCycleWorld, reloadUpgradeCycle, verifyUpgradeCycle } = require('./upgrade-cycle.cjs');
const { upgradeBootstrapWorld, verifyUpgradeBootstrap, drainBootstrapStorage } = require('./upgrade-bootstrap.cjs');
const bootstrapHarvest = process.argv.includes('--bootstrap-harvest');
const upgradeBootstrap = process.argv.includes('--upgrade-bootstrap') || bootstrapHarvest;
const upgradeCycle = process.argv.includes('--upgrade-cycle');
const { upgradeClaimWorld, releaseUpgradeGcl, verifyUpgradeClaim } = require('./upgrade-claim.cjs');
const upgradeClaim = process.argv.includes('--upgrade-claim');
const { automaticSupportWorld, verifyAutomaticSupport } = require('./automatic-support.cjs');
const automaticSupport = process.argv.includes('--automatic-support');
const { supportTransportWorld, loseSupportTarget, drainSupportDonor, verifySupportTransport } = require('./support-transport.cjs');
const upgradeSupplyTransport = process.argv.includes('--upgrade-supply-transport');
const supportTransport = upgradeSupplyTransport || process.argv.includes('--support-transport') || process.argv.includes('--support-loss') || process.argv.includes('--support-reserve-change');
const { recoveryScavengerSpawnWorld, verifyRecoveryScavengerSpawn } = require('./recovery-scavenger-spawn.cjs');
const { recoveryScavengingWorld, verifyRecoveryScavenging } = require('./recovery-scavenging.cjs');
const { recoveryEconomyWorld, verifyRecoveryEconomy } = require('./recovery-economy.cjs');
const { energyRecoveryWorld, changeRecoveryEnergy, verifyEnergyRecovery } = require('./energy-recovery.cjs');
const { mixedWorkersWorld, verifyMixedWorkers } = require('./mixed-workers.cjs');
const { workerPopulationWorld, loseWorker, verifyWorkerPopulation } = require('./worker-population.cjs');
const { workerProfileWorld, verifyWorkerProfile } = require('./worker-profile.cjs');
const workerProfile = ['builder', 'fortifier', 'upgrader', 'upgrader-v2', 'hold', 'flag-hold'].find(profile => process.argv.includes('--worker-profile-' + profile));
const { workerPickupWorld, verifyWorkerPickup } = require('./worker-pickup.cjs');
const { workerCollectionWorld, verifyWorkerCollection } = require('./worker-collection.cjs');
const { verifyWorkerRuntime } = require('./worker-runtime.cjs');
const scoutBlocked = process.argv.includes('--scout-blocked');
const scoutExplore = process.argv.includes('--scout-explore');
const scoutDefault = process.argv.includes('--scout-default');
const scoutAutomatic = scoutExplore || process.argv.includes('--scout-spawn');
const scoutRuntime = scoutBlocked || scoutDefault || scoutAutomatic || process.argv.includes('--scout-control');
const { scoutRuntimeWorld, changeScoutRuntime, verifyScoutRuntime } = require('./scout-runtime.cjs');
const scoutLifecycle = process.argv.includes('--scout-lifecycle');
const { scoutLifecycleWorld, changeScoutLifecycle, verifyScoutLifecycle } = require('./scout-lifecycle.cjs');
const intelCapture = process.argv.includes('--intel-capture');
const { intelCaptureWorld, verifyIntelCapture } = require('./intel-capture.cjs');
const intelObservation = process.argv.includes('--intel-observation');
const { intelObservationWorld, changeIntelVision, verifyIntelObservation } = require('./intel-observation.cjs');
const masterHandoff = process.argv.includes('--master-handoff');
const { masterHandoffWorld, consumeMasterSpawnEnergy, verifyMasterHandoff } = require('./master-handoff.cjs');
const workerPositionWide = process.argv.includes('--worker-position-wide');
const workerPosition = workerPositionWide || process.argv.includes('--worker-position');
const { workerPositionWorld, verifyWorkerPosition } = require('./worker-position.cjs');
const { workSelectionWorld, verifyWorkSelection } = require('./work-selection.cjs');
const { miningStorageWorld, verifyMiningStorage } = require('./mining-storage.cjs');
const { mineralRoutesWorld, verifyMineralFleet } = require('./mineral-routes.cjs');
const { workSupplyWorld, verifyWorkSupply } = require('./work-supply.cjs');
const { reclamationWorld, verifyReclamation } = require('./reclamation.cjs');
const { bankingDemandWorld, createBankingDemand, verifyBankingDemand } = require('./banking-demand.cjs');
const { storeBalanceWorld, verifyStoreBalance, restoreBalanceEnergy } = require('./store-balance.cjs');
const storeBalanceMode = ['fill', 'drain', 'mineral', 'guard'].find(mode => process.argv.includes('--store-' + mode));
const { energyBankingWorld, verifyEnergyBanking } = require('./energy-banking.cjs');
const { storageLossWorld, removeStorage, verifyStorageLoss } = require('./storage-loss.cjs');
const { cargoDeathWorld, verifyCargoDeath } = require('./cargo-death.cjs');
const { reloadMineralTransport, verifyMineralReload } = require('./mineral-reload.cjs');
const { courierDeathWorld, verifyCourierDeath } = require('./courier-death.cjs');
const { mineralRecoveryWorld, verifyMineralRecovery } = require('./mineral-recovery.cjs');
const { mineralTransportWorld, verifyMineralTransport } = require('./mineral-transport.cjs');
const { linkReversalWorld, verifyLinkReversal } = require('./link-reversal.cjs');
const { linkServiceWorld, verifyLinkService } = require('./link-service.cjs');
const { linkContentionWorld, verifyLinkContention } = require('./link-contention.cjs');
const { controllerLinksWorld, verifyControllerLinks } = require('./controller-links.cjs');
const { linkSupplyWorld, verifyLinkSupply } = require('./link-supply.cjs');
const { towerSupplyWorld, verifyTowerSupply } = require('./tower-supply.cjs');
const { finalDeliveryWorld, verifyFinalDelivery } = require('./final-delivery.cjs');
const { verifyExpiryDelivery } = require('./expiry-delivery.cjs');
const { fillHaulingSink, verifyFullSink } = require('./full-sink.cjs');
const { preservationDecayWorld, verifyPreservationDecay } = require('./preservation-decay.cjs');
const { preservationWorld, verifyPreservation } = require('./preservation.cjs');
const { largeDropWorld, verifyLargeDrop } = require('./large-drop.cjs');
const { dropSupplyWorld, verifyDropSupply } = require('./drop-supply.cjs');
const { replaceEnergySource, verifySourceLoss } = require('./source-loss.cjs');
const { remainsSupplyWorld, verifyRemainsSupply } = require('./remains-supply.cjs');
const { pickupAdmissionWorld, verifyPickupAdmission } = require('./pickup-admission.cjs');
const { removeHaulingSink, verifyMissingSink } = require('./missing-sink.cjs');
const { cargoRecoveryWorld, verifyCargoRecovery, verifyUnknownDelivery } = require('./cargo-recovery.cjs');
const { emptySourceWorld, drainSource, verifyEmptySource } = require('./empty-source.cjs');
const { colonyEconomyWorld, verifyColonyEconomy, reloadColonyEconomy } = require('./colony-economy.cjs');
const { courierRoutesWorld, improveCourierRoad, verifyCourierRoutes } = require('./courier-routes.cjs');
const { courierBootstrapWorld, verifyCourierBootstrap } = require('./courier-bootstrap.cjs');
const { energyLogisticsWorld, verifyEnergyLogistics } = require('./energy-logistics.cjs');
const { fixedHaulingWorld,verifyFixedHauling } = require('./fixed-hauling.cjs');
const { haulingCycleWorld, drainHaulingSink, verifyHaulingCycle } = require('./hauling-cycle.cjs');
const { transferConfirmationWorld, verifyTransferConfirmation } = require('./transfer-confirmation.cjs');
const { extractorFaultWorld, changeExtractor, verifyExtractorFault } = require('./extractor-fault.cjs');
const { miningSaturationWorld, reloadMiningSaturation, verifyMiningSaturation } = require('./mining-saturation.cjs');
const { miningReplacementWorld, verifyMiningReplacement } = require('./mining-replacement.cjs');
const { miningWorkWorld, verifyMiningWork } = require('./mining-work.cjs');
const { colonyMiningWorld, verifyColonyMining, colonyMineralWorld } = require('./colony-mining.cjs');
const { specialistMiningWorld, verifySpecialistMining } = require('./specialist-mining.cjs');
const { miningWorld, verifyMining, interruptedMiningWorld, verifyInterruptedMining } = require('./mining.cjs');
const { contentionWorld, verifyContention } = require('./spawn-contention.cjs');
const { unseenWorld, verifyUnseen, occupiedExitWorld, verifyOccupiedExit } = require('./unseen.cjs');
const { exitsWorld, verifyExits, verifyNavigation } = require('./exits.cjs');
const { trafficWorld, verifyTraffic } = require('./traffic.cjs');
const { recoveryWorld, verifyRecovery, loadedRecoveryWorld, verifyServiceRecovery } = require('./recovery.cjs');
const { movementWorld, verifyMovement } = require('./movement.cjs');
const { resourceWorld, verifyResources } = require('./resources.cjs');
const { workWorld, verifyWork } = require('./work.cjs');
const { actionBundle, actionWorld, verifyActions, verifyTasks } = require('./actions.cjs');
const { prepareReload, verifyReload } = require('./reload.cjs');
const { provenance, sampleTick } = require('./report.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ScreepsServer, TerrainMatrix } = require('screeps-server-mockup');
const root = path.resolve(__dirname, '../..');
fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
const directory = fs.mkdtempSync(path.join(root, 'artifacts/engine-'));
const server = new ScreepsServer({ path: directory, logdir: path.join(directory, 'logs'), port: 32147 });
const evidence = { status: 'running', directory, messages: [], errors: [], samples: [] };
if (startupMode) evidence.startupDiagnosticRows = startupChanges.rows;
let stopped = false;
function finish(code, error) {
  if (stopped) return;
  stopped = true;
  evidence.childPids = Object.values(server.processes).map(child => child.pid);
  evidence.status = code === 0 ? 'passed' : 'failed';
  if (error) evidence.failure = String(error.stack ?? error);
  try {
    fs.writeFileSync(path.join(directory, 'evidence.json'), JSON.stringify(evidence, null, 2));
  } finally {
    server.stop();
  }
  console.log('ENGINE_EVIDENCE ' + path.join(directory, 'evidence.json'));
  process.exit(code);
}
const timeout = setTimeout(() => { console.error('Engine smoke exceeded scenario time limit', directory); finish(1, new Error('Engine smoke timeout')); }, process.argv.includes('--inject-timeout') ? 1500 : startupMode ? (startupMode === 'staged' ? 1500000 : 120000) : reachabilityMode ? 420000 : remoteCapacityMode ? 120000 : reservationVision ? 120000 : remotePipeline ? 180000 : reservationPopulation ? 150000 : remoteFleetMode === 'lifetime' ? 300000 : remoteFleetMode === 'bootstrap' ? 180000 : stampBudget ? 90000 : 60000);
server.on('error', error => { console.error(error); finish(1, error); });
(async () => {
  await server.world.reset();
  await server.world.stubWorld();
  const modules = { main: fs.readFileSync(path.join(root, 'dist/main.js'), 'utf8') };
  if (process.argv.includes('--actions')) modules.main = await actionBundle(root);
  if (process.argv.includes('--inject-error')) modules.main += '\nconst original = module.exports.loop; module.exports = { loop: () => { original(); throw new Error("ENGINE_SENTINEL"); } };';
  if (process.argv.includes('--tasks')) modules.main = await actionBundle(root, 'task-bot');
  if (structureActions) modules.main = await actionBundle(root, 'structure-actions-bot');
  if (upgradeMaster) modules.main = await actionBundle(root, 'upgrade-master-bot');
  if (upgradeFleet) modules.main = await actionBundle(root, 'upgrade-fleet-bot');
  if (upgradeRoom) modules.main = await actionBundle(root, 'upgrade-room-bot');
  if (upgradeService) modules.main = await actionBundle(root, 'upgrade-service-bot');
  if (workerCargoMode) modules.main = await actionBundle(root, 'worker-cargo-bot');
  if (upgradeClaim) modules.main = await actionBundle(root, 'upgrade-claim-bot');
  if (colonyResilience) modules.main = await actionBundle(root, 'colony-resilience-bot');
  if (upgradeRebuild) modules.main = await actionBundle(root, 'upgrade-rebuild-bot');
  if (masterBootstrap) modules.main = await actionBundle(root, 'upgrade-master-bootstrap-bot');
  if (supplyReplacement) modules.main = await actionBundle(root, 'supply-replacement-bot');
  if (sponsorLoss) modules.main = await actionBundle(root, 'supply-sponsor-loss-bot');
  if (supplyFleet) modules.main = await actionBundle(root, 'upgrade-supply-fleet-bot');
  if (supplyCycle) modules.main = await actionBundle(root, 'upgrade-supply-cycle-bot');
  if (groundDelivery) modules.main = await actionBundle(root, 'ground-delivery-bot');
  if (groundRecovery) modules.main += '\nMemory.groundUnknown = true;';
  if (artRegion) modules.main = await actionBundle(root, 'art-region-bot');
  if (fortifierWork) modules.main = await actionBundle(root, 'fortifier-work-bot');
  if (workerMinerTravel) modules.main = await actionBundle(root, 'worker-miner-travel-bot');
  if (workerMiner) modules.main = await actionBundle(root, 'worker-miner-bot');
  if (workDependencies) modules.main = await actionBundle(root, 'work-dependencies-bot');
  if (bootstrapAssignment) modules.main = await actionBundle(root, 'bootstrap-assignment-bot');
  if (bootstrapSalvage) modules.main = await actionBundle(root, 'bootstrap-salvage-bot');
  if (upgradeBootstrap) modules.main = await actionBundle(root, 'upgrade-bootstrap-bot');
  if (upgradeCycle) modules.main = await actionBundle(root, 'upgrade-cycle-bot');
  if (upgradeLoss) modules.main = await actionBundle(root, 'upgrade-loss-bot');
  if (distributorRecovery) modules.main = await actionBundle(root, 'distributor-recovery-bot');
  if (recoveryBanking) modules.main = await actionBundle(root, 'recovery-banking-bot');
  if (automaticSupport) modules.main = await actionBundle(root, 'automatic-support-bot');
  if (supportTransport) modules.main = await actionBundle(root, upgradeSupplyTransport ? 'upgrade-supply-transport-bot' : 'support-transport-bot');
  if (process.argv.includes('--recovery-scavenger-spawn')) modules.main = await actionBundle(root, 'recovery-scavenger-spawn-bot');
  if (process.argv.includes('--recovery-scavenging')) modules.main = await actionBundle(root, 'recovery-scavenging-bot');
  if (process.argv.includes('--recovery-economy')) modules.main = await actionBundle(root, 'recovery-economy-bot');
  if (process.argv.includes('--energy-recovery')) modules.main = await actionBundle(root, 'energy-recovery-bot');
  if (process.argv.includes('--mixed-workers')) modules.main = await actionBundle(root, 'mixed-workers-bot');
  if (process.argv.includes('--worker-population')) modules.main = await actionBundle(root, 'worker-population-bot');
  if (workerProfile) modules.main = await actionBundle(root, 'worker-profile-bot');
  if (process.argv.includes('--worker-pickup')) modules.main = await actionBundle(root, 'worker-pickup-bot');
  if (process.argv.includes('--worker-collection')) modules.main = await actionBundle(root, 'worker-collection-bot');
  if (process.argv.includes('--worker-runtime')) modules.main = await actionBundle(root, 'worker-runtime-bot');
  if (constructionRemote) modules.main = await actionBundle(root, 'construction-remote-bot');
  if (constructionRun) modules.main = await actionBundle(root, constructionRetry ? 'construction-retry-bot' : constructionRuntime ? 'construction-runtime-bot' : 'construction-bot');
  if (constructionBudget) modules.main = 'globalThis.constructionDefaultBudget = true;\n' + modules.main;
  if (defenseCut) modules.main = await actionBundle(root, 'defense-cut-bot');
  if (stampRoom) modules.main = await actionBundle(root, stampBudget ? 'stamp-budget-bot' : stampFailure ? 'stamp-failure-bot' : autoStampRoom ? 'auto-stamp-room-bot' : 'stamp-room-bot');
  if (planningRoom) modules.main = await actionBundle(root, 'planning-room-bot');
  if (planningBudget) modules.main = await actionBundle(root, 'planning-budget-bot');
  if (planningRuntime) modules.main = await actionBundle(root, 'planning-runtime-bot');
  if (stampDraft) modules.main = await actionBundle(root, 'stamp-draft-bot');
  if (planningJob) modules.main = await actionBundle(root, 'planning-job-bot');
  if (planningCpu) modules.main = 'globalThis.planningCpuTest = true;\n' + modules.main;
  if (constrainedDraftResume) modules.main = await actionBundle(root, 'constrained-draft-resume-bot');
  if (standardDraftResume) modules.main = await actionBundle(root, 'standard-draft-resume-bot');
  if (planningCommit) modules.main = await actionBundle(root, 'planning-commit-bot');
  if (planningRouteResume) modules.main = await actionBundle(root, 'planning-route-resume-bot');
  if (layoutPlacement) modules.main = await actionBundle(root, 'layout-placement-bot');
  if (roomAssessment) modules.main = await actionBundle(root, 'room-assessment-bot');
  if (process.argv.includes('--work-selection')) modules.main = await actionBundle(root, 'work-selection-bot');
  if (process.argv.includes('--work')) modules.main = await actionBundle(root, 'work-bot');
  if (workerPosition) modules.main = await actionBundle(root, 'worker-position-bot');
  if (masterHandoff) modules.main = await actionBundle(root, 'master-handoff-bot');
  if (scoutRuntime) modules.main = await actionBundle(root,'scout-runtime-bot')
    + (scoutAutomatic ? '\nglobal.scoutSpawnFixture = true;' : '')
    + (scoutBlocked ? '\nglobal.scoutBlockedFixture = true;' : '')
    + (scoutExplore ? '\nglobal.scoutExploreFixture = true; global.scoutDefaultFixture = true;' : scoutDefault ? '\nglobal.scoutDefaultFixture = true;' : '');
  if (startupMode) modules.main = await actionBundle(root,'remote-startup-'+startupMode+'-bot');
  if (reachabilityMode) modules.main = await actionBundle(root,'remote-reachability-'+reachabilityMode+'-bot');
  if (remoteCapacityMode) modules.main = await actionBundle(root,'remote-capacity-'+remoteCapacityMode+'-bot');
  if (reservationVision) modules.main = await actionBundle(root,'reservation-vision-bot');
  if (remotePipeline) modules.main = await actionBundle(root,'remote-pipeline-bot');
  if (reservationPopulation) modules.main = await actionBundle(root,reservationPopulationCancellation ? 'reservation-population-cancel-bot' : reservationPopulationAdmission ? 'reservation-population-admission-bot' : 'reservation-population-bot');
  if (reservationSelection) modules.main = await actionBundle(root,'reservation-selection-bot');
  if (roomReservation) modules.main = await actionBundle(root,'room-reservation-bot');
  if (reservationQuote) modules.main = await actionBundle(root,'reservation-quote-bot');
  if (remoteRoadAuto) modules.main = await actionBundle(root,remoteRoadAdmission ? 'remote-road-admission-bot' : 'remote-road-auto-bot');
  if (remoteRoadWork) modules.main = await actionBundle(root,'remote-road-work-bot');
  if (remoteReturn) modules.main = await actionBundle(root,'remote-return-bot');
  if (remoteFleetMode) modules.main = await actionBundle(root,remoteFleetMode === 'normal' ? 'remote-fleet-bot' : 'remote-fleet-'+remoteFleetMode+'-bot');
  if (remoteRuntime) modules.main = await actionBundle(root,'remote-runtime-bot');
  if (remoteManagement) modules.main = await actionBundle(root,'remote-management-bot');
  if (remoteInfrastructure) modules.main = await actionBundle(root,'remote-infrastructure-bot');
  if (remoteTransportMode) modules.main = await actionBundle(root,remoteTransportMode === 'contention' ? 'remote-transport-contention-bot' : 'remote-transport-bot');
  if (remoteBankingMode) modules.main = await actionBundle(root,remoteBankingMode === 'gap' ? 'remote-banking-gap-bot' : 'remote-banking-bot');
  if (remoteMining) modules.main = await actionBundle(root,'remote-mining-bot');
  if (remoteReservation) modules.main = await actionBundle(root,'remote-reservation-bot');
  if (remoteAssessment) modules.main = await actionBundle(root, 'remote-assessment-bot');
  if (scoutFallback) modules.main = await actionBundle(root, 'scout-fallback-bot');
  if (observerRuntime) modules.main = await actionBundle(root, 'observer-runtime-bot');
  if (scoutLifecycle) modules.main = await actionBundle(root, 'scout-lifecycle-bot');
  if (intelCapture) modules.main = await actionBundle(root, 'intel-capture-bot');
  if (intelObservation) modules.main = await actionBundle(root, 'intel-observation-bot');
  if (process.argv.includes('--resources')) modules.main = await actionBundle(root, 'resource-bot');
  if (process.argv.includes('--movement')) modules.main = await actionBundle(root, 'movement-bot');
  if (process.argv.includes('--maintenance')) modules.main = await actionBundle(root, 'maintenance-bot');
  if (process.argv.includes('--retirement')) modules.main = await actionBundle(root, 'retirement-bot');
  if (process.argv.includes('--paths')) modules.main = await actionBundle(root, 'path-bot');
  if (process.argv.includes('--recovery')) modules.main = await actionBundle(root, 'recovery-bot');
  if (process.argv.includes('--traffic')) modules.main = await actionBundle(root, 'traffic-bot');
  if (process.argv.includes('--exits')) modules.main = await actionBundle(root, 'exit-bot');
  if (process.argv.includes('--navigation')) modules.main = await actionBundle(root, 'navigation-bot');
  if (process.argv.includes('--service-recovery')) modules.main = await actionBundle(root, 'service-recovery-bot');
  if (process.argv.includes('--unseen')) modules.main = await actionBundle(root, 'unseen-navigation-bot');
  if (process.argv.includes('--occupied-exit')) modules.main = await actionBundle(root, 'occupied-exit-bot');
  if (process.argv.includes('--spawn')) modules.main = await actionBundle(root, 'spawn-bot');
  if (process.argv.includes('--spawn-contention')) modules.main = await actionBundle(root, 'spawn-contention-bot');
  if (process.argv.includes('--stations')) modules.main = await actionBundle(root, 'stations-bot');
  if (process.argv.includes('--mining') || process.argv.includes('--mining-interrupted') || process.argv.includes('--mining-storage')) modules.main = await actionBundle(root, 'mining-bot');
  if (process.argv.includes('--specialist-mining')) modules.main = await actionBundle(root, 'specialist-mining-bot');
  if (process.argv.includes('--colony-mining')) modules.main = await actionBundle(root, 'colony-mining-bot');
  if (process.argv.includes('--mineral-depletion') || process.argv.includes('--mineral-capacity')) modules.main = await actionBundle(root, 'mineral-depletion-bot');
  if (process.argv.includes('--mining-work')) modules.main = await actionBundle(root, 'mining-work-bot');
  if (process.argv.includes('--colony-mineral')) modules.main = await actionBundle(root, 'colony-mineral-bot');
  if (process.argv.includes('--mining-replacement')) modules.main = await actionBundle(root, 'mining-replacement-bot');
  if (process.argv.includes('--mining-saturation')) modules.main = await actionBundle(root, 'mining-saturation-bot');
  if (process.argv.includes('--extractor-fault')) modules.main = await actionBundle(root, 'extractor-fault-bot');
  if (process.argv.includes('--transfer-confirmation')) modules.main = await actionBundle(root, 'transfer-confirmation-bot');
  if (process.argv.includes('--source-loss')) modules.main = await actionBundle(root, 'energy-logistics-bot');
  if (process.argv.includes('--preservation-decay')) modules.main = await actionBundle(root, 'preservation-bot');
  if (process.argv.includes('--full-sink')) modules.main = await actionBundle(root, 'missing-sink-bot');
  if (boostedBuilderMode) modules.main = await actionBundle(root,boostedBuilderMode === 'normal' ? 'boosted-builder-bot' : 'boosted-builder-'+boostedBuilderMode+'-bot');
  if (workerBoostMode) modules.main = await actionBundle(root,workerBoostMode === 'normal' ? 'worker-boost-bot' : 'worker-boost-'+workerBoostMode+'-bot');
  if (boostBulkMode) modules.main = await actionBundle(root,boostBulkMode === 'normal' ? 'boost-bulk-bot' : 'boost-bulk-refused-bot');
  if (boostRoleMode) modules.main = await actionBundle(root,boostRoleMode === 'normal' ? 'boost-role-bot' : 'boost-role-'+boostRoleMode+'-bot');
  if (boostMode) modules.main = await actionBundle(root,boostMode === 'normal' ? 'boost-bot' : 'boost-'+boostMode+'-bot');
  if (labChainMode) modules.main = await actionBundle(root,labChainMode === 'normal' ? 'lab-chain-bot' : 'lab-chain-'+labChainMode+'-bot');
  if (labEmpire) modules.main = await actionBundle(root,labEmpireMode === 'normal' ? 'lab-empire-bot' : 'lab-empire-'+labEmpireMode+'-bot');
  if (labSupplyMode) modules.main = await actionBundle(root,labSupplyMode === 'normal' ? 'lab-supply-bot' : 'lab-supply-'+labSupplyMode+'-bot');
  if (labReactionMode) modules.main = await actionBundle(root,'lab-reactions-bot');
  if (process.argv.includes('--final-delivery')) modules.main = await actionBundle(root, 'final-delivery-bot');
  if (process.argv.includes('--expiry-delivery')) modules.main = await actionBundle(root, 'expiry-delivery-bot');
  if (process.argv.includes('--mineral-recovery') || process.argv.includes('--mineral-recovery-fallback')) modules.main = await actionBundle(root, 'mineral-recovery-bot');
  if (process.argv.includes('--banking-demand')) modules.main = await actionBundle(root, 'banking-demand-bot');
  if (storeBalanceMode) modules.main = await actionBundle(root, 'store-balance-bot');
  if ((process.argv.includes('--energy-banking') || process.argv.includes('--banking-fallback'))) modules.main = await actionBundle(root, 'energy-banking-bot');
  if (process.argv.includes('--storage-loss')) modules.main = await actionBundle(root, 'storage-loss-bot');
  if (process.argv.includes('--cargo-death')) modules.main = await actionBundle(root, 'cargo-death-bot');
  if (process.argv.includes('--courier-death')) modules.main = await actionBundle(root, 'courier-death-bot');
  if ((process.argv.includes('--mineral-transport') || process.argv.includes('--mineral-reload'))) modules.main = await actionBundle(root, 'mineral-transport-bot');
  if (process.argv.includes('--link-reversal')) modules.main = await actionBundle(root, 'link-reversal-bot');
  if (process.argv.includes('--link-service')) modules.main = await actionBundle(root, 'link-service-bot');
  if (process.argv.includes('--link-contention')) modules.main = await actionBundle(root, 'link-contention-bot');
  if (process.argv.includes('--controller-links')) modules.main = await actionBundle(root, 'controller-links-bot');
  if (process.argv.includes('--link-supply')) modules.main = await actionBundle(root, 'link-supply-bot');
  if (process.argv.includes('--tower-supply')) modules.main = await actionBundle(root, 'tower-supply-bot');
  if (process.argv.includes('--preservation')) modules.main = await actionBundle(root, 'preservation-bot');
  if (process.argv.includes('--large-drop')) modules.main = await actionBundle(root, 'large-drop-bot');
  if (process.argv.includes('--drop-supply')) modules.main = await actionBundle(root, 'energy-logistics-bot');
  if (process.argv.includes('--remains-supply')) modules.main = await actionBundle(root, 'remains-supply-bot');
  if (process.argv.includes('--pickup-admission')) modules.main = await actionBundle(root, 'pickup-admission-bot');
  if (process.argv.includes('--missing-sink')) modules.main = await actionBundle(root, 'missing-sink-bot');
  if (process.argv.includes('--unknown-delivery')) modules.main = await actionBundle(root, 'unknown-delivery-bot');
  if (process.argv.includes('--unknown-recovery')) modules.main = await actionBundle(root, 'unknown-recovery-bot');
  if (process.argv.includes('--expiry-recovery')) modules.main = await actionBundle(root, 'expiry-recovery-bot');
  if (process.argv.includes('--cargo-recovery')) modules.main = await actionBundle(root, 'cargo-recovery-bot');
  if (process.argv.includes('--empty-source')) modules.main = await actionBundle(root, 'empty-source-bot');
  if (process.argv.includes('--colony-economy')) modules.main = await actionBundle(root, 'colony-economy-bot');
  if (process.argv.includes('--courier-routes') || process.argv.includes('--mineral-routes')) modules.main = await actionBundle(root, 'courier-routes-bot');
  if (process.argv.includes('--courier-bootstrap')) modules.main = await actionBundle(root, 'courier-bootstrap-bot');
  if (process.argv.includes('--work-supply')) modules.main = await actionBundle(root, 'work-supply-bot');
  if (process.argv.includes('--reclamation')) modules.main = await actionBundle(root, 'reclamation-bot');
  if (process.argv.includes('--energy-logistics')) modules.main = await actionBundle(root, 'energy-logistics-bot');
  if (process.argv.includes('--fixed-hauling')) modules.main = await actionBundle(root,'fixed-hauling-bot');
  if (process.argv.includes('--hauling-cycle')) modules.main = await actionBundle(root, 'hauling-cycle-bot');
  evidence.provenance = provenance(root, modules.main);
  const bot = await server.world.addBot({ username: 'eldrift-smoke', room: 'W0N1', x: 15, y: 15, modules });
  if (constructionRemote) await constructionRemoteWorld(server, bot);
  if (constructionRun) {
    await server.world.setTerrain('W0N1', new TerrainMatrix());
    const { db } = await server.world.load();
    await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 6, downgradeTime: 20000 } });
  }
  if (planningRoom || stampRoom) await planningRoomWorld(server, bot, irregularStampRoom);
  if (process.argv.includes('--actions') || process.argv.includes('--tasks')) await actionWorld(server, bot);
  if (process.argv.includes('--retirement')) await actionWorld(server, bot);
  if (structureActions) await structureActionsWorld(server, bot);
  if (upgradeMaster) await upgradeMasterWorld(server, bot, masterContention);
  if (upgradeFleet) await upgradeFleetWorld(server, bot, upgradeFleetLoss);
  if (upgradeRoom) await upgradeRoomWorld(server, bot, process.argv.includes('--upgrade-room-shortage'));
  if (upgradeService) await upgradeServiceWorld(server, bot);
  if (workerCargoMode) await workerCargoWorld(server, bot, workerCargoMode);
  if (upgradeClaim) await upgradeClaimWorld(server, bot);
  if (colonyResilience) await colonyResilienceWorld(server, bot);
  if (upgradeRebuild) await upgradeRebuildWorld(server, bot);
  if (masterBootstrap) await masterBootstrapWorld(server, bot);
  if (masterHandoff) await masterHandoffWorld(server, bot);
  if (scoutRuntime) await scoutRuntimeWorld(server,bot,scoutAutomatic,scoutBlocked,scoutExplore);
  if (startupMode) await remoteStartupWorld(server,bot);
  if (reachabilityMode) await remoteReachabilityWorld(server,bot,reachabilityMode);
  if (remoteCapacityMode) await remoteCapacityWorld(server,bot,remoteCapacityMode);
  if (reservationVision) await reservationVisionWorld(server,bot);
  if (remotePipeline) await remotePipelineWorld(server,bot);
  if (reservationPopulation) await reservationPopulationWorld(server,bot);
  if (reservationSelection) await reservationSelectionWorld(server,bot);
  if (roomReservation) await roomReservationWorld(server,bot);
  if (reservationQuote) await reservationQuoteWorld(server,bot);
  if (remoteRoadAuto) await remoteRoadAutoWorld(server,bot);
  if (remoteRoadWork) await remoteRoadWorkWorld(server,bot);
  if (remoteReturn) await remoteReturnWorld(server,bot);
  if (remoteFleetMode) await remoteFleetWorld(server,bot,remoteFleetMode);
  if (remoteRuntime) await remoteRuntimeWorld(server,bot);
  if (remoteManagement) await remoteManagementWorld(server,bot);
  if (remoteInfrastructure) await remoteInfrastructureWorld(server,bot);
  if (remoteTransportMode) await remoteTransportWorld(server,bot,remoteTransportMode);
  if (remoteBankingMode) await remoteBankingWorld(server,bot);
  if (remoteMining) await remoteMiningWorld(server,bot);
  if (remoteReservation) await remoteReservationWorld(server,bot);
  if (remoteAssessment) await remoteAssessmentWorld(server,bot);
  if (scoutFallback) await scoutFallbackWorld(server);
  if (observerRuntime) await observerRuntimeWorld(server, bot);
  if (scoutLifecycle) await scoutLifecycleWorld(server, bot);
  if (intelCapture) await intelCaptureWorld(server, bot);
  if (intelObservation) await intelObservationWorld(server, bot);
  if (supplyReplacement) await supplyReplacementWorld(server, bot);
  if (sponsorLoss) await sponsorLossWorld(server, bot);
  if (supplyFleet) await supplyFleetWorld(server, bot, supplyFleetLoss);
  if (supplyCycle) await supplyCycleWorld(server, bot, supplyMaster, supplyCargo, supplyCargoHold);
  if (supplyEndpoint) await supplyEndpointWorld(server, bot, supplyEndpoint);
  if (groundDelivery) await groundDeliveryWorld(server, bot);
  if (artRegion) await artRegionWorld(server, bot, artBuilder);
  if (legacyFortifier) await legacyFortifierWorld(server, bot);
  else if (fortifierWork) await fortifierWorkWorld(server, bot);
  if (workerMinerTravel) await workerMinerTravelWorld(server, bot);
  if (workerMinerAutomatic) await workerMinerAutomaticWorld(server, bot);
  else if (workerMiner) await workerMinerWorld(server, bot);
  if (workDependencies) await workDependenciesWorld(server, bot);
  if (workerPosition) await workerPositionWorld(server, bot, workerPositionWide);
  if (bootstrapAssignment) await bootstrapAssignmentWorld(server, bot);
  if (bootstrapSalvage) await bootstrapSalvageWorld(server, bot, bootstrapSalvage);
  if (upgradeBootstrap) await upgradeBootstrapWorld(server, bot, bootstrapHarvest);
  if (upgradeCycle) await upgradeCycleWorld(server, bot);
  if (upgradeLoss) await upgradeLossWorld(server, bot);
  if (distributorRecovery) await distributorRecoveryWorld(server, bot);
  if (recoveryBanking) await recoveryBankingWorld(server, bot);
  if (automaticSupport) await automaticSupportWorld(server, bot);
  if (supportTransport) await supportTransportWorld(server, bot, process.argv.includes('--support-reserve-change'));
  if (upgradeSupplyTransport) {
    const { db } = await server.world.load();
    await db['rooms.objects'].update({ room: 'E0N1', type: 'controller' }, { $set: { level: 4 } });
  }
  if (process.argv.includes('--recovery-scavenger-spawn')) await recoveryScavengerSpawnWorld(server, bot);
  if (process.argv.includes('--recovery-scavenging')) await recoveryScavengingWorld(server, bot);
  if (process.argv.includes('--recovery-economy')) await recoveryEconomyWorld(server, bot);
  if (process.argv.includes('--energy-recovery')) await energyRecoveryWorld(server, bot);
  if (process.argv.includes('--mixed-workers')) await mixedWorkersWorld(server, bot);
  if (process.argv.includes('--worker-population')) await workerPopulationWorld(server, bot);
  if (workerProfile) await workerProfileWorld(server, bot, workerProfile);
  if (process.argv.includes('--worker-pickup')) await workerPickupWorld(server, bot);
  if (process.argv.includes('--worker-collection')) await workerCollectionWorld(server, bot);
  if (stampDraft || planningBudget || planningRuntime || planningJob || constrainedDraftResume || standardDraftResume || planningCommit || planningRouteResume || layoutPlacement || roomAssessment || process.argv.includes('--work-selection') || process.argv.includes('--worker-runtime')) await workSelectionWorld(server, bot);
  if (process.argv.includes('--work')) await workWorld(server, bot);
  if (process.argv.includes('--resources')) await resourceWorld(server, bot);
  if (process.argv.includes('--movement') || process.argv.includes('--paths')) await movementWorld(server, bot);
  if (process.argv.includes('--recovery')) await recoveryWorld(server, bot);
  if (process.argv.includes('--traffic')) await trafficWorld(server, bot);
  if (process.argv.includes('--exits') || process.argv.includes('--navigation')) await exitsWorld(server, bot);
  if (process.argv.includes('--service-recovery')) await loadedRecoveryWorld(server, bot);
  if (process.argv.includes('--unseen')) await unseenWorld(server, bot);
  if (process.argv.includes('--occupied-exit')) await occupiedExitWorld(server, bot);
  if (process.argv.includes('--spawn')) await server.world.setTerrain('W0N1', new TerrainMatrix());
  if (process.argv.includes('--spawn-contention')) await contentionWorld(server, bot);
  if (process.argv.includes('--stations')) {
    await actionWorld(server, bot);
    await server.world.setTerrain('W0N1', new TerrainMatrix());
    await server.world.addRoomObject('W0N1', 'container', 21, 20, {
      store: {}, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000,
    });
  }
  if (process.argv.includes('--mining-storage')) await miningStorageWorld(server, bot);
  if (process.argv.includes('--mining')) await miningWorld(server, bot);
  if (process.argv.includes('--specialist-mining')) await specialistMiningWorld(server, bot);
  if (process.argv.includes('--colony-mining')) await colonyMiningWorld(server);
  if (process.argv.includes('--mineral-depletion') || process.argv.includes('--mineral-capacity')) {
    await specialistMiningWorld(server, bot);
    const { db } = await server.world.load();
    await db['rooms.objects'].update({ room: 'W0N1', type: 'mineral', x: 30, y: 20 }, { $set: { mineralAmount: 1 } });
    if (process.argv.includes('--mineral-capacity')) {
      await db['rooms.objects'].update({ room: 'W0N1', type: 'mineral', x: 30, y: 20 }, { $set: { mineralAmount: 1000 } });
      await db['rooms.objects'].update({ room: 'W0N1', name: 'mineral-miner' }, { $set: {
        store: { H: 49 }, body: [{ type: 'work', hits: 100, boost: 'UO' }, { type: 'carry', hits: 100 }, { type: 'move', hits: 100 }],
      } });
    }
    await server.world.addRoomObject('W0N1', 'container', 30, 21, {
      store: {}, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000,
    });
  }
  if (process.argv.includes('--mining-work')) await miningWorkWorld(server, bot);
  if (process.argv.includes('--colony-mineral')) await colonyMineralWorld(server, bot);
  if (process.argv.includes('--mining-replacement')) await miningReplacementWorld(server, bot);
  if (process.argv.includes('--mining-saturation')) await miningSaturationWorld(server, bot);
  if (process.argv.includes('--extractor-fault')) await extractorFaultWorld(server, bot);
  if (process.argv.includes('--mining-interrupted')) await interruptedMiningWorld(server, bot);
  if (process.argv.includes('--transfer-confirmation')) await transferConfirmationWorld(server, bot);
  if (process.argv.includes('--source-loss')) await energyLogisticsWorld(server, bot);
  if (process.argv.includes('--preservation-decay')) await preservationDecayWorld(server, bot);
  if (process.argv.includes('--full-sink')) await cargoRecoveryWorld(server, bot);
  if (boostedBuilderMode) await boostedBuilderWorld(server,bot,boostedBuilderMode);
  if (workerBoostMode) await workerBoostWorld(server,bot,workerBoostMode);
  if (boostBulkMode) await boostBulkWorld(server,bot,boostBulkMode);
  if (boostRoleMode) await boostRoleWorld(server,bot);
  if (boostMode) await boostWorld(server,bot,boostMode);
  if (labChainMode) await labChainWorld(server,bot,labChainMode);
  if (labEmpire) await labEmpireWorld(server,bot,labEmpireMode);
  if (labSupplyMode) await labSupplyWorld(server,bot,labSupplyMode);
  if (labReactionMode) await labReactionsWorld(server,bot,labReactionMode);
  if (process.argv.includes('--final-delivery')) await finalDeliveryWorld(server, bot);
  if (process.argv.includes('--expiry-delivery')) await cargoRecoveryWorld(server, bot);
  if (process.argv.includes('--mineral-recovery') || process.argv.includes('--mineral-recovery-fallback')) await mineralRecoveryWorld(server, bot, process.argv.includes('--mineral-recovery-fallback'));
  if (process.argv.includes('--banking-demand')) await bankingDemandWorld(server, bot);
  if (storeBalanceMode) await storeBalanceWorld(server, bot, storeBalanceMode);
  if ((process.argv.includes('--energy-banking') || process.argv.includes('--banking-fallback'))) await energyBankingWorld(server, bot, process.argv.includes('--banking-fallback'));
  if (process.argv.includes('--storage-loss')) await storageLossWorld(server, bot);
  if (process.argv.includes('--cargo-death')) await cargoDeathWorld(server, bot);
  if (process.argv.includes('--courier-death')) await courierDeathWorld(server, bot);
  if ((process.argv.includes('--mineral-transport') || process.argv.includes('--mineral-reload'))) await mineralTransportWorld(server, bot);
  if (process.argv.includes('--link-reversal')) await linkReversalWorld(server, bot);
  if (process.argv.includes('--link-service')) await linkServiceWorld(server, bot);
  if (process.argv.includes('--link-contention')) await linkContentionWorld(server, bot);
  if (process.argv.includes('--controller-links')) await controllerLinksWorld(server, bot);
  if (process.argv.includes('--link-supply')) await linkSupplyWorld(server, bot);
  if (process.argv.includes('--tower-supply')) await towerSupplyWorld(server, bot);
  if (process.argv.includes('--preservation')) await preservationWorld(server, bot);
  if (process.argv.includes('--large-drop')) await largeDropWorld(server, bot);
  if (process.argv.includes('--drop-supply')) await dropSupplyWorld(server, bot);
  if (process.argv.includes('--remains-supply')) await remainsSupplyWorld(server, bot);
  if (process.argv.includes('--pickup-admission')) await pickupAdmissionWorld(server, bot);
  if (process.argv.includes('--missing-sink')) await cargoRecoveryWorld(server, bot);
  if (process.argv.includes('--unknown-delivery')) await cargoRecoveryWorld(server, bot);
  if (process.argv.includes('--unknown-recovery')) await cargoRecoveryWorld(server, bot);
  if (process.argv.includes('--expiry-recovery')) await cargoRecoveryWorld(server, bot);
  if (process.argv.includes('--cargo-recovery')) await cargoRecoveryWorld(server, bot);
  if (process.argv.includes('--empty-source')) await emptySourceWorld(server, bot);
  if (process.argv.includes('--colony-economy')) await colonyEconomyWorld(server, bot);
  if (process.argv.includes('--mineral-routes')) await mineralRoutesWorld(server, bot);
  if (process.argv.includes('--courier-routes')) await courierRoutesWorld(server, bot);
  if (process.argv.includes('--courier-bootstrap')) await courierBootstrapWorld(server, bot);
  if (process.argv.includes('--work-supply')) await workSupplyWorld(server, bot);
  if (process.argv.includes('--reclamation')) await reclamationWorld(server, bot);
  if (process.argv.includes('--energy-logistics')) await energyLogisticsWorld(server, bot);
  if (process.argv.includes('--fixed-hauling')) await fixedHaulingWorld(server,bot);
  if (process.argv.includes('--hauling-cycle')) await haulingCycleWorld(server, bot);
  const messages = evidence.messages;
  const errors = evidence.errors;
  await server.common.storage.pubsub.subscribe(`user:${bot.id}/console`, event => {
    const payload = JSON.parse(event);
    messages.push(...(payload.messages?.log ?? []));
    if (payload.error) errors.push(payload.error);
  });
  await server.start();
  if (process.argv.includes('--inject-timeout')) await new Promise(() => {});
  const initial = Number(await server.world.gameTime);
  const samples = evidence.samples;
  const tickCount = boostedBuilderMode ? (boostedBuilderMode === 'normal' ? 450 : 30) : labEmpire ? 640 : boostBulkMode ? 320 : boostRoleMode ? 320 : workerBoostMode ? 100 : boostMode ? 100 : labChainMode ? 640 : labSupplyMode ? 320 : labReactionMode ? 25 : process.argv.includes('--final-delivery') ? 4 : process.argv.includes('--fixed-hauling') ? 16 : startupMode ? (startupMode === 'staged' ? 5000 : 150) : reachabilityMode ? (reachabilityMode === 'arrival' ? 100 : reachabilityMode === 'withdraw' ? 1550 : 3100) : remoteCapacityMode ? (['idle','starved'].includes(remoteCapacityMode) ? 1505 : 30) : reservationVision ? 550 : remotePipeline ? 1000 : reservationPopulation ? (reservationPopulationCancellation ? 48 : reservationPopulationAdmission ? 120 : 900) : reservationSelection ? 32 : roomReservation ? 28 : reservationQuote ? 8 : remoteRoadAuto ? (remoteRoadAdmission ? 160 : 450) : remoteRoadWork ? 400 : remoteReturn ? 260 : remoteFleetMode ? (remoteFleetMode === 'border' ? 20 : remoteFleetMode === 'lifetime' ? 1750 : remoteFleetMode === 'bootstrap' ? 1500 : remoteFleetMode === 'budget' ? 280 : 260) : remoteRuntime ? 100 : remoteManagement ? 56 : remoteInfrastructure ? 50 : remoteTransportMode ? 240 : remoteBankingMode ? 160 : remoteMining ? 130 : remoteReservation ? 140 : remoteAssessment ? 8 : scoutFallback ? 140 : observerRuntime ? 24 : scoutRuntime ? (scoutBlocked ? 64 : scoutAutomatic ? 110 : 32) : scoutLifecycle ? 12 : intelCapture ? 18 : intelObservation ? 12 : masterHandoff ? 20 : constructionRetry ? 12 : constructionRemote ? 6 : constructionBudget ? 20 : constructionLifecycle ? 20 : constructionRun ? 6 : defenseCut ? 500 : stampBudget ? 1600 : stampRoom ? 400 : stampDraft ? 160 : planningRoom ? 400 : planningBudget ? 80 : planningRuntime ? 8 : planningJob ? 230 : constrainedDraftResume ? 70 : standardDraftResume ? 12 : roomAssessment ? 8 : artRegion ? 20 : fortifierWork ? 12 : workerMinerTravel ? 40 : workerMiner ? 20 : workDependencies ? 6 : bootstrapAssignment ? 25 : bootstrapSalvage ? 25 : colonyResilience ? 1100 : upgradeRebuild ? 700 : masterBootstrap ? 140 : supplyReplacement ? 900 : sponsorLoss ? 40 : supplyFleetLoss ? 12 : supplyFleet ? 270 : supplyCycle ? 40 : groundRecovery ? 5 : bootstrapHarvest ? 250 : upgradeBootstrap ? 150 : upgradeClaim ? 60 : upgradeCycle ? 55 : upgradeLoss ? 160 : distributorRecovery ? 45 : masterContention ? 8 : upgradeMaster ? 120 : upgradeFleetLoss ? 8 : upgradeFleet ? 240 : upgradeRoom ? 24 : upgradeService ? 150 : workerCargoMode ? 15 : recoveryBanking ? 100 : automaticSupport ? 100 : supportTransport ? 20 : process.argv.includes('--recovery-scavenger-spawn') ? 160 : process.argv.includes('--recovery-scavenging') ? 20 : process.argv.includes('--recovery-economy') ? 180 : process.argv.includes('--energy-recovery') ? 8 : process.argv.includes('--worker-population') ? 44 : process.argv.includes('--worker-pickup') ? 6 : process.argv.includes('--worker-collection') ? 10 : process.argv.includes('--worker-runtime') ? 6 : process.argv.includes('--work-selection') ? 4 : process.argv.includes('--mining-storage') ? 5 : process.argv.includes('--work-supply') ? 10 : process.argv.includes('--reclamation') ? 7 : process.argv.includes('--banking-demand') ? 8 : storeBalanceMode ? 6 : (process.argv.includes('--energy-banking') || process.argv.includes('--banking-fallback')) ? 5 : process.argv.includes('--storage-loss') ? 4 : process.argv.includes('--cargo-death') ? 9 : process.argv.includes('--courier-death') ? 4 : (process.argv.includes('--mineral-transport') || process.argv.includes('--mineral-reload')) ? 9 : process.argv.includes('--link-reversal') ? 8 : process.argv.includes('--link-service') ? 4 : process.argv.includes('--link-contention') ? 4 : process.argv.includes('--controller-links') ? 4 : process.argv.includes('--tower-supply') ? 5 : process.argv.includes('--expiry-delivery') ? 4 : process.argv.includes('--full-sink') ? 4 : process.argv.includes('--preservation-decay') ? 8 : process.argv.includes('--preservation') ? 8 : process.argv.includes('--large-drop') ? 5 : process.argv.includes('--drop-supply') ? 5 : process.argv.includes('--source-loss') ? 6 : process.argv.includes('--remains-supply') ? 7 : process.argv.includes('--pickup-admission') ? 4 : process.argv.includes('--missing-sink') ? 4 : process.argv.includes('--unknown-delivery') ? 5 : process.argv.includes('--unknown-recovery') ? 5 : process.argv.includes('--expiry-recovery') ? 4 : process.argv.includes('--cargo-recovery') ? 4 : process.argv.includes('--empty-source') ? 6 : process.argv.includes('--colony-economy') ? 100 : process.argv.includes('--courier-bootstrap') ? 30 : process.argv.includes('--energy-logistics') ? 5 : process.argv.includes('--hauling-cycle') ? 6 : process.argv.includes('--transfer-confirmation') ? 4 : process.argv.includes('--mining-interrupted') ? 9 : process.argv.includes('--extractor-fault') ? 13 : process.argv.includes('--mining-saturation') ? 12 : process.argv.includes('--mining-replacement') ? 25 : process.argv.includes('--colony-mineral') ? 25 : process.argv.includes('--colony-mining') ? 45 : process.argv.includes('--specialist-mining') ? 8 : process.argv.includes('--mining') ? 5 : process.argv.includes('--spawn') ? 12 : process.argv.includes('--service-recovery') ? 8 : process.argv.includes('--recovery') ? 6 : 3;
  for (let tick = 0; tick < tickCount; tick++) {
    if (boostBulkMode || boostRoleMode) {
      const reloaded = await reloadStampDraft(server,bot,modules,tick,[7,11,30,180]);
      if (reloaded) evidence.reloadProvenance = provenance(root,reloaded);
    }
    if (boostMode || workerBoostMode || boostedBuilderMode) {
      const reloaded = await changeBoosts(server,bot,modules,tick);
      if (reloaded) evidence.reloadProvenance = provenance(root,reloaded);
    }
    if (labChainMode) {
      const reloaded = await reloadStampDraft(server,bot,modules,tick,[30,120,240]);
      if (reloaded) evidence.reloadProvenance = provenance(root,reloaded);
    }
    if (['loss','vision','intel'].includes(labEmpireMode)) {
      const reloaded = await changeEmpireOwnership(server,bot,modules,tick,evidence,labEmpireMode);
      if (reloaded) evidence.reloadProvenance = provenance(root,reloaded);
    }
    if (labEmpire) {
      let reloads = [30,180,400];
      if (labEmpireMode !== 'normal' && !evidence.empirePolicyReload) {
        const current = JSON.parse((await bot.memory) || '{}');
        if (current.empirePolicyChange && current.empireProductionRows?.at(-1)?.windows.some(window => window.home === 'W0N1' && window.retiring)) { reloads = [tick]; evidence.empirePolicyReload = { tick: tick+1,pending: true }; }
      }
      const reloaded = await reloadStampDraft(server,bot,modules,tick,reloads);
      if (reloaded) evidence.reloadProvenance = provenance(root,reloaded);
    }
    if (labSupplyMode) {
      let reloads = [30,180];
      if (labSupplyMode === 'replan' && !evidence.labReplanReload) {
        const current = JSON.parse((await bot.memory) || '{}');
        if (current.labReplanRows?.at(-1)?.pending) { reloads = [tick]; evidence.labReplanReload = { tick: tick+1,pending: true }; }
      }
      const reloaded = await reloadStampDraft(server,bot,modules,tick,reloads);
      if (reloaded) evidence.reloadProvenance = provenance(root,reloaded);
    }
    if (labReactionMode) {
      await changeLabReactions(server,tick,labReactionMode);
      const reloaded = await reloadStampDraft(server,bot,modules,tick,[5]);
      if (reloaded) evidence.reloadProvenance = provenance(root,reloaded);
    }
    if (scoutRuntime) {
      await changeScoutRuntime(server,tick,scoutAutomatic,scoutBlocked);
      const reloaded = await reloadStampDraft(server,bot,modules,tick,scoutAutomatic ? [30] : [8]);
      if (reloaded) evidence.reloadProvenance = provenance(root,reloaded);
    }
    if (startupMode) {
      const replacement = await startupChanges.change(server,bot,modules,tick);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (reachabilityMode) {
      const replacement = await changeRemoteReachability(server,bot,modules,tick,reachabilityMode);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (remoteCapacityMode) {
      const replacement = await changeRemoteCapacity(server,bot,modules,tick,remoteCapacityMode);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (reservationVision) {
      const replacement = await changeReservationVision(server,bot,modules,tick);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (remotePipeline) {
      const replacement = await changeRemotePipeline(server,bot,modules,tick);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (reservationPopulation) {
      const replacement = await changeReservationPopulation(server,bot,modules,tick,reservationPopulationCancellation ? 'cancel' : reservationPopulationAdmission ? 'admission' : 'normal');
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (reservationSelection) {
      const replacement = await changeReservationSelection(server,bot,modules,tick);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (roomReservation) {
      const replacement = await changeRoomReservation(server,bot,modules,tick);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (reservationQuote) {
      const replacement = await changeReservationQuote(server,bot,modules,tick);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (remoteRoadAuto) {
      const replacement = await changeRemoteRoadAuto(server,bot,modules,tick);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (remoteRoadWork) {
      const replacement = await changeRemoteRoadWork(server,bot,modules,tick);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (remoteReturn) {
      const replacement = await changeRemoteReturn(server,bot,modules,tick);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (remoteFleetMode) {
      const replacement = await remoteFleetChanges.change(server,bot,modules,tick);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (remoteRuntime) {
      const replacement = await changeRemoteRuntime(server,bot,modules,tick);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (remoteManagement) {
      const replacement = await changeRemoteManagement(server,bot,modules,tick);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (remoteInfrastructure) {
      const replacement = await changeRemoteInfrastructure(server,bot,modules,tick);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (remoteTransportMode) {
      const replacement = await remoteTransportChanges.change(server,bot,modules,tick);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (remoteBankingMode) {
      const replacement = await remoteBankingChanges.change(server,bot,modules,tick);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (remoteMining) {
      const replacement = await changeRemoteMining(server,bot,modules,tick);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (remoteReservation) {
      const replacement = await changeRemoteReservation(server,bot,modules,tick);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (remoteAssessment) await changeRemoteAssessment(server,bot,tick);
    if (scoutFallback) {
      const replacement = await reloadScoutFallback(server,bot,modules,tick);
      if (replacement) evidence.reloadProvenance = provenance(root,replacement);
    }
    if (observerRuntime) {
      const replacement = await changeObserverRuntime(server, bot, modules, tick);
      if (replacement) evidence.reloadProvenance = provenance(root, replacement);
    }
    if (scoutLifecycle) {
      await changeScoutLifecycle(server, tick);
      const reloaded = await reloadStampDraft(server, bot, modules, tick, [4]);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (intelObservation || intelCapture) {
      await changeIntelVision(server, bot, tick);
      const reloaded = await reloadStampDraft(server, bot, modules, tick, [6]);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (masterHandoff) {
      await consumeMasterSpawnEnergy(server, tick);
      const reloaded = await reloadStampDraft(server, bot, modules, tick, [2,10]);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (defenseCutReload) {
      const reloaded = await reloadStampDraft(server, bot, modules, tick, [100, 200]);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (stampDraft || stampRoom) {
      const reloaded = await reloadStampDraft(server, bot, modules, tick, autoStampRoom ? [20, 100, 200] : stampRoom ? [5, 100] : undefined);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (stampLateReset) {
      const reloaded = await reloadLateStamp(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (constructionRetry) {
      const reloaded = await reloadStampDraft(server, bot, modules, tick, [4]);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (constructionLifecycle) {
      const reloaded = await changeConstructionLifecycle(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (planningRoom) {
      const reloaded = await reloadPlanningRoom(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (groundDelivery) {
      const reloaded = await reloadGroundDelivery(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (colonyResilience) await disruptColony(server, bot, tick);
    if (upgradeRebuild) {
      const reloaded = await changeUpgradeRebuild(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (supplyReplacement) await ageSupplyCourier(server, tick);
    if (sponsorLoss) await loseSupplySponsor(server, tick);
    if (supplyFleet) await changeSupplyFleet(server, tick, supplyFleetLoss);
    if (supplyEndpoint) await changeSupplyEndpoint(server, tick, supplyEndpoint);
    if (workerMinerReplacement) await replaceWorkerDeposit(server, tick);
    if (bootstrapAssignment) await depleteAssignedSource(server, tick);
    if (bootstrapHarvest) await drainBootstrapStorage(server, tick);
    if (upgradeClaim) await releaseUpgradeGcl(server, bot, tick);
    if (upgradeCycle) {
      const reloaded = await reloadUpgradeCycle(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (upgradeLoss) {
      const reloaded = await changeUpgradeLoss(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (distributorRecovery) {
      const reloaded = await changeDistributorEnergy(server, tick, bot, modules);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (roomAssessment) await changeAssessmentSites(server, tick);
    if (upgradeMaster) await ageUpgradeMaster(server, bot, tick);
    if (masterLayoutLoss) await changeMasterLayout(server, bot, tick);
    if (masterStorageLoss) await removeMasterStorage(server, tick, masterLoadedLoss);
    if (upgradeFleet) {
      const reloaded = await changeUpgradeFleet(server, bot, modules, tick, upgradeFleetLoss);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (upgradeRoom && !process.argv.includes('--upgrade-room-shortage')) {
      const reloaded = await reloadUpgradeRoom(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (process.argv.includes('--energy-recovery')) await changeRecoveryEnergy(server, tick);
    if (process.argv.includes('--worker-population')) await loseWorker(server, tick);
    if (planningJob) {
      const reloaded = await reloadPlanningJob(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (constrainedDraftResume) {
      const reloaded = await reloadConstrainedDraft(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (standardDraftResume) {
      const reloaded = await reloadStandardDraft(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (planningCommit) {
      const reloaded = await reloadCommittedPlan(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (planningRouteReload) {
      const reloaded = await reloadPlanningRoutes(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (process.argv.includes('--reload')) {
      const reloaded = await prepareReload(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (process.argv.includes('--mining-saturation')) {
      const reloaded = await reloadMiningSaturation(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (process.argv.includes('--colony-economy')) {
      const reloaded = await reloadColonyEconomy(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (process.argv.includes('--support-reserve-change')) await drainSupportDonor(server, tick);
    if (process.argv.includes('--support-loss')) await loseSupportTarget(server, tick);
    if (process.argv.includes('--extractor-fault')) await changeExtractor(server, bot, tick);
    if (process.argv.includes('--courier-routes') || process.argv.includes('--mineral-routes')) await improveCourierRoad(server, tick);
    if (process.argv.includes('--missing-sink')) await removeHaulingSink(server, tick);
    if (process.argv.includes('--full-sink')) await fillHaulingSink(server, tick);
    if (process.argv.includes('--source-loss')) await replaceEnergySource(server, tick);
    if (process.argv.includes('--empty-source')) await drainSource(server, tick);
    if (process.argv.includes('--fixed-hauling')) {
      const reloaded = await reloadStampDraft(server,bot,modules,tick,[4]);
      if (reloaded) evidence.reloadProvenance = provenance(root,reloaded);
    }
    if (process.argv.includes('--hauling-cycle')) await drainHaulingSink(server, tick);
    if (process.argv.includes('--mineral-reload')) {
      const reloaded = await reloadMineralTransport(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    if (process.argv.includes('--storage-loss')) await removeStorage(server, tick);
    if (storeBalanceMode === 'guard') await restoreBalanceEnergy(server, tick);
    if (process.argv.includes('--banking-demand')) await createBankingDemand(server, tick);
    samples.push(await sampleTick(server, bot));
    if (planningCpu) await capturePlanningCpu(server, bot, tick, evidence);
  }
  if (!planningCpu) assert.deepEqual(errors, [], 'Engine reported bot exceptions');
  const memory = JSON.parse(await bot.memory);
  if (constructionRetry) {
    evidence.constructionRetry = { rows: memory.constructionRetryRows, calls: memory.constructionRetryCalls };
    verifyConstructionRetry(memory);
  }
  if (constructionRemote) {
    verifyConstructionRemote(memory);
    evidence.constructionRemote = memory.constructionRemoteRows;
  }
  if (constructionLifecycle) {
    verifyConstructionLifecycle(memory);
    evidence.constructionLifecycle = memory.constructionRuntimeRows;
  }
  if (constructionBudget) {
    const rows = memory.constructionRuntimeRows;
    evidence.constructionBudget = rows;
    assert.equal(rows.length, 20);
    assert.equal(rows.at(-1).sites.length, 1, 'default CPU allowance must create an eligible road');
    assert.ok(rows.at(-1).revision > 0);
    assert.ok(rows.every(row => row.sites.every(type => type === 'road')));
    assert.ok(rows.every(row => row.snapshot === rows[0].snapshot));
    console.log('CONSTRUCTION_BUDGET ' + JSON.stringify({ firstSite: rows.find(row => row.sites.length)?.tick,
      finalRevision: rows.at(-1).revision, maxUsed: Math.max(...rows.map(row => row.used)) }));
  }
  if (constructionRuntime && !constructionLifecycle && !constructionBudget) {
    const rows = memory.constructionRuntimeRows;
    evidence.constructionRuntime = rows;
    assert.equal(rows.length, 6);
    assert.deepEqual(rows.map(row => row.revision), [1, 2, 3, 4, 5, 6]);
    assert.equal(rows.at(-1).sites.length, 1);
    assert.ok(rows.every(row => row.sites.every(type => type === 'road')));
    assert.ok(rows.every(row => row.entries === 5 && row.planRevision === 1 && row.bootstrap === 'spawn:15:15'));
    assert.ok(rows.every(row => row.next >= 0));
  }
  if (constructionRun && !constructionRuntime && !constructionRetry) {
    const rows = memory.constructionRows;
    evidence.construction = rows;
    assert.equal(rows.length, 6);
    assert.equal(rows.reduce((sum, row) => sum + row.created, 0), 1);
    assert.equal(rows.at(-1).sites, 1);
    assert.ok(rows.some(row => row.decisions.some(item => item.status === 'site-existing')));
    assert.ok(rows.some(row => row.decisions.some(item => item.reason === 'energy-reserve')));
    assert.ok(rows.some(row => row.decisions.some(item => item.reason === 'site-limit')));
    assert.ok(rows.every(row => row.storedEnergy === 0));
    assert.deepEqual(rows.map(row => row.next), [1, 2, 0, 1, 2, 0]);
    assert.equal(memory.eldrift.records['construction/W0N1'].data.revision, 6);
  }
  if (defenseCut) {
    evidence.defenseCut = memory.defenseCut;
    evidence.defenseSearch = memory.eldrift.records['defense-search/W0N1'];
    assert.equal(evidence.defenseSearch.owner, 'defense-search');
    assert.equal(evidence.defenseSearch.version, 1);
    assert.ok(evidence.defenseSearch.data.checkpoint.flow.augmentations > 0);
    console.log('DEFENSE_CUT ' + JSON.stringify(memory.defenseCut));
    assert.equal(memory.defenseCut?.done, true);
    assert.equal(memory.defenseCut.barriers, 48);
    if (defenseCutReload) {
      assert.deepEqual(memory.stampReloads, [101, 201]);
      assert.deepEqual(memory.defenseCut.starts, [1, 101, 201]);
      assert.ok(memory.defenseCut.restored.slice(1).every(count => count > 0));
      assert.ok(memory.defenseCut.rows.filter(row => row.tick === 100 || row.tick === 200).every(row => row.status === 'pending'));
    }
  }
  if (structureActions) verifyStructureActions(memory);
  if (masterStorageLoss) verifyMasterStorageLoss(memory, masterLoadedLoss);
  else if (masterLayoutLoss) verifyMasterLayoutLoss(memory);
  else if (upgradeMaster) verifyUpgradeMaster(memory, masterContention);
  if (upgradeFleet) verifyUpgradeFleet(memory, upgradeFleetLoss);
  if (upgradeRoom) verifyUpgradeRoom(memory, process.argv.includes('--upgrade-room-shortage'));
  assert.equal(Number(await server.world.gameTime), initial + tickCount);
  assert.equal(memory.eldrift.format, 1);
  assert.equal(memory.eldrift.records['operator/config'].owner, 'operator');
  if (process.argv.includes('--actions')) verifyActions(memory);
  if (process.argv.includes('--reload')) verifyReload(memory, initial);
  if (process.argv.includes('--tasks')) verifyTasks(memory);
  if (upgradeService) verifyUpgradeService(memory);
  if (workerCargoMode) verifyWorkerCargo(memory, workerCargoMode);
  if (upgradeClaim) verifyUpgradeClaim(memory);
  if (colonyResilience) verifyColonyResilience(memory, evidence.messages);
  if (upgradeRebuild) verifyUpgradeRebuild(memory, evidence.messages);
  if (masterBootstrap) verifyMasterBootstrap(memory, evidence.messages);
  if (scoutRuntime) verifyScoutRuntime(memory,evidence,scoutAutomatic,scoutExplore,scoutBlocked);
  if (startupMode) verifyRemoteStartup(memory,evidence,startupMode,startupChanges.rows);
  if (reachabilityMode) verifyRemoteReachability(memory,evidence,reachabilityMode);
  if (remoteCapacityMode) verifyRemoteCapacity(memory,evidence,remoteCapacityMode);
  if (reservationVision) verifyReservationVision(memory,evidence);
  if (remotePipeline) verifyRemotePipeline(memory,evidence);
  if (reservationPopulation) (reservationPopulationCancellation ? verifyReservationPopulationCancellation : reservationPopulationAdmission ? verifyReservationPopulationAdmission : verifyReservationPopulation)(memory,evidence);
  if (reservationSelection) verifyReservationSelection(memory,evidence);
  if (roomReservation) verifyRoomReservation(memory,evidence);
  if (reservationQuote) verifyReservationQuote(memory,evidence);
  if (remoteRoadAdmission) verifyRemoteRoadAdmission(memory,evidence);
  else if (remoteRoadAuto) verifyRemoteRoadAuto(memory,evidence);
  if (remoteRoadWork) verifyRemoteRoadWork(memory,evidence);
  if (remoteReturn) await verifyRemoteReturn(memory,evidence,server);
  if (remoteFleetMode) await verifyRemoteFleet(memory,evidence,remoteFleetChanges.metadata,server);
  if (remoteRuntime) verifyRemoteRuntime(memory,evidence);
  if (remoteManagement) verifyRemoteManagement(memory,evidence);
  if (remoteInfrastructure) verifyRemoteInfrastructure(memory,evidence);
  if (remoteTransportMode) await verifyRemoteTransport(memory,evidence,remoteTransportChanges.metadata,server);
  if (remoteBankingMode) verifyRemoteBanking(memory,evidence,remoteBankingChanges.metadata);
  if (remoteMining) verifyRemoteMining(memory,evidence);
  if (remoteReservation) verifyRemoteReservation(memory,evidence);
  if (remoteAssessment) verifyRemoteAssessment(memory,evidence);
  if (scoutFallback) verifyScoutFallback(memory,evidence);
  if (observerRuntime) verifyObserverRuntime(memory, evidence);
  if (scoutLifecycle) verifyScoutLifecycle(memory, evidence);
  if (intelCapture) verifyIntelCapture(memory, evidence);
  if (intelObservation) verifyIntelObservation(memory, evidence);
  if (masterHandoff) { evidence.masterHandoff = { rows: memory.masterHandoff, reloads: memory.stampReloads }; verifyMasterHandoff(memory); }
  if (supplyReplacement) verifySupplyReplacement(memory, evidence.messages);
  if (sponsorLoss) verifySponsorLoss(memory);
  if (supplyFleet) verifySupplyFleet(memory, supplyFleetLoss);
  if (supplyEndpoint) verifySupplyEndpoint(memory, supplyEndpoint);
  if (supplyCycle && !supplyEndpoint) verifySupplyCycle(memory, supplyMaster, supplyCargo, supplyCargoHold);
  if (groundDelivery) verifyGroundDelivery(memory, groundRecovery);
  if (artRegion) verifyArtRegion(memory, evidence.messages, artBuilder);
  if (legacyFortifier) verifyLegacyFortifier(memory, evidence.messages);
  else if (fortifierWork) verifyFortifierWork(memory, evidence.messages);
  if (workerMinerTravel) verifyWorkerMinerTravel(memory, evidence.messages);
  if (workerMinerReplacement) verifyWorkerMinerReplacement(memory, evidence.messages);
  else if (workerMiner) verifyWorkerMiner(memory, evidence.messages);
  if (workDependencies) verifyWorkDependencies(memory, evidence.messages);
  if (workerPosition) { evidence.workerPosition = memory.workerPosition; verifyWorkerPosition(memory, workerPositionWide); }
  if (bootstrapAssignment) verifyBootstrapAssignment(memory, evidence.messages);
  if (bootstrapSalvage) verifyBootstrapSalvage(memory, bootstrapSalvage, evidence.messages);
  if (upgradeBootstrap) verifyUpgradeBootstrap(memory, bootstrapHarvest);
  if (upgradeCycle) verifyUpgradeCycle(memory);
  if (upgradeLoss) verifyUpgradeLoss(memory);
  if (distributorRecovery) verifyDistributorRecovery(memory);
  if (recoveryBanking) verifyRecoveryBanking(memory);
  if (automaticSupport) verifyAutomaticSupport(memory);
  if (upgradeSupplyTransport) assert.ok(memory.supportTransport.every(row => row.sinkActive === true), 'target storage is available for deposits');
  if (supportTransport) verifySupportTransport(memory, process.argv.includes('--support-loss'), process.argv.includes('--support-reserve-change'));
  if (process.argv.includes('--recovery-scavenger-spawn')) verifyRecoveryScavengerSpawn(memory);
  if (process.argv.includes('--recovery-scavenging')) verifyRecoveryScavenging(memory);
  if (process.argv.includes('--recovery-economy')) verifyRecoveryEconomy(memory);
  if (process.argv.includes('--energy-recovery')) verifyEnergyRecovery(memory);
  if (process.argv.includes('--mixed-workers')) verifyMixedWorkers(memory);
  if (process.argv.includes('--worker-population')) verifyWorkerPopulation(memory);
  if (workerProfile) verifyWorkerProfile(memory, workerProfile);
  if (process.argv.includes('--worker-pickup')) verifyWorkerPickup(memory);
  if (process.argv.includes('--worker-collection')) verifyWorkerCollection(memory);
  if (process.argv.includes('--worker-runtime')) verifyWorkerRuntime(memory);
  if (stampBudget) evidence.stampPlanning = captureStampBudget(memory);
  if (stampLateReset) verifyStampLateReload(memory);
  if (stampBudget) verifyStampBudget(memory, stampLateReset);
  else if (stampFailure) verifyStampFailure(memory);
  else if (stampRoom) verifyStampRoom(memory, autoStampRoom);
  if (stampDraft) verifyStampDraft(memory);
  if (planningRoom) verifyPlanningRoom(memory);
  if (planningBudget) verifyPlanningBudget(memory);
  if (planningRuntime) verifyPlanningRuntime(memory);
  if (planningCpu) verifyPlanningCpu(memory, evidence);
  else if (planningJob) verifyPlanningJob(memory);
  if (constrainedDraftResume) verifyConstrainedDraftResume(memory);
  if (standardDraftResume) verifyStandardDraftResume(memory);
  if (planningCommit) verifyPlanningCommit(memory);
  if (planningRouteResume) verifyPlanningRouteResume(memory, planningRouteReload);
  if (layoutPlacement) verifyLayoutPlacement(memory);
  if (roomAssessment) verifyRoomAssessment(memory);
  if (process.argv.includes('--work-selection')) verifyWorkSelection(memory);
  if (process.argv.includes('--work')) verifyWork(memory);
  if (process.argv.includes('--resources')) verifyResources(memory);
  if (process.argv.includes('--movement')) verifyMovement(memory);
  if (process.argv.includes('--maintenance')) assert.deepEqual(memory.maintenanceEvidence.remaining, [['short', 'long'], ['long'], ['long']]);
  if (process.argv.includes('--retirement')) {
    assert.deepEqual(memory.retirementEvidence, { counts: [2, 1, 1], requested: 0 });
    assert.deepEqual(memory.eldrift.records['units/creeps'].data.units, []);
    assert.deepEqual(memory.eldrift.records['tasks/action-worker'].data.queue, []);
    assert.equal(memory.eldrift.records['reservations/empire'].data.claims[0].holder, 'unrelated');
  }
  if (process.argv.includes('--paths')) assert.deepEqual(memory.pathEvidence, { searches: [1, 1, 2], positions: [[20, 20], [21, 20], [21, 20]], statuses: ['complete', 'complete', 'complete'] });
  if (process.argv.includes('--recovery')) verifyRecovery(memory);
  if (process.argv.includes('--traffic')) verifyTraffic(memory);
  if (process.argv.includes('--exits')) verifyExits(memory);
  if (process.argv.includes('--navigation')) verifyNavigation(memory);
  if (process.argv.includes('--service-recovery')) verifyServiceRecovery(memory);
  if (process.argv.includes('--unseen')) verifyUnseen(memory);
  if (process.argv.includes('--occupied-exit')) verifyOccupiedExit(memory);
  if (process.argv.includes('--spawn')) {
    require('./spawn-placement-check.cjs').verifySpawnPlacement(memory,evidence);
    assert.equal(memory.spawnEvidence.accepted, 1);
    assert.equal(memory.spawnEvidence.observed[0], false);
    assert.equal(memory.spawnEvidence.observed.at(-1), true);
    assert.ok(memory.spawnEvidence.spawning.includes(true));
    assert.equal(memory.spawnEvidence.spawning.at(-1), false);
  }
  if (process.argv.includes('--spawn-contention')) verifyContention(memory,evidence);
  if (process.argv.includes('--mining-storage')) verifyMiningStorage(memory);
  if (process.argv.includes('--mining')) verifyMining(memory);
  if (process.argv.includes('--specialist-mining')) verifySpecialistMining(memory);
  if (process.argv.includes('--colony-mining')) verifyColonyMining(memory);
  if (process.argv.includes('--mineral-depletion')) assert.deepEqual(memory.depletionEvidence, [[0, 0], [1, 0], [0, 1]]);
  if (process.argv.includes('--mining-work')) verifyMiningWork(memory);
  if (process.argv.includes('--mineral-capacity')) assert.deepEqual(memory.depletionEvidence, [[49, 0], [0, 49], [3, 49]]);
  if (process.argv.includes('--colony-mineral')) assert.deepEqual(memory.colonyMineral, { workers: 1, queued: 0, delivered: 1 });
  if (process.argv.includes('--mining-replacement')) verifyMiningReplacement(memory);
  if (process.argv.includes('--mining-saturation')) verifyMiningSaturation(memory, initial);
  if (process.argv.includes('--extractor-fault')) verifyExtractorFault(memory);
  if (process.argv.includes('--mining-interrupted')) verifyInterruptedMining(memory);
  if (process.argv.includes('--transfer-confirmation')) verifyTransferConfirmation(memory);
  if (process.argv.includes('--source-loss')) verifySourceLoss(memory);
  if (process.argv.includes('--preservation-decay')) verifyPreservationDecay(memory);
  if (process.argv.includes('--full-sink')) verifyFullSink(memory);
  if (boostedBuilderMode) verifyBoostedBuilder(memory,boostedBuilderMode,evidence);
  if (workerBoostMode) verifyWorkerBoosts(memory,workerBoostMode,evidence);
  if (boostBulkMode) verifyBoostBulk(memory,boostBulkMode,evidence);
  if (boostRoleMode) verifyBoostRoles(memory,boostRoleMode,evidence);
  if (boostMode) verifyBoosts(memory,boostMode,evidence);
  if (labChainMode) verifyLabChain(memory,labChainMode,evidence);
  if (labEmpire) verifyLabEmpire(memory,evidence,labEmpireMode);
  if (labSupplyMode) verifyLabSupply(memory,labSupplyMode,evidence);
  if (labReactionMode) verifyLabReactions(memory,labReactionMode,evidence);
  if (process.argv.includes('--final-delivery')) verifyFinalDelivery(memory);
  if (process.argv.includes('--expiry-delivery')) verifyExpiryDelivery(memory);
  if (process.argv.includes('--mineral-recovery') || process.argv.includes('--mineral-recovery-fallback')) verifyMineralRecovery(memory, process.argv.includes('--mineral-recovery-fallback'));
  if (process.argv.includes('--mineral-reload')) verifyMineralReload(memory, initial);
  if (process.argv.includes('--banking-demand')) verifyBankingDemand(memory);
  if (storeBalanceMode) verifyStoreBalance(memory, storeBalanceMode);
  if ((process.argv.includes('--energy-banking') || process.argv.includes('--banking-fallback'))) verifyEnergyBanking(memory, process.argv.includes('--banking-fallback'));
  if (process.argv.includes('--storage-loss')) verifyStorageLoss(memory);
  if (process.argv.includes('--cargo-death')) verifyCargoDeath(memory);
  if (process.argv.includes('--courier-death')) verifyCourierDeath(memory);
  if ((process.argv.includes('--mineral-transport') || process.argv.includes('--mineral-reload'))) verifyMineralTransport(memory);
  if (process.argv.includes('--link-reversal')) verifyLinkReversal(memory);
  if (process.argv.includes('--link-service')) verifyLinkService(memory);
  if (process.argv.includes('--link-contention')) verifyLinkContention(memory);
  if (process.argv.includes('--controller-links')) verifyControllerLinks(memory);
  if (process.argv.includes('--link-supply')) verifyLinkSupply(memory);
  if (process.argv.includes('--tower-supply')) verifyTowerSupply(memory);
  if (process.argv.includes('--preservation')) verifyPreservation(memory);
  if (process.argv.includes('--large-drop')) verifyLargeDrop(memory);
  if (process.argv.includes('--drop-supply')) verifyDropSupply(memory);
  if (process.argv.includes('--remains-supply')) verifyRemainsSupply(memory);
  if (process.argv.includes('--pickup-admission')) verifyPickupAdmission(memory);
  if (process.argv.includes('--missing-sink')) verifyMissingSink(memory);
  if (process.argv.includes('--unknown-delivery')) verifyUnknownDelivery(memory);
  if (process.argv.includes('--unknown-recovery')) verifyCargoRecovery(memory, false, true);
  if (process.argv.includes('--expiry-recovery')) verifyCargoRecovery(memory, true);
  if (process.argv.includes('--cargo-recovery')) verifyCargoRecovery(memory);
  if (process.argv.includes('--empty-source')) verifyEmptySource(memory);
  if (process.argv.includes('--colony-economy')) verifyColonyEconomy(memory, initial);
  if (process.argv.includes('--mineral-routes')) verifyMineralFleet(memory);
  if (process.argv.includes('--courier-routes') || process.argv.includes('--mineral-routes')) verifyCourierRoutes(memory);
  if (process.argv.includes('--courier-bootstrap')) verifyCourierBootstrap(memory);
  if (process.argv.includes('--work-supply')) verifyWorkSupply(memory);
  if (process.argv.includes('--reclamation')) verifyReclamation(memory);
  if (process.argv.includes('--energy-logistics')) verifyEnergyLogistics(memory);
  if (process.argv.includes('--fixed-hauling')) verifyFixedHauling(memory,evidence);
  if (process.argv.includes('--hauling-cycle')) verifyHaulingCycle(memory);
  assert.deepEqual(messages, artRegion ? ['Art region W0N1: expected-one-BL-and-one-TR; barrier repairs suspended'] : []);
  const report = { provenance: provenance(root, modules.main), samples, ticks: tickCount, initial, final: Number(await server.world.gameTime), memoryBytes: Buffer.byteLength(JSON.stringify(memory)), directory };
  fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  clearTimeout(timeout);
  finish(0);
})().catch(error => { console.error(error); clearTimeout(timeout); finish(1, error); });

import { expect, test } from 'vitest';
import { selectWork } from '../../src/features/work/select';
import { defaultWorkPolicy } from '../../src/features/work/policy';
import type { WorkAssessment, WorkStructure } from '../../src/capabilities/work/assessment';
const position = (x = 10) => ({ room: 'home', x, y: 10 });
const structure = (id: string, type: string, hits: number, x = 10): WorkStructure => ({ id, type, hits, maximum: 100000,
  position: position(x), eligible: true, excluded: false });
const view = (): WorkAssessment => ({ sites: [{ id: 'site', type: 'road', position: position(), progress: 0, total: 300, ready: true }],
  structures: [structure('road', 'road', 10000)], controller: { id: 'controller', position: position(), owned: true, level: 4, downgrade: 20000 } });
const select = (assessment: WorkAssessment, current?: string) => selectWork(assessment, position(), 'builder', defaultWorkPolicy, current);
test('downgrade prevention preempts a retained repair even when ordinary upgrading is suppressed', () => {
  const assessment = view();
  assessment.controller!.downgrade = 4999;
  expect(selectWork(assessment, position(), 'builder', { ...defaultWorkPolicy, allowUpgrade: false }, 'road')).toMatchObject({ kind: 'upgrade', priority: 0 });
  assessment.controller!.downgrade = 5000;
  expect(select(assessment)?.id).toBe('road');
});
test('critical repair, dependency-ready construction and routine repair have distinct priorities', () => {
  const assessment = view();
  expect(select(assessment)).toMatchObject({ id: 'road', targetHits: 80000 });
  assessment.structures[0]!.hits = 20000;
  expect(select(assessment)?.id).toBe('site');
  assessment.sites[0]!.ready = false;
  expect(select(assessment)?.id).toBe('road');
  assessment.structures[0]!.hits = 80000;
  expect(select(assessment)?.kind).toBe('upgrade');
});
test('construction type priority is configurable and current same-tier targets remain stable', () => {
  const assessment = view(); assessment.structures = [];
  assessment.sites = [...assessment.sites, { ...assessment.sites[0]!, id: 'spawn', type: 'spawn', position: position(40) }];
  expect(select(assessment)?.id).toBe('spawn');
  expect(select(assessment, 'site')?.id).toBe('site');
  expect(selectWork(assessment, position(), 'builder', { ...defaultWorkPolicy, constructionOrder: ['road', 'spawn'] })?.id).toBe('site');
});
test('fortifiers weigh weakness against distance, respect exclusions and cap requested repair hits', () => {
  const assessment: WorkAssessment = { sites: [], structures: [structure('near', 'constructedWall', 30000), structure('far', 'rampart', 100, 12)] };
  expect(selectWork(assessment, position(), 'fortifier', defaultWorkPolicy)?.id).toBe('near');
  assessment.structures[0]!.excluded = true;
  assessment.structures[1]!.maximum = 40000;
  expect(selectWork(assessment, position(), 'fortifier', defaultWorkPolicy)).toMatchObject({ id: 'far', targetHits: 40000 });
  assessment.structures[1]!.eligible = false;
  expect(selectWork(assessment, position(), 'fortifier', defaultWorkPolicy)).toBeUndefined();
});
test('builders prefer ramparts before walls; upgraders ignore unrelated build/repair work', () => {
  const assessment = view(); assessment.sites = [];
  assessment.structures = [structure('wall', 'constructedWall', 1), structure('rampart', 'rampart', 40000)];
  expect(select(assessment)?.id).toBe('rampart');
  expect(selectWork(assessment, position(), 'upgrader', defaultWorkPolicy)?.id).toBe('controller');
  assessment.controller!.level = 8;
  assessment.structures = [];
  expect(select(assessment)).toBeUndefined();
  expect(selectWork(assessment, position(), 'upgrader', defaultWorkPolicy)?.kind).toBe('upgrade');
});
test('foreign controllers and out-of-room targets cannot be selected, and invalid thresholds fail fast', () => {
  const assessment = view(); assessment.controller!.owned = false;
  assessment.sites[0]!.position.room = 'away'; assessment.structures[0]!.position.room = 'away';
  expect(select(assessment)).toBeUndefined();
  expect(() => selectWork(assessment, position(), 'builder', { ...defaultWorkPolicy, criticalRepairFraction: 0.9 })).toThrow('threshold');
});

test('builder weak-wall tier beats distance and preempts a retained healthier wall at the strict half boundary', () => {
  const assessment: WorkAssessment = { sites: [], structures: [
    structure('near', 'constructedWall', 25000),
    structure('far', 'constructedWall', 24999, 40),
  ] };
  expect(select(assessment, 'near')?.id).toBe('far');
  assessment.structures[1]!.hits = 25000;
  expect(select(assessment)?.id).toBe('near');
  assessment.structures[0]!.hits = 50000;
  assessment.structures[1]!.hits = 50000;
  expect(select(assessment)).toBeUndefined();
});

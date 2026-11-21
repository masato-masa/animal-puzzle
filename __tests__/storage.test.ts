import { beforeEach, describe, expect, test } from 'vitest';

import type { Stage } from '@/engine';
import { deleteCustomStage, getCustomStage, listCustomStages, saveCustomStage } from '@/storage/custom-stages';
import { clearProgress, hasClearedStage, loadProgress, recordClear } from '@/storage/progress';

const stage = (id: string): Stage => ({
  id,
  name: id,
  rows: 2,
  cols: 2,
  terrain: [
    ['land', 'land'],
    ['land', 'land'],
  ],
  animals: [{ instanceId: 's1', species: 'squirrel' }],
});

beforeEach(() => {
  localStorage.clear();
});

describe('progress', () => {
  test('何も保存していなければ空で返る', async () => {
    expect(await loadProgress()).toEqual({ clearedStageIds: [] });
  });

  test('クリアを記録して読み戻せる', async () => {
    await recordClear('stage-1');
    expect(await hasClearedStage('stage-1')).toBe(true);
    expect(await hasClearedStage('stage-2')).toBe(false);
  });

  test('同じステージを二重に記録しない', async () => {
    await recordClear('stage-1');
    await recordClear('stage-1');
    expect((await loadProgress()).clearedStageIds).toEqual(['stage-1']);
  });

  test('消せる', async () => {
    await recordClear('stage-1');
    await clearProgress();
    expect((await loadProgress()).clearedStageIds).toEqual([]);
  });

  test('番号の入れ替え（AP-13・AP-16）の前の保存は、20〜40 面を新番号へ一度だけ直す', async () => {
    localStorage.setItem('animal-puzzle:progress:v2', JSON.stringify({ clearedStageIds: ['stage-1', 'stage-19', 'stage-20', 'stage-29', 'stage-40'] }));
    // 旧 20 →(AP-13) 25 →(AP-16) 23、旧 29 →(AP-13) 20 →(AP-16) 21
    const expected = ['stage-1', 'stage-19', 'stage-23', 'stage-21', 'stage-40'];
    expect((await loadProgress()).clearedStageIds.sort()).toEqual([...expected].sort());
    // 二度目に読んでも動かない
    expect((await loadProgress()).clearedStageIds.sort()).toEqual([...expected].sort());
    await recordClear('stage-30');
    expect(await hasClearedStage('stage-30')).toBe(true);
    expect((await loadProgress()).clearedStageIds).toContain('stage-23');
  });

  test('AP-13 の並びで保存された分（order: ap13）は AP-16 の表だけ通す', async () => {
    localStorage.setItem('animal-puzzle:progress:v2', JSON.stringify({ clearedStageIds: ['stage-25', 'stage-31'], order: 'ap13' }));
    expect((await loadProgress()).clearedStageIds.sort()).toEqual(['stage-23', 'stage-31'].sort());
  });

  test('壊れた JSON が入っていても落ちない', async () => {
    localStorage.setItem('animal-puzzle:progress:v2', '{ではない');
    expect(await loadProgress()).toEqual({ clearedStageIds: [] });
  });

  test('clearedStageIds が配列でなくても落ちない', async () => {
    localStorage.setItem('animal-puzzle:progress:v2', '{"clearedStageIds":"stage-1"}');
    expect(await loadProgress()).toEqual({ clearedStageIds: [] });
  });
});

describe('custom stages', () => {
  test('保存して一覧に出る', async () => {
    await saveCustomStage(stage('custom-1'));
    expect((await listCustomStages()).map((s) => s.id)).toEqual(['custom-1']);
  });

  test('ID を指定して1件取れる', async () => {
    await saveCustomStage(stage('custom-1'));
    expect((await getCustomStage('custom-1'))?.id).toBe('custom-1');
    expect(await getCustomStage('custom-2')).toBeUndefined();
  });

  test('同じ ID は上書きされ、重複しない', async () => {
    await saveCustomStage(stage('custom-1'));
    await saveCustomStage({ ...stage('custom-1'), name: '書き換え後' });
    const list = await listCustomStages();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('書き換え後');
  });

  test('消せる', async () => {
    await saveCustomStage(stage('custom-1'));
    await deleteCustomStage('custom-1');
    expect(await listCustomStages()).toEqual([]);
  });

  test('壊れた JSON が入っていても落ちない', async () => {
    localStorage.setItem('animal-puzzle:custom-stages:v1', 'null');
    expect(await listCustomStages()).toEqual([]);
  });
});

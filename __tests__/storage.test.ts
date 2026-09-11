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

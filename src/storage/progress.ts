import { readJson, removeKey, writeJson } from './local';

/** v2: 出荷ステージを全面差し替えた際に stage-N の ID が旧内容と衝突したため、
 * 進捗を確実にリセットする目的でキーを上げてある。 */
const KEY = 'animal-puzzle:progress:v2';

type ProgressData = { clearedStageIds: string[] };

/** localStorage は同期だが、呼び出し側の形を変えないため async のまま保つ。 */
const load = async (): Promise<ProgressData> => {
  const data = readJson<Partial<ProgressData>>(KEY, {});
  return { clearedStageIds: Array.isArray(data.clearedStageIds) ? data.clearedStageIds : [] };
};

export const loadProgress = load;

export const hasClearedStage = async (stageId: string): Promise<boolean> =>
  (await load()).clearedStageIds.includes(stageId);

export const recordClear = async (stageId: string): Promise<void> => {
  const data = await load();
  if (data.clearedStageIds.includes(stageId)) return;
  writeJson(KEY, { clearedStageIds: [...data.clearedStageIds, stageId] });
};

export const clearProgress = async (): Promise<void> => {
  removeKey(KEY);
};

/**
 * 出荷ステージを一括でクリア済みにする。動作確認用で、開発者メニューからだけ呼ぶ。
 * 自作ステージの記録には触らない（別のキーで持っているため、ここでは何もしない）。
 */
export const unlockAllForTesting = async (): Promise<void> => {
  const { STAGES } = await import('@/levels/stages');
  writeJson(KEY, { clearedStageIds: STAGES.map((s) => s.id) });
};

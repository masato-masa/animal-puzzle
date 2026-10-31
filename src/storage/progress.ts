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
  removeKey(ENDLESS_KEY);
};

// --- むげん ---------------------------------------------------------------

/** むげんは番号が続くだけなので、クリアした最大の番号だけを持つ。 */
const ENDLESS_KEY = 'animal-puzzle:endless:v1';

type EndlessData = { cleared: number };

const loadEndless = (): EndlessData => {
  const data = readJson<Partial<EndlessData>>(ENDLESS_KEY, {});
  const cleared = typeof data.cleared === 'number' && Number.isFinite(data.cleared) ? Math.max(0, Math.floor(data.cleared)) : 0;
  return { cleared };
};

/** クリアした最大の面の番号（まだなら 0）。 */
export const loadEndlessCleared = async (): Promise<number> => loadEndless().cleared;

/** n 面をクリアしたと記録する。前より小さい番号を遊び直しても戻さない。 */
export const recordEndlessClear = async (n: number): Promise<void> => {
  if (n <= loadEndless().cleared) return;
  writeJson(ENDLESS_KEY, { cleared: n });
};

/**
 * 出荷ステージを一括でクリア済みにする。動作確認用で、開発者メニューからだけ呼ぶ。
 * 自作ステージの記録には触らない（別のキーで持っているため、ここでは何もしない）。
 */
export const unlockAllForTesting = async (): Promise<void> => {
  const { STAGES } = await import('@/levels/stages');
  writeJson(KEY, { clearedStageIds: STAGES.map((s) => s.id) });
};

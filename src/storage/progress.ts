import { readJson, removeKey, writeJson } from './local';

/** v2: 出荷ステージを全面差し替えた際に stage-N の ID が旧内容と衝突したため、
 * 進捗を確実にリセットする目的でキーを上げてある。 */
const KEY = 'animal-puzzle:progress:v2';

type ProgressData = { clearedStageIds: string[] };

/**
 * 出荷ステージの番号が入れ替わったとき（AP-13・AP-16）の移行。保存データの order に、どこまで移行したかを残す。
 * order が無い = AP-13 より前、'ap13' = AP-13 の並び、'ap16' = 今の並び。読むときに一度だけ新しい番号へ直して書き戻す。
 * 各表は「新しい番号 → その番号に入った（前の並びでの）番号」。
 */
const ORDER_NOW = 'ap16';
const toMap = (o3: number[], o4: number[]): Record<number, number> => {
  const m: Record<number, number> = {};
  o3.forEach((prev, k) => {
    m[prev] = 20 + k;
  });
  o4.forEach((prev, k) => {
    m[prev] = 31 + k;
  });
  return m;
};
/** AP-13 より前 → AP-13 の並び */
const MAP_AP13 = toMap([29, 30, 22, 23, 28, 20, 24, 21, 27, 25, 26], [39, 38, 33, 34, 32, 37, 31, 35, 36, 40]);
/** AP-13 の並び → AP-16 の並び */
const MAP_AP16 = toMap([21, 20, 26, 25, 24, 22, 23, 28, 27, 30, 29], [31, 32, 34, 33, 38, 39, 37, 35, 36, 40]);

const remap = (ids: string[], map: Record<number, number>): string[] =>
  Array.from(
    new Set(
      ids.map((id) => {
        const m = /^stage-(\d+)$/.exec(id);
        const to = m ? map[Number(m[1])] : undefined;
        return to ? `stage-${to}` : id;
      })
    )
  );

/** order に応じて、今の並びの番号に直す。 */
export const migrateClearedIds = (ids: string[], order?: string): string[] => {
  if (order === ORDER_NOW) return ids;
  if (order === 'ap13') return remap(ids, MAP_AP16);
  return remap(remap(ids, MAP_AP13), MAP_AP16);
};

const write = (ids: string[]): void => {
  writeJson(KEY, { clearedStageIds: ids, order: ORDER_NOW });
};

/** localStorage は同期だが、呼び出し側の形を変えないため async のまま保つ。 */
const load = async (): Promise<ProgressData> => {
  const data = readJson<Partial<ProgressData> & { order?: string }>(KEY, {});
  let ids = Array.isArray(data.clearedStageIds) ? data.clearedStageIds : [];
  if (ids.length > 0 && data.order !== ORDER_NOW) {
    ids = migrateClearedIds(ids, data.order);
    write(ids);
  }
  return { clearedStageIds: ids };
};

export const loadProgress = load;

export const hasClearedStage = async (stageId: string): Promise<boolean> =>
  (await load()).clearedStageIds.includes(stageId);

export const recordClear = async (stageId: string): Promise<void> => {
  const data = await load();
  if (data.clearedStageIds.includes(stageId)) return;
  write([...data.clearedStageIds, stageId]);
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
  write(STAGES.map((s) => s.id));
};

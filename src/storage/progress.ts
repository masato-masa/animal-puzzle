import AsyncStorage from '@react-native-async-storage/async-storage';

/** v2: 分割3で出荷ステージを全面差し替えたため、stage-1〜stage-10のIDが旧内容と
 * 衝突する（同じIDが別のパズルを指すようになった）。旧v1のまま出荷すると、
 * 既プレイヤーが新パズルを開いた瞬間に「未プレイなのにクリア済み」と表示されて
 * しまうため、キーをバージョンアップして進捗を確実にリセットする。 */
const KEY = 'animal-puzzle:progress:v2';

type ProgressData = { clearedStageIds: string[] };

const load = async (): Promise<ProgressData> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { clearedStageIds: [] };
    const parsed = JSON.parse(raw);
    return { clearedStageIds: Array.isArray(parsed.clearedStageIds) ? parsed.clearedStageIds : [] };
  } catch {
    return { clearedStageIds: [] };
  }
};

export const loadProgress = load;

export const hasClearedStage = async (stageId: string): Promise<boolean> => {
  const data = await load();
  return data.clearedStageIds.includes(stageId);
};

export const recordClear = async (stageId: string): Promise<void> => {
  const data = await load();
  if (data.clearedStageIds.includes(stageId)) return;
  const next: ProgressData = { clearedStageIds: [...data.clearedStageIds, stageId] };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
};

export const clearProgress = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEY);
};

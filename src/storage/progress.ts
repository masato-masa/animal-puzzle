import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'animal-puzzle:progress:v1';

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

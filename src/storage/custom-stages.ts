import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Stage } from '@/engine';

const KEY = 'animal-puzzle:custom-stages:v1';

const load = async (): Promise<Stage[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const listCustomStages = load;

export const getCustomStage = async (id: string): Promise<Stage | undefined> => {
  const stages = await load();
  return stages.find((s) => s.id === id);
};

export const saveCustomStage = async (stage: Stage): Promise<void> => {
  const stages = await load();
  const next = [...stages.filter((s) => s.id !== stage.id), stage];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
};

export const deleteCustomStage = async (id: string): Promise<void> => {
  const stages = await load();
  await AsyncStorage.setItem(KEY, JSON.stringify(stages.filter((s) => s.id !== id)));
};

export const generateCustomStageId = (): string =>
  `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

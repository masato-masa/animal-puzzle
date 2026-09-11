import type { Stage } from '@/engine';

import { readJson, writeJson } from './local';
import { migrateStageTerrain } from './migrate-stage';

const KEY = 'animal-puzzle:custom-stages:v1';

const load = async (): Promise<Stage[]> => {
  const raw = readJson<unknown>(KEY, []);
  return Array.isArray(raw) ? (raw as Stage[]).map(migrateStageTerrain) : [];
};

export const listCustomStages = load;

export const getCustomStage = async (id: string): Promise<Stage | undefined> =>
  (await load()).find((s) => s.id === id);

export const saveCustomStage = async (stage: Stage): Promise<void> => {
  const stages = await load();
  writeJson(KEY, [...stages.filter((s) => s.id !== stage.id), stage]);
};

export const deleteCustomStage = async (id: string): Promise<void> => {
  const stages = await load();
  writeJson(
    KEY,
    stages.filter((s) => s.id !== id)
  );
};

export const generateCustomStageId = (): string =>
  `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

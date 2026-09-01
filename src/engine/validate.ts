import type { AnimalDef, Species, Stage, Terrain } from './types';
import { SPECIES } from './species';
import { SHAPES } from './shapes';

const TERRAINS: Terrain[] = ['land', 'water', 'sky'];

/** v1では「配置可能なパターンが1通り」を狙いやすくするため、1ステージあたりの動物数の上限を設ける。 */
export const MAX_ANIMALS_PER_STAGE = 5;

export const validateStage = (stage: Stage): string[] => {
  const errors: string[] = [];
  const label = `[${stage.id}]`;

  if (stage.rows < 5 || stage.rows > 8 || stage.cols < 5 || stage.cols > 8) {
    errors.push(`${label} board size out of range: ${stage.rows}x${stage.cols}`);
  }
  if (stage.terrain.length !== stage.rows || stage.terrain.some((row) => row.length !== stage.cols)) {
    errors.push(`${label} terrain grid shape does not match rows/cols`);
  }
  if (stage.animals.length > MAX_ANIMALS_PER_STAGE) {
    errors.push(`${label} too many animals: ${stage.animals.length} (max ${MAX_ANIMALS_PER_STAGE})`);
  }
  if (stage.animals.length === 0) {
    errors.push(`${label} stage has no animals`);
  }

  const seen = new Set<string>();
  for (const a of stage.animals) {
    if (seen.has(a.instanceId)) errors.push(`${label} duplicate instanceId: ${a.instanceId}`);
    seen.add(a.instanceId);
    if (!SPECIES[a.species]) errors.push(`${label} unknown species: ${a.species}`);
  }

  const terrainCounts: Record<Terrain, number> = { land: 0, water: 0, sky: 0 };
  let totalPlaceableCells = 0;
  for (const row of stage.terrain) {
    for (const t of row) {
      if (t === 'void' || t === 'wall') continue;
      terrainCounts[t]++;
      totalPlaceableCells++;
    }
  }

  const requiredCounts: Record<Terrain, number> = { land: 0, water: 0, sky: 0 };
  let totalRequiredCells = 0;
  for (const a of stage.animals) {
    const def = SPECIES[a.species];
    if (!def) continue;
    const size = SHAPES[def.shape]?.length ?? 0;
    requiredCounts[def.terrain] += size;
    totalRequiredCells += size;
  }

  TERRAINS.forEach((t) => {
    if (terrainCounts[t] !== requiredCounts[t]) {
      errors.push(`${label} terrain "${t}" cell count (${terrainCounts[t]}) != required (${requiredCounts[t]})`);
    }
  });

  if (totalPlaceableCells !== totalRequiredCells) {
    errors.push(
      `${label} placeable cell count (${totalPlaceableCells}) != total animal cell count (${totalRequiredCells})`
    );
  }

  const speciesCount = new Map<Species, number>();
  for (const a of stage.animals) speciesCount.set(a.species, (speciesCount.get(a.species) ?? 0) + 1);
  for (const [species, def] of Object.entries(SPECIES) as [Species, AnimalDef][]) {
    const count = speciesCount.get(species) ?? 0;
    if (count === 0) continue;
    for (const c of def.conditions) {
      if (c.kind === 'flockRequired' && count < 2) {
        errors.push(`${label} ${species} has flockRequired but fewer than 2 instances in stage`);
      }
      if (c.kind === 'symbiosisRequired' && !speciesCount.get(c.with)) {
        errors.push(`${label} ${species} has symbiosisRequired(${c.with}) but no ${c.with} in stage`);
      }
    }
  }

  return errors;
};

export const assertValidStage = (stage: Stage): void => {
  const errors = validateStage(stage);
  if (errors.length > 0) throw new Error(errors.join('\n'));
};

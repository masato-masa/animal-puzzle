import type { AnimalDef, Species, SpeciesCondition, Stage } from './types';

/**
 * 種同士の隣接禁止・距離制約は、判定（isAnimalSatisfied/violatingAnimals）が
 * 「配置済みの各動物が自分の条件を満たすか」を個別にチェックする仕組みのため、
 * ペアのどちらか片方にだけ条件を持たせれば十分（片方が違反していればクリア扱いに
 * ならない）。同じ制約を両側に重複して書かない。
 */
export const SPECIES: Record<Species, AnimalDef> = {
  squirrel: {
    species: 'squirrel',
    shape: 'single',
    conditions: [{ kind: 'adjacentForbidden', with: 'lion' }],
  },
  zebra: {
    species: 'zebra',
    shape: 'domino_h',
    conditions: [{ kind: 'adjacentForbidden', with: 'lion' }],
  },
  lion: {
    species: 'lion',
    shape: 'domino_v',
    conditions: [{ kind: 'adjacentForbidden', with: 'lion' }],
  },
  giraffe: {
    species: 'giraffe',
    shape: 'domino_v',
    conditions: [{ kind: 'adjacentForbidden', with: 'lion' }],
  },
  elephant: {
    species: 'elephant',
    shape: 'square2x2',
    conditions: [
      { kind: 'adjacentForbidden', with: 'squirrel' },
      { kind: 'adjacentForbidden', with: 'monkey' },
    ],
  },
  crocodile: {
    species: 'crocodile',
    shape: 'domino_h',
    conditions: [{ kind: 'blockAdjacentRequired', block: 'water' }],
  },
  oxpecker: {
    species: 'oxpecker',
    shape: 'single',
    conditions: [{ kind: 'adjacentRequired', with: 'giraffe' }],
  },
  monkey: {
    species: 'monkey',
    shape: 'single',
    conditions: [
      { kind: 'flockRequired' },
      { kind: 'adjacentForbidden', with: 'leopard' },
    ],
  },
  leopard: {
    species: 'leopard',
    shape: 'domino_v',
    conditions: [
      { kind: 'adjacentForbidden', with: 'leopard' },
      { kind: 'adjacentForbidden', with: 'squirrel' },
    ],
  },
  rhino: {
    species: 'rhino',
    shape: 'square2x2',
    conditions: [{ kind: 'minDistance', from: 'rhino', distance: 3 }],
  },
  gorilla: {
    species: 'gorilla',
    shape: 'square2x2',
    conditions: [{ kind: 'blockAdjacentRequired', block: 'tree' }],
  },
};

/**
 * この種がこのステージで実際に使う条件の一覧を返す。stage.animalRulesが指定されている
 * ステージでは、その種の条件はstage.animalRules[species]の1つだけ(無ければ0個)になり、
 * AnimalDef.conditions(種に紐づく固定の性格)は完全に無視される。stage.animalRulesが
 * 未指定のステージでは、従来どおりAnimalDef.conditionsをそのまま使う。
 */
export const conditionsFor = (stage: Stage, species: Species): SpeciesCondition[] => {
  if (stage.animalRules) {
    const rule = stage.animalRules[species];
    return rule ? [rule] : [];
  }
  return SPECIES[species].conditions;
};

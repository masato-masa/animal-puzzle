import type { AnimalDef, Species } from './types';

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
    conditions: [],
  },
  zebra: {
    species: 'zebra',
    shape: 'domino_h',
    conditions: [{ kind: 'adjacentForbidden', with: 'lion' }],
  },
  lion: {
    species: 'lion',
    shape: 'domino_v',
    conditions: [],
  },
  giraffe: {
    species: 'giraffe',
    shape: 'domino_v',
    conditions: [
      { kind: 'adjacentForbidden', with: 'lion' },
      { kind: 'adjacentForbidden', with: 'crocodile' },
    ],
  },
  elephant: {
    species: 'elephant',
    shape: 'square2x2',
    conditions: [],
  },
  crocodile: {
    species: 'crocodile',
    shape: 'domino_h',
    conditions: [{ kind: 'adjacentForbidden', with: 'giraffe' }],
  },
  oxpecker: {
    species: 'oxpecker',
    shape: 'single',
    conditions: [{ kind: 'adjacentRequired', with: 'giraffe' }],
  },
};

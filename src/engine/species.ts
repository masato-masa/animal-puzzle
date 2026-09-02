import type { AnimalDef, Species } from './types';

/**
 * ワニは常にwater地形にしか存在しないため、「キリンはワニに隣接不可」は
 * 元仕様の「ワニがいる水場にキリンは隣接不可」と数学的に同値。
 * 地形を意識した特殊ロジックは不要で、種同士のadjacentForbiddenで表現できる。
 *
 * 種同士の隣接禁止・距離制約は、判定（isAnimalSatisfied/violatingAnimals）が
 * 「配置済みの各動物が自分の条件を満たすか」を個別にチェックする仕組みのため、
 * ペアのどちらか片方にだけ条件を持たせれば十分（片方が違反していればクリア扱いに
 * ならない）。同じ制約を両側に重複して書かない。
 */
export const SPECIES: Record<Species, AnimalDef> = {
  squirrel: {
    species: 'squirrel',
    terrain: 'land',
    shape: 'single',
    conditions: [],
  },
  zebra: {
    species: 'zebra',
    terrain: 'land',
    shape: 'domino_h',
    conditions: [{ kind: 'adjacentForbidden', with: 'lion' }],
  },
  lion: {
    species: 'lion',
    terrain: 'land',
    shape: 'domino_v',
    conditions: [],
  },
  giraffe: {
    species: 'giraffe',
    terrain: 'land',
    shape: 'domino_v',
    conditions: [
      { kind: 'adjacentForbidden', with: 'lion' },
      { kind: 'adjacentForbidden', with: 'crocodile' },
    ],
  },
  elephant: {
    species: 'elephant',
    terrain: 'land',
    shape: 'square2x2',
    conditions: [],
  },
  crocodile: {
    species: 'crocodile',
    terrain: 'water',
    shape: 'domino_h',
    conditions: [{ kind: 'adjacentForbidden', with: 'giraffe' }],
  },
  oxpecker: {
    species: 'oxpecker',
    terrain: 'sky',
    shape: 'single',
    conditions: [{ kind: 'symbiosisRequired', with: 'giraffe' }],
  },
};

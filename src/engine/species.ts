import type { AnimalDef, Species } from './types';

/** ライオン・キリンの間で維持すべき最小マンハッタン距離。プレイテストで調整可能。 */
export const LION_GIRAFFE_MIN_DISTANCE = 3;

/**
 * ワニは常にwater地形にしか存在しないため、「キリンはワニに隣接不可」は
 * 元仕様の「ワニがいる水場にキリンは隣接不可」と数学的に同値。
 * 地形を意識した特殊ロジックは不要で、種同士のadjacentForbiddenで表現できる。
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
    conditions: [
      { kind: 'adjacentForbidden', with: 'lion' },
      { kind: 'flockRequired' },
    ],
  },
  lion: {
    species: 'lion',
    terrain: 'land',
    shape: 'domino_v',
    conditions: [
      { kind: 'adjacentForbidden', with: 'zebra' },
      { kind: 'minDistance', from: 'giraffe', distance: LION_GIRAFFE_MIN_DISTANCE },
    ],
  },
  giraffe: {
    species: 'giraffe',
    terrain: 'land',
    shape: 'domino_v',
    conditions: [
      { kind: 'minDistance', from: 'lion', distance: LION_GIRAFFE_MIN_DISTANCE },
      { kind: 'adjacentForbidden', with: 'crocodile' },
    ],
  },
  elephant: {
    species: 'elephant',
    terrain: 'land',
    shape: 'square2x2',
    conditions: [{ kind: 'flockRequired' }],
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

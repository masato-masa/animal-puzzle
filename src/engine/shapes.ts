import type { Pos, ShapeCell, ShapeKey, Species } from './types';
import { SPECIES } from './species';

/** 名前付き形状レジストリ。動物定義(AnimalDef)はこのキーを1つ参照する。 */
export const SHAPES: Record<ShapeKey, ShapeCell[]> = {
  single: [{ dr: 0, dc: 0 }],
  domino_h: [
    { dr: 0, dc: 0 },
    { dr: 0, dc: 1 },
  ],
  domino_v: [
    { dr: 0, dc: 0 },
    { dr: 1, dc: 0 },
  ],
  square2x2: [
    { dr: 0, dc: 0 },
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
  ],
};

export const shapeCells = (species: Species, anchor: Pos): Pos[] =>
  SHAPES[SPECIES[species].shape].map((s) => ({ r: anchor.r + s.dr, c: anchor.c + s.dc }));

export const boundingBox = (species: Species): { w: number; h: number } => {
  const shape = SHAPES[SPECIES[species].shape];
  return {
    w: Math.max(...shape.map((s) => s.dc)) + 1,
    h: Math.max(...shape.map((s) => s.dr)) + 1,
  };
};

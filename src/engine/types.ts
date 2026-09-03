export type Species =
  | 'lion'
  | 'zebra'
  | 'giraffe'
  | 'elephant'
  | 'crocodile'
  | 'oxpecker'
  | 'squirrel';

/** 動物を置けないブロック。盤面の仕切りであり、一部は条件から参照される。 */
export type BlockKind = 'wall' | 'water' | 'tree';

/** 条件から参照できるブロック。草むら(wall)は純粋な仕切りなので含めない。 */
export type ConditionBlock = Exclude<BlockKind, 'wall'>;

/**
 * 盤面グリッド上のセル種別。'land'だけが動物を置けるマスで、ブロックと'void'には
 * 一切置けない＝隣接判定にも関与しない（ブロックを参照する条件を除く）。
 * 'void'は盤面の外側で「マスが存在しない」ことを表す。
 */
export type CellTerrain = 'land' | BlockKind | 'void';

export type ShapeCell = { dr: number; dc: number };
export type ShapeKey = 'single' | 'domino_h' | 'domino_v' | 'square2x2';

/** 動物の性格。全ステージで共通に適用される。 */
export type SpeciesCondition =
  | { kind: 'adjacentForbidden'; with: Species }
  | { kind: 'adjacentRequired'; with: Species }
  | { kind: 'minDistance'; from: Species; distance: number }
  | { kind: 'flockRequired' }
  | { kind: 'diagonalForbidden'; with: Species }
  | { kind: 'surroundForbidden'; with: Species }
  | { kind: 'blockAdjacentRequired'; block: ConditionBlock }
  | { kind: 'blockAdjacentForbidden'; block: ConditionBlock };

export type AnimalDef = {
  species: Species;
  shape: ShapeKey;
  conditions: SpeciesCondition[];
};

export type AnimalInstance = { instanceId: string; species: Species };

export type Pos = { r: number; c: number };

export type PlacedAnimal = AnimalInstance & { anchor: Pos; cells: Pos[] };

/**
 * そのステージだけに効く出題側のルール。動物の性格(SpeciesCondition)と違い、
 * 種のペアに対して指定し、種Aの全個体と種Bの全個体の全ペアで成立を要求する。
 * 「下」「右」は above / leftOf の引数を入れ替えたものと同値なので用意しない。
 */
export type StageRule =
  | { kind: 'above'; a: Species; b: Species }
  | { kind: 'leftOf'; a: Species; b: Species }
  | { kind: 'sameRow'; a: Species; b: Species }
  | { kind: 'sameCol'; a: Species; b: Species }
  | { kind: 'differentRow'; a: Species; b: Species }
  | { kind: 'differentCol'; a: Species; b: Species }
  | { kind: 'exactDistance'; a: Species; b: Species; distance: number };

export type Stage = {
  id: string;
  name: string;
  rows: number;
  cols: number;
  terrain: CellTerrain[][];
  animals: AnimalInstance[];
  rules?: StageRule[];
};

export type GameState = {
  stage: Stage;
  placed: PlacedAnimal[];
  tray: AnimalInstance[];
};

export const posKey = (p: Pos): string => `${p.r},${p.c}`;
export const posEq = (a: Pos, b: Pos): boolean => a.r === b.r && a.c === b.c;
export const manhattan = (a: Pos, b: Pos): number => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
export const isAdjacent = (a: Pos, b: Pos): boolean => manhattan(a, b) === 1;

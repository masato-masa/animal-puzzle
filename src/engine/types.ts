export type Species =
  | 'lion'
  | 'zebra'
  | 'giraffe'
  | 'elephant'
  | 'crocodile'
  | 'oxpecker'
  | 'squirrel';

export type Terrain = 'land' | 'water' | 'sky';
export type CellTerrain = Terrain | 'void';

export type ShapeCell = { dr: number; dc: number };
export type ShapeKey = 'single' | 'domino_h' | 'domino_v' | 'square2x2';

export type Condition =
  | { kind: 'adjacentForbidden'; with: Species }
  | { kind: 'minDistance'; from: Species; distance: number }
  | { kind: 'flockRequired' }
  | { kind: 'symbiosisRequired'; with: Species };

export type AnimalDef = {
  species: Species;
  terrain: Terrain;
  shape: ShapeKey;
  conditions: Condition[];
};

export type AnimalInstance = { instanceId: string; species: Species };

export type Pos = { r: number; c: number };

export type PlacedAnimal = AnimalInstance & { anchor: Pos; cells: Pos[] };

export type Stage = {
  id: string;
  name: string;
  rows: number;
  cols: number;
  terrain: CellTerrain[][];
  animals: AnimalInstance[];
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

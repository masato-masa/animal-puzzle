export type Species =
  | 'lion'
  | 'zebra'
  | 'giraffe'
  | 'elephant'
  | 'crocodile'
  | 'oxpecker'
  | 'squirrel'
  | 'monkey'
  | 'leopard'
  | 'rhino'
  | 'gorilla';

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

/**
 * 動物1体(1種)につき1つ持つ条件。AnimalDef.conditionsとして種に固定で紐づく場合と、
 * Stage.animalRulesとしてステージごとに直接指定される場合の両方で使う(後者が
 * 指定されたステージでは前者を完全に無視する。conditionsFor参照)。
 * above/leftOf/sameRow/sameCol/differentRow/differentCol/exactDistanceは、
 * かつてStage.rules(ステージ限定ルール、種ペア全体に効く別系統の仕組み)だけが
 * 持っていた位置関係の語彙を、動物1体の条件としても使えるようにしたもの。
 */
export type SpeciesCondition =
  | { kind: 'adjacentForbidden'; with: Species }
  | { kind: 'adjacentRequired'; with: Species }
  | { kind: 'minDistance'; from: Species; distance: number }
  | { kind: 'flockRequired' }
  | { kind: 'diagonalForbidden'; with: Species }
  | { kind: 'surroundForbidden'; with: Species }
  | { kind: 'blockAdjacentRequired'; block: ConditionBlock }
  | { kind: 'blockAdjacentForbidden'; block: ConditionBlock }
  | { kind: 'above'; with: Species }
  | { kind: 'below'; with: Species }
  | { kind: 'leftOf'; with: Species }
  | { kind: 'rightOf'; with: Species }
  | { kind: 'sameRow'; with: Species }
  | { kind: 'sameCol'; with: Species }
  | { kind: 'differentRow'; with: Species }
  | { kind: 'differentCol'; with: Species }
  | { kind: 'exactDistance'; with: Species; distance: number };

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
  /**
   * ステージごとに動物1種につきルール1つを直接指定する仕組み。指定されたステージでは、
   * ここに載っている種はこの1つの条件だけを使い、AnimalDef.conditions(種に紐づく
   * 固定の性格)は一切参照しない。載っていない種はこのステージでは無条件（自由に置ける）。
   * undefinedの場合は従来どおりAnimalDef.conditionsを使う(既存ステージへの影響なし)。
   */
  animalRules?: Partial<Record<Species, SpeciesCondition>>;
};

export type GameState = {
  stage: Stage;
  placed: PlacedAnimal[];
  tray: AnimalInstance[];
};

/** ステージ採点用: この種のconditions配列の特定indexの条件だけを判定から除外する指定。 */
export type ConditionSkip = { species: Species; index: number };

export const posKey = (p: Pos): string => `${p.r},${p.c}`;
export const posEq = (a: Pos, b: Pos): boolean => a.r === b.r && a.c === b.c;
export const manhattan = (a: Pos, b: Pos): number => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
export const isAdjacent = (a: Pos, b: Pos): boolean => manhattan(a, b) === 1;

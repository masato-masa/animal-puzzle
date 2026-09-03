import type { CellTerrain, GameState, PlacedAnimal, Pos, Stage } from './types';
import { posEq, posKey } from './types';
import { shapeCells } from './shapes';

export const createGameState = (stage: Stage): GameState => ({
  stage,
  placed: [],
  tray: [...stage.animals],
});

export const terrainAt = (stage: Stage, pos: Pos): CellTerrain =>
  pos.r < 0 || pos.r >= stage.rows || pos.c < 0 || pos.c >= stage.cols ? 'void' : stage.terrain[pos.r][pos.c];

export const animalAt = (state: GameState, pos: Pos): PlacedAnimal | undefined =>
  state.placed.find((p) => p.cells.some((cell) => posEq(cell, pos)));

export const canPlace = (state: GameState, instanceId: string, anchor: Pos): boolean => {
  const inTray = state.tray.find((a) => a.instanceId === instanceId);
  if (!inTray) return false;
  const cells = shapeCells(inTray.species, anchor);
  return cells.every((cell) => terrainAt(state.stage, cell) === 'land' && !animalAt(state, cell));
};

export const placeAnimal = (state: GameState, instanceId: string, anchor: Pos): GameState => {
  if (!canPlace(state, instanceId, anchor)) return state;
  const animal = state.tray.find((a) => a.instanceId === instanceId)!;
  const cells = shapeCells(animal.species, anchor);
  return {
    ...state,
    tray: state.tray.filter((a) => a.instanceId !== instanceId),
    placed: [...state.placed, { ...animal, anchor, cells }],
  };
};

export const returnToTray = (state: GameState, instanceId: string): GameState => {
  const animal = state.placed.find((p) => p.instanceId === instanceId);
  if (!animal) return state;
  return {
    ...state,
    placed: state.placed.filter((p) => p.instanceId !== instanceId),
    tray: [...state.tray, { instanceId: animal.instanceId, species: animal.species }],
  };
};

/** 指定セルにピースがあれば、そのピース全体をトレイに戻す。 */
export const returnPieceAt = (state: GameState, pos: Pos): GameState => {
  const animal = animalAt(state, pos);
  return animal ? returnToTray(state, animal.instanceId) : state;
};

/**
 * 盤面上に既にあるピースを新しいアンカーへ動かす（ドラッグでの移動用）。
 * 移動先が配置不可（地形不一致・他ピースと重なる等）なら何もせず元の状態を返す
 * ＝見た目上は元の位置にスナップバックする。
 */
export const moveAnimal = (state: GameState, instanceId: string, anchor: Pos): GameState => {
  const withoutPiece = returnToTray(state, instanceId);
  if (withoutPiece === state) return state;
  const next = placeAnimal(withoutPiece, instanceId, anchor);
  return next === withoutPiece ? state : next;
};

export const resetStage = (state: GameState): GameState => createGameState(state.stage);

/** 指定したトレイ内インスタンスが配置可能なアンカー位置(左上セル)の集合。 */
export const validAnchorCells = (state: GameState, instanceId: string): Set<string> => {
  const set = new Set<string>();
  for (let r = 0; r < state.stage.rows; r++) {
    for (let c = 0; c < state.stage.cols; c++) {
      const anchor = { r, c };
      if (canPlace(state, instanceId, anchor)) set.add(posKey(anchor));
    }
  }
  return set;
};

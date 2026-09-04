import type { ConditionBlock, ConditionSkip, SpeciesCondition, GameState, PlacedAnimal, Species } from './types';
import { isAdjacent, manhattan } from './types';
import { conditionsFor } from './species';
import { terrainAt } from './board';
import { unsatisfiedStageRules } from './stage-rules';

const piecesAdjacent = (a: PlacedAnimal, b: PlacedAnimal): boolean =>
  a.cells.some((ca) => b.cells.some((cb) => isAdjacent(ca, cb)));

const pieceDistance = (a: PlacedAnimal, b: PlacedAnimal): number =>
  Math.min(...a.cells.flatMap((ca) => b.cells.map((cb) => manhattan(ca, cb))));

const rowsOf = (p: PlacedAnimal): number[] => p.cells.map((c) => c.r);
const colsOf = (p: PlacedAnimal): number[] => p.cells.map((c) => c.c);
const overlaps = (xs: number[], ys: number[]): boolean => xs.some((x) => ys.includes(x));

/** stateに置かれている、指定した種の駒すべて。まだ1体もなければ空配列(=どの位置関係条件も暫定的にtrue)。 */
const placedOf = (state: GameState, species: Species): PlacedAnimal[] =>
  state.placed.filter((p) => p.species === species);

const neighborsOf = (state: GameState, piece: PlacedAnimal): PlacedAnimal[] =>
  state.placed.filter((p) => p.instanceId !== piece.instanceId && piecesAdjacent(p, piece));

const piecesDiagonal = (a: PlacedAnimal, b: PlacedAnimal): boolean =>
  a.cells.some((ca) => b.cells.some((cb) => Math.abs(ca.r - cb.r) === 1 && Math.abs(ca.c - cb.c) === 1));

const diagonalNeighborsOf = (state: GameState, piece: PlacedAnimal): PlacedAnimal[] =>
  state.placed.filter((p) => p.instanceId !== piece.instanceId && piecesDiagonal(p, piece));

const ORTHOGONAL = [
  { r: -1, c: 0 },
  { r: 1, c: 0 },
  { r: 0, c: -1 },
  { r: 0, c: 1 },
] as const;

/** 駒の占有マスのいずれかが、指定ブロックのマスと上下左右で接しているか。 */
const touchesBlock = (state: GameState, piece: PlacedAnimal, block: ConditionBlock): boolean =>
  piece.cells.some((cell) =>
    ORTHOGONAL.some((d) => terrainAt(state.stage, { r: cell.r + d.r, c: cell.c + d.c }) === block)
  );

type ConditionChecker = (state: GameState, animal: PlacedAnimal, condition: SpeciesCondition) => boolean;

export const conditionCheckers: Record<SpeciesCondition['kind'], ConditionChecker> = {
  adjacentForbidden: (state, animal, c) => {
    if (c.kind !== 'adjacentForbidden') return true;
    return !neighborsOf(state, animal).some((n) => n.species === c.with);
  },
  adjacentRequired: (state, animal, c) => {
    if (c.kind !== 'adjacentRequired') return true;
    return neighborsOf(state, animal).some((n) => n.species === c.with);
  },
  minDistance: (state, animal, c) => {
    if (c.kind !== 'minDistance') return true;
    return state.placed
      .filter((p) => p.species === c.from && p.instanceId !== animal.instanceId)
      .every((p) => pieceDistance(p, animal) >= c.distance);
  },
  flockRequired: (state, animal) => neighborsOf(state, animal).some((n) => n.species === animal.species),
  diagonalForbidden: (state, animal, c) => {
    if (c.kind !== 'diagonalForbidden') return true;
    return !diagonalNeighborsOf(state, animal).some((n) => n.species === c.with);
  },
  /** 上下左右とななめの計8方向。diagonalForbiddenとadjacentForbiddenの両方を満たすのと同義。 */
  surroundForbidden: (state, animal, c) => {
    if (c.kind !== 'surroundForbidden') return true;
    return (
      !neighborsOf(state, animal).some((n) => n.species === c.with) &&
      !diagonalNeighborsOf(state, animal).some((n) => n.species === c.with)
    );
  },
  blockAdjacentRequired: (state, animal, c) => {
    if (c.kind !== 'blockAdjacentRequired') return true;
    return touchesBlock(state, animal, c.block);
  },
  blockAdjacentForbidden: (state, animal, c) => {
    if (c.kind !== 'blockAdjacentForbidden') return true;
    return !touchesBlock(state, animal, c.block);
  },
  above: (state, animal, c) => {
    if (c.kind !== 'above') return true;
    return placedOf(state, c.with).every((p) => Math.max(...rowsOf(animal)) < Math.min(...rowsOf(p)));
  },
  below: (state, animal, c) => {
    if (c.kind !== 'below') return true;
    return placedOf(state, c.with).every((p) => Math.min(...rowsOf(animal)) > Math.max(...rowsOf(p)));
  },
  leftOf: (state, animal, c) => {
    if (c.kind !== 'leftOf') return true;
    return placedOf(state, c.with).every((p) => Math.max(...colsOf(animal)) < Math.min(...colsOf(p)));
  },
  rightOf: (state, animal, c) => {
    if (c.kind !== 'rightOf') return true;
    return placedOf(state, c.with).every((p) => Math.min(...colsOf(animal)) > Math.max(...colsOf(p)));
  },
  sameRow: (state, animal, c) => {
    if (c.kind !== 'sameRow') return true;
    return placedOf(state, c.with).every((p) => overlaps(rowsOf(animal), rowsOf(p)));
  },
  sameCol: (state, animal, c) => {
    if (c.kind !== 'sameCol') return true;
    return placedOf(state, c.with).every((p) => overlaps(colsOf(animal), colsOf(p)));
  },
  differentRow: (state, animal, c) => {
    if (c.kind !== 'differentRow') return true;
    return placedOf(state, c.with).every((p) => !overlaps(rowsOf(animal), rowsOf(p)));
  },
  differentCol: (state, animal, c) => {
    if (c.kind !== 'differentCol') return true;
    return placedOf(state, c.with).every((p) => !overlaps(colsOf(animal), colsOf(p)));
  },
  exactDistance: (state, animal, c) => {
    if (c.kind !== 'exactDistance') return true;
    return placedOf(state, c.with).every((p) => pieceDistance(animal, p) === c.distance);
  },
};

/** 盤上にあるその種の駒がすべてこの条件を満たしているか。1体も置いていなければtrue。 */
export const isSpeciesConditionSatisfied = (
  state: GameState,
  species: Species,
  condition: SpeciesCondition
): boolean =>
  state.placed
    .filter((p) => p.species === species)
    .every((p) => conditionCheckers[condition.kind](state, p, condition));

export const isAnimalSatisfied = (state: GameState, animal: PlacedAnimal, skip?: ConditionSkip): boolean =>
  conditionsFor(state.stage, animal.species)
    .filter((_, i) => !(skip && skip.species === animal.species && skip.index === i))
    .every((c) => conditionCheckers[c.kind](state, animal, c));

export const violatingAnimals = (state: GameState, skip?: ConditionSkip): PlacedAnimal[] =>
  state.placed.filter((a) => !isAnimalSatisfied(state, a, skip));

export const isStageCleared = (state: GameState, skip?: ConditionSkip, skipRuleIndex?: number): boolean =>
  state.tray.length === 0 &&
  violatingAnimals(state, skip).length === 0 &&
  unsatisfiedStageRules(state, skipRuleIndex).length === 0;

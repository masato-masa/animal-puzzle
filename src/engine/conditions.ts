import type { SpeciesCondition, GameState, PlacedAnimal } from './types';
import { isAdjacent, manhattan } from './types';
import { SPECIES } from './species';

const piecesAdjacent = (a: PlacedAnimal, b: PlacedAnimal): boolean =>
  a.cells.some((ca) => b.cells.some((cb) => isAdjacent(ca, cb)));

const pieceDistance = (a: PlacedAnimal, b: PlacedAnimal): number =>
  Math.min(...a.cells.flatMap((ca) => b.cells.map((cb) => manhattan(ca, cb))));

const neighborsOf = (state: GameState, piece: PlacedAnimal): PlacedAnimal[] =>
  state.placed.filter((p) => p.instanceId !== piece.instanceId && piecesAdjacent(p, piece));

const piecesDiagonal = (a: PlacedAnimal, b: PlacedAnimal): boolean =>
  a.cells.some((ca) => b.cells.some((cb) => Math.abs(ca.r - cb.r) === 1 && Math.abs(ca.c - cb.c) === 1));

const diagonalNeighborsOf = (state: GameState, piece: PlacedAnimal): PlacedAnimal[] =>
  state.placed.filter((p) => p.instanceId !== piece.instanceId && piecesDiagonal(p, piece));

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
};

export const isAnimalSatisfied = (state: GameState, animal: PlacedAnimal): boolean =>
  SPECIES[animal.species].conditions.every((c) => conditionCheckers[c.kind](state, animal, c));

export const violatingAnimals = (state: GameState): PlacedAnimal[] =>
  state.placed.filter((a) => !isAnimalSatisfied(state, a));

export const isStageCleared = (state: GameState): boolean =>
  state.tray.length === 0 && violatingAnimals(state).length === 0;

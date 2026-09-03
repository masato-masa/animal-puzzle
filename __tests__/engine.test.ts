import {
  boundingBox,
  canPlace,
  conditionCheckers,
  countSolutions,
  createGameState,
  findSolution,
  isAnimalSatisfied,
  isSpeciesConditionSatisfied,
  isStageCleared,
  isStageRuleSatisfied,
  moveAnimal,
  placeAnimal,
  propagateToFixation,
  resetStage,
  returnPieceAt,
  ruleFilteredCandidateAnchors,
  shapeCells,
  solutionStatus,
  solverLevel,
  SPECIES,
  terrainAt,
  unsatisfiedStageRules,
  validateStage,
  type CellTerrain,
  type Species,
  type Stage,
} from '@/engine';
import { CHAPTERS, STAGES } from '@/levels/stages';
import { buildStageCodeSnippet } from '@/lib/stage-submission';
import { migrateStageTerrain } from '@/storage/migrate-stage';
import { speciesEmoji, speciesLabel } from '@/theme';

const makeStage = (overrides: Partial<Stage> = {}): Stage => ({
  id: 'test',
  name: 'Test',
  rows: 5,
  cols: 5,
  terrain: Array.from({ length: 5 }, () => Array<CellTerrain>(5).fill('land')),
  animals: [],
  ...overrides,
});

describe('shapes', () => {
  test('shapeCells offsets cells from the anchor', () => {
    expect(shapeCells('zebra', { r: 2, c: 3 })).toEqual([
      { r: 2, c: 3 },
      { r: 2, c: 4 },
    ]);
    expect(shapeCells('lion', { r: 0, c: 0 })).toEqual([
      { r: 0, c: 0 },
      { r: 1, c: 0 },
    ]);
    expect(shapeCells('elephant', { r: 0, c: 0 })).toEqual([
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 1, c: 0 },
      { r: 1, c: 1 },
    ]);
  });

  test('boundingBox reflects each species shape', () => {
    expect(boundingBox('squirrel')).toEqual({ w: 1, h: 1 });
    expect(boundingBox('zebra')).toEqual({ w: 2, h: 1 });
    expect(boundingBox('lion')).toEqual({ w: 1, h: 2 });
    expect(boundingBox('elephant')).toEqual({ w: 2, h: 2 });
    expect(boundingBox('monkey')).toEqual({ w: 1, h: 1 });
    expect(boundingBox('leopard')).toEqual({ w: 1, h: 2 });
    expect(boundingBox('rhino')).toEqual({ w: 2, h: 2 });
    expect(boundingBox('gorilla')).toEqual({ w: 2, h: 2 });
  });
});

describe('board placement', () => {
  test('placeAnimal occupies shape cells and empties the tray slot', () => {
    const stage = makeStage({ animals: [{ instanceId: 'z1', species: 'zebra' }] });
    let state = createGameState(stage);
    expect(state.tray).toHaveLength(1);

    expect(canPlace(state, 'z1', { r: 0, c: 0 })).toBe(true);
    state = placeAnimal(state, 'z1', { r: 0, c: 0 });

    expect(state.tray).toHaveLength(0);
    expect(state.placed[0].cells).toEqual([
      { r: 0, c: 0 },
      { r: 0, c: 1 },
    ]);
  });

  test('canPlace rejects a water block cell', () => {
    const stage = makeStage({
      terrain: [
        ['water', 'land', 'land', 'land', 'land'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('land')),
      ],
      animals: [{ instanceId: 'z1', species: 'zebra' }],
    });
    const state = createGameState(stage);
    expect(canPlace(state, 'z1', { r: 0, c: 0 })).toBe(false);
    expect(canPlace(state, 'z1', { r: 0, c: 1 })).toBe(true);
  });

  test('canPlace rejects a tree block cell', () => {
    const stage = makeStage({
      terrain: [
        ['tree', 'land', 'land', 'land', 'land'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('land')),
      ],
      animals: [{ instanceId: 's1', species: 'squirrel' }],
    });
    const state = createGameState(stage);
    expect(canPlace(state, 's1', { r: 0, c: 0 })).toBe(false);
    expect(canPlace(state, 's1', { r: 0, c: 1 })).toBe(true);
  });

  test('canPlace rejects overlap with an already-placed piece', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 's1', species: 'squirrel' },
        { instanceId: 's2', species: 'squirrel' },
      ],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 's1', { r: 0, c: 0 });
    expect(canPlace(state, 's2', { r: 0, c: 0 })).toBe(false);
  });

  test('canPlace rejects a piece that would span a void cell', () => {
    const stage = makeStage({
      terrain: [
        ['void', 'land', 'land', 'land', 'land'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('land')),
      ],
      animals: [{ instanceId: 'z1', species: 'zebra' }],
    });
    const state = createGameState(stage);
    expect(canPlace(state, 'z1', { r: 0, c: 0 })).toBe(false);
    expect(canPlace(state, 'z1', { r: 0, c: 1 })).toBe(true);
  });

  test('canPlace rejects a piece that would span a wall cell', () => {
    const stage = makeStage({
      terrain: [
        ['wall', 'land', 'land', 'land', 'land'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('land')),
      ],
      animals: [{ instanceId: 'z1', species: 'zebra' }],
    });
    const state = createGameState(stage);
    expect(canPlace(state, 'z1', { r: 0, c: 0 })).toBe(false);
    expect(canPlace(state, 'z1', { r: 0, c: 1 })).toBe(true);
  });

  test('returnPieceAt returns the whole piece no matter which cell is tapped', () => {
    const stage = makeStage({ animals: [{ instanceId: 'e1', species: 'elephant' }] });
    let state = createGameState(stage);
    state = placeAnimal(state, 'e1', { r: 0, c: 0 });
    expect(state.placed).toHaveLength(1);

    state = returnPieceAt(state, { r: 1, c: 1 });
    expect(state.placed).toHaveLength(0);
    expect(state.tray).toHaveLength(1);
  });

  test('moveAnimal relocates an already-placed piece to a new anchor', () => {
    const stage = makeStage({ animals: [{ instanceId: 'e1', species: 'elephant' }] });
    let state = createGameState(stage);
    state = placeAnimal(state, 'e1', { r: 0, c: 0 });
    state = moveAnimal(state, 'e1', { r: 1, c: 1 });
    expect(state.placed[0].anchor).toEqual({ r: 1, c: 1 });
    expect(state.placed[0].cells).toEqual([
      { r: 1, c: 1 },
      { r: 1, c: 2 },
      { r: 2, c: 1 },
      { r: 2, c: 2 },
    ]);
  });

  test('moveAnimal snaps back (no-op) when the destination is invalid', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 'e1', species: 'elephant' },
        { instanceId: 's1', species: 'squirrel' },
      ],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 'e1', { r: 0, c: 0 });
    state = placeAnimal(state, 's1', { r: 3, c: 3 });
    const before = state;
    state = moveAnimal(state, 'e1', { r: 3, c: 3 }); // overlaps the squirrel
    expect(state).toBe(before);
  });

  test('resetStage empties the board back to a full tray', () => {
    const stage = makeStage({ animals: [{ instanceId: 'e1', species: 'elephant' }] });
    let state = createGameState(stage);
    state = placeAnimal(state, 'e1', { r: 0, c: 0 });
    state = resetStage(state);
    expect(state.placed).toHaveLength(0);
    expect(state.tray).toHaveLength(1);
  });
});

describe('terrainAt / void handling', () => {
  test('returns void for marked-void and out-of-bounds cells', () => {
    const stage = makeStage({
      terrain: [
        ['void', 'land', 'land', 'land', 'land'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('land')),
      ],
    });
    expect(terrainAt(stage, { r: 0, c: 0 })).toBe('void');
    expect(terrainAt(stage, { r: -1, c: 0 })).toBe('void');
    expect(terrainAt(stage, { r: 0, c: 99 })).toBe('void');
    expect(terrainAt(stage, { r: 0, c: 1 })).toBe('land');
  });
});

describe('conditionCheckers', () => {
  test('adjacentForbidden fails when pieces touch', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 'l1', species: 'lion' },
        { instanceId: 'z1', species: 'zebra' },
      ],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 'l1', { r: 0, c: 0 });
    state = placeAnimal(state, 'z1', { r: 0, c: 1 });
    const lion = state.placed.find((p) => p.instanceId === 'l1')!;
    expect(conditionCheckers.adjacentForbidden(state, lion, { kind: 'adjacentForbidden', with: 'zebra' })).toBe(
      false
    );
  });

  test('adjacentForbidden passes when pieces are apart', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 'l1', species: 'lion' },
        { instanceId: 'z1', species: 'zebra' },
      ],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 'l1', { r: 0, c: 0 });
    state = placeAnimal(state, 'z1', { r: 3, c: 0 });
    const lion = state.placed.find((p) => p.instanceId === 'l1')!;
    expect(conditionCheckers.adjacentForbidden(state, lion, { kind: 'adjacentForbidden', with: 'zebra' })).toBe(true);
  });

  test('minDistance fails below the threshold', () => {
    const stage = makeStage({
      rows: 8,
      cols: 8,
      terrain: Array.from({ length: 8 }, () => Array<CellTerrain>(8).fill('land')),
      animals: [
        { instanceId: 'l1', species: 'lion' },
        { instanceId: 'g1', species: 'giraffe' },
      ],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 'l1', { r: 0, c: 0 }); // cells (0,0),(1,0)
    state = placeAnimal(state, 'g1', { r: 0, c: 2 }); // cells (0,2),(1,2) -> min distance 2
    const lion = state.placed.find((p) => p.instanceId === 'l1')!;
    expect(
      conditionCheckers.minDistance(state, lion, { kind: 'minDistance', from: 'giraffe', distance: 3 })
    ).toBe(false);
  });

  test('minDistance passes at exactly the threshold', () => {
    const stage = makeStage({
      rows: 8,
      cols: 8,
      terrain: Array.from({ length: 8 }, () => Array<CellTerrain>(8).fill('land')),
      animals: [
        { instanceId: 'l1', species: 'lion' },
        { instanceId: 'g1', species: 'giraffe' },
      ],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 'l1', { r: 0, c: 0 }); // cells (0,0),(1,0)
    state = placeAnimal(state, 'g1', { r: 0, c: 3 }); // cells (0,3),(1,3) -> min distance 3
    const lion = state.placed.find((p) => p.instanceId === 'l1')!;
    expect(
      conditionCheckers.minDistance(state, lion, { kind: 'minDistance', from: 'giraffe', distance: 3 })
    ).toBe(true);
  });

  test('flockRequired fails for a lone piece', () => {
    const stage = makeStage({ animals: [{ instanceId: 'zA', species: 'zebra' }] });
    let state = createGameState(stage);
    state = placeAnimal(state, 'zA', { r: 0, c: 0 });
    const zebra = state.placed[0];
    expect(conditionCheckers.flockRequired(state, zebra, { kind: 'flockRequired' })).toBe(false);
  });

  test('flockRequired passes when an adjacent same-species piece exists', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 'zA', species: 'zebra' },
        { instanceId: 'zB', species: 'zebra' },
      ],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 'zA', { r: 0, c: 0 }); // (0,0),(0,1)
    state = placeAnimal(state, 'zB', { r: 1, c: 0 }); // (1,0),(1,1) -> adjacent to zA
    const zebraA = state.placed.find((p) => p.instanceId === 'zA')!;
    expect(conditionCheckers.flockRequired(state, zebraA, { kind: 'flockRequired' })).toBe(true);
  });

  test('adjacentRequired fails without the required neighbor and passes once adjacent', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 'o1', species: 'oxpecker' },
        { instanceId: 'g1', species: 'giraffe' },
      ],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 'o1', { r: 0, c: 0 });
    const condition = { kind: 'adjacentRequired', with: 'giraffe' } as const;

    expect(conditionCheckers.adjacentRequired(state, state.placed[0], condition)).toBe(false);

    state = placeAnimal(state, 'g1', { r: 0, c: 1 });
    expect(conditionCheckers.adjacentRequired(state, state.placed[0], condition)).toBe(true);
  });

  test('diagonalForbidden fails only on a diagonal touch, not an orthogonal one', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 's1', species: 'squirrel' },
        { instanceId: 's2', species: 'squirrel' },
      ],
    });
    const condition = { kind: 'diagonalForbidden', with: 'squirrel' } as const;

    let diagonal = createGameState(stage);
    diagonal = placeAnimal(diagonal, 's1', { r: 0, c: 0 });
    diagonal = placeAnimal(diagonal, 's2', { r: 1, c: 1 });
    expect(conditionCheckers.diagonalForbidden(diagonal, diagonal.placed[0], condition)).toBe(false);

    let orthogonal = createGameState(stage);
    orthogonal = placeAnimal(orthogonal, 's1', { r: 0, c: 0 });
    orthogonal = placeAnimal(orthogonal, 's2', { r: 0, c: 1 });
    expect(conditionCheckers.diagonalForbidden(orthogonal, orthogonal.placed[0], condition)).toBe(true);
  });

  test('surroundForbidden fails on both diagonal and orthogonal touches', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 's1', species: 'squirrel' },
        { instanceId: 's2', species: 'squirrel' },
      ],
    });
    const condition = { kind: 'surroundForbidden', with: 'squirrel' } as const;

    let diagonal = createGameState(stage);
    diagonal = placeAnimal(diagonal, 's1', { r: 0, c: 0 });
    diagonal = placeAnimal(diagonal, 's2', { r: 1, c: 1 });
    expect(conditionCheckers.surroundForbidden(diagonal, diagonal.placed[0], condition)).toBe(false);

    let orthogonal = createGameState(stage);
    orthogonal = placeAnimal(orthogonal, 's1', { r: 0, c: 0 });
    orthogonal = placeAnimal(orthogonal, 's2', { r: 0, c: 1 });
    expect(conditionCheckers.surroundForbidden(orthogonal, orthogonal.placed[0], condition)).toBe(false);

    let apart = createGameState(stage);
    apart = placeAnimal(apart, 's1', { r: 0, c: 0 });
    apart = placeAnimal(apart, 's2', { r: 2, c: 2 });
    expect(conditionCheckers.surroundForbidden(apart, apart.placed[0], condition)).toBe(true);
  });

  test('diagonalForbidden uses every occupied cell of a multi-cell piece', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 'e1', species: 'elephant' },
        { instanceId: 's1', species: 'squirrel' },
      ],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 'e1', { r: 0, c: 0 });
    state = placeAnimal(state, 's1', { r: 2, c: 2 });
    const condition = { kind: 'diagonalForbidden', with: 'squirrel' } as const;
    expect(conditionCheckers.diagonalForbidden(state, state.placed[0], condition)).toBe(false);
  });

  test('blockAdjacentRequired needs an orthogonally touching block cell', () => {
    const stage = makeStage({
      terrain: [
        ['water', 'land', 'land', 'land', 'land'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('land')),
      ],
      animals: [{ instanceId: 'c1', species: 'crocodile' }],
    });
    const condition = { kind: 'blockAdjacentRequired', block: 'water' } as const;

    let touching = createGameState(stage);
    touching = placeAnimal(touching, 'c1', { r: 0, c: 1 });
    expect(conditionCheckers.blockAdjacentRequired(touching, touching.placed[0], condition)).toBe(true);

    let apart = createGameState(stage);
    apart = placeAnimal(apart, 'c1', { r: 2, c: 2 });
    expect(conditionCheckers.blockAdjacentRequired(apart, apart.placed[0], condition)).toBe(false);
  });

  test('blockAdjacentRequired does not count a diagonal block cell', () => {
    const stage = makeStage({
      terrain: [
        ['water', 'land', 'land', 'land', 'land'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('land')),
      ],
      animals: [{ instanceId: 's1', species: 'squirrel' }],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 's1', { r: 1, c: 1 });
    const condition = { kind: 'blockAdjacentRequired', block: 'water' } as const;
    expect(conditionCheckers.blockAdjacentRequired(state, state.placed[0], condition)).toBe(false);
  });

  test('blockAdjacentForbidden is the inverse', () => {
    const stage = makeStage({
      terrain: [
        ['tree', 'land', 'land', 'land', 'land'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('land')),
      ],
      animals: [{ instanceId: 's1', species: 'squirrel' }],
    });
    const condition = { kind: 'blockAdjacentForbidden', block: 'tree' } as const;

    let touching = createGameState(stage);
    touching = placeAnimal(touching, 's1', { r: 0, c: 1 });
    expect(conditionCheckers.blockAdjacentForbidden(touching, touching.placed[0], condition)).toBe(false);

    let apart = createGameState(stage);
    apart = placeAnimal(apart, 's1', { r: 3, c: 3 });
    expect(conditionCheckers.blockAdjacentForbidden(apart, apart.placed[0], condition)).toBe(true);
  });

  test('isSpeciesConditionSatisfied is false when any placed piece of that species violates it', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 'z1', species: 'zebra' },
        { instanceId: 'z2', species: 'zebra' },
        { instanceId: 'l1', species: 'lion' },
      ],
    });
    const condition = { kind: 'adjacentForbidden', with: 'lion' } as const;

    // シマウマは横2マス、ライオンは縦2マス。z1は(0,0)-(0,1)、z2は(4,0)-(4,1)を占める。
    let state = createGameState(stage);
    state = placeAnimal(state, 'z1', { r: 0, c: 0 });
    state = placeAnimal(state, 'z2', { r: 4, c: 0 });
    state = placeAnimal(state, 'l1', { r: 2, c: 4 });
    expect(isSpeciesConditionSatisfied(state, 'zebra', condition)).toBe(true);

    // (1,0)-(2,0)へ動かすと、z1の(0,0)と上下で接する。
    state = moveAnimal(state, 'l1', { r: 1, c: 0 });
    expect(isSpeciesConditionSatisfied(state, 'zebra', condition)).toBe(false);
  });

  test('isSpeciesConditionSatisfied is true when no piece of that species is placed yet', () => {
    const stage = makeStage({ animals: [{ instanceId: 'z1', species: 'zebra' }] });
    const state = createGameState(stage);
    expect(isSpeciesConditionSatisfied(state, 'zebra', { kind: 'adjacentForbidden', with: 'lion' })).toBe(true);
  });

  test('isAnimalSatisfied can skip one specific condition by index', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 'z1', species: 'zebra' },
        { instanceId: 'l1', species: 'lion' },
      ],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 'z1', { r: 0, c: 0 });
    state = placeAnimal(state, 'l1', { r: 2, c: 2 });
    // 隣接していないので通常判定でも満たされる。ここではスキップ指定そのものの配線を確認する。
    expect(isAnimalSatisfied(state, state.placed[0])).toBe(true);
    expect(isAnimalSatisfied(state, state.placed[0], { species: 'zebra', index: 0 })).toBe(true);

    state = moveAnimal(state, 'l1', { r: 1, c: 0 });
    // シマウマは横2マス(0,0)-(0,1)、ライオンは縦2マス(1,0)-(2,0)。上下で隣接し違反する。
    expect(isAnimalSatisfied(state, state.placed[0])).toBe(false);
    // zebraのconditions[0]はadjacentForbidden(lion)そのものなので、これを無視すれば満たされる扱いになる。
    expect(isAnimalSatisfied(state, state.placed[0], { species: 'zebra', index: 0 })).toBe(true);
    // 無関係な種を指定してもスキップされず、違反のまま。
    expect(isAnimalSatisfied(state, state.placed[0], { species: 'lion', index: 0 })).toBe(false);
  });
});

describe('isStageCleared', () => {
  test('requires an empty tray', () => {
    const stage = makeStage({ animals: [{ instanceId: 's1', species: 'squirrel' }] });
    const state = createGameState(stage);
    expect(isStageCleared(state)).toBe(false);
  });

  test('true once tray is empty and no conditions are violated', () => {
    const stage = makeStage({ animals: [{ instanceId: 's1', species: 'squirrel' }] });
    let state = createGameState(stage);
    state = placeAnimal(state, 's1', { r: 0, c: 0 });
    expect(isStageCleared(state)).toBe(true);
  });

  test('false while a violation remains even with an empty tray', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 'g1', species: 'giraffe' },
        { instanceId: 'l1', species: 'lion' },
      ],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 'g1', { r: 0, c: 0 }); // (0,0),(1,0)
    state = placeAnimal(state, 'l1', { r: 0, c: 1 }); // (0,1),(1,1) -> adjacent to giraffe
    expect(state.tray).toHaveLength(0);
    expect(isStageCleared(state)).toBe(false);
  });
});

describe('countSolutions / solutionStatus', () => {
  test('a single animal on a single matching cell has exactly one solution', () => {
    const stage = makeStage({
      terrain: [
        ['land', 'wall', 'wall', 'wall', 'wall'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: [{ instanceId: 's1', species: 'squirrel' }],
    });
    expect(countSolutions(stage)).toBe(1);
    expect(solutionStatus(stage)).toBe('unique');
  });

  test('an animal with two equally valid target cells has multiple solutions', () => {
    const stage = makeStage({
      terrain: [
        ['land', 'land', 'wall', 'wall', 'wall'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: [{ instanceId: 's1', species: 'squirrel' }],
    });
    expect(countSolutions(stage)).toBe(2);
    expect(solutionStatus(stage)).toBe('multiple');
  });

  test('an unsatisfiable stage has zero solutions', () => {
    const stage = makeStage({
      terrain: Array.from({ length: 5 }, () => Array<CellTerrain>(5).fill('wall')),
      animals: [{ instanceId: 's1', species: 'squirrel' }],
    });
    expect(countSolutions(stage)).toBe(0);
    expect(solutionStatus(stage)).toBe('none');
  });

  test('swapping two identical pieces counts as the same solution (dedup)', () => {
    // 2x2 land block: two non-rotatable horizontal zebra dominoes can only tile it
    // by stacking (row0 + row1), but naive search finds that tiling twice (once per
    // instance-to-row assignment) — countSolutions must dedupe those into 1.
    const stage = makeStage({
      terrain: [
        ['land', 'land', 'wall', 'wall', 'wall'],
        ['land', 'land', 'wall', 'wall', 'wall'],
        ...Array.from({ length: 3 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: [
        { instanceId: 'z1', species: 'zebra' },
        { instanceId: 'z2', species: 'zebra' },
      ],
    });
    expect(countSolutions(stage)).toBe(1);
    expect(solutionStatus(stage)).toBe('unique');
  });

  test('findSolution returns a fully placed, cleared state for a solvable stage', () => {
    const stage = makeStage({ animals: [{ instanceId: 's1', species: 'squirrel' }] });
    const solution = findSolution(stage);
    expect(solution).toBeDefined();
    expect(solution!.tray).toHaveLength(0);
    expect(isStageCleared(solution!)).toBe(true);
  });

  test('findSolution returns undefined for an unsatisfiable stage', () => {
    const stage = makeStage({
      terrain: Array.from({ length: 5 }, () => Array<CellTerrain>(5).fill('wall')),
      animals: [{ instanceId: 's1', species: 'squirrel' }],
    });
    expect(findSolution(stage)).toBeUndefined();
  });
});

describe('validateStage', () => {
  const validStage: Stage = {
    id: 'valid',
    name: 'Valid',
    rows: 5,
    cols: 5,
    terrain: [
      Array<CellTerrain>(5).fill('land'),
      ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
    ],
    animals: Array.from({ length: 5 }, (_, i) => ({ instanceId: `s${i}`, species: 'squirrel' as const })),
  };

  test('a well-formed stage has no errors', () => {
    expect(validateStage(validStage)).toEqual([]);
  });

  test('flags board size out of range', () => {
    const bad: Stage = { ...validStage, rows: 3, terrain: Array.from({ length: 3 }, () => Array<CellTerrain>(5).fill('land')) };
    expect(validateStage(bad).some((e) => e.includes('board size out of range'))).toBe(true);
  });

  test('flags terrain grid shape mismatch', () => {
    const bad: Stage = { ...validStage, terrain: validStage.terrain.slice(0, 4) };
    expect(validateStage(bad).some((e) => e.includes('terrain grid shape'))).toBe(true);
  });

  test('flags duplicate instanceId', () => {
    const bad: Stage = {
      ...validStage,
      animals: [...validStage.animals.slice(0, -1), { instanceId: 's0', species: 'squirrel' as const }],
    };
    expect(validateStage(bad).some((e) => e.includes('duplicate instanceId'))).toBe(true);
  });

  test('flags unknown species', () => {
    const bad: Stage = {
      ...validStage,
      animals: [...validStage.animals.slice(0, -1), { instanceId: 'weird', species: 'dragon' as never }],
    };
    expect(validateStage(bad).some((e) => e.includes('unknown species'))).toBe(true);
  });

  test('flags a placeable cell count mismatch', () => {
    const bad: Stage = {
      ...validStage,
      terrain: [Array<CellTerrain>(5).fill('water'), ...validStage.terrain.slice(1)],
    };
    expect(validateStage(bad).some((e) => e.includes('placeable cell count'))).toBe(true);
  });

  test('water and tree blocks are excluded from the placeable count just like wall', () => {
    const stage: Stage = {
      id: 'blocks',
      name: 'x',
      rows: 5,
      cols: 5,
      terrain: [
        ['water', 'tree', 'wall', 'land', 'land'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: [
        { instanceId: 's0', species: 'squirrel' },
        { instanceId: 's1', species: 'squirrel' },
      ],
    };
    expect(validateStage(stage)).toEqual([]);
  });

  test('wall cells are excluded from terrain counts just like void', () => {
    const stage: Stage = {
      id: 'with-wall',
      name: 'x',
      rows: 5,
      cols: 5,
      terrain: [
        ['wall', 'wall', 'wall', 'land', 'land'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: [
        { instanceId: 's0', species: 'squirrel' },
        { instanceId: 's1', species: 'squirrel' },
      ],
    };
    expect(validateStage(stage)).toEqual([]);
  });

  test('flags more than the max animals per stage', () => {
    const stage: Stage = {
      id: 'too-many',
      name: 'x',
      rows: 5,
      cols: 5,
      terrain: Array.from({ length: 5 }, () => Array<CellTerrain>(5).fill('land')),
      animals: Array.from({ length: 25 }, (_, i) => ({ instanceId: `s${i}`, species: 'squirrel' as const })),
    };
    expect(validateStage(stage).some((e) => e.includes('too many animals'))).toBe(true);
  });

  test('flags adjacentRequired with a missing partner species', () => {
    const stage: Stage = {
      id: 'lonely-oxpecker',
      name: 'x',
      rows: 5,
      cols: 5,
      terrain: [
        ['land', 'land', 'land', 'wall', 'wall'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: Array.from({ length: 3 }, (_, i) => ({ instanceId: `o${i}`, species: 'oxpecker' as const })),
    };
    expect(validateStage(stage).some((e) => e.includes('adjacentRequired(giraffe) but no giraffe'))).toBe(true);
  });

  test('flags blockAdjacentRequired when the board has no such block', () => {
    const stage: Stage = {
      id: 'no-water',
      name: 'x',
      rows: 5,
      cols: 5,
      terrain: [
        ['land', 'land', 'wall', 'wall', 'wall'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: [{ instanceId: 'c0', species: 'crocodile' }],
    };
    expect(validateStage(stage).some((e) => e.includes('blockAdjacentRequired(water) but no water block'))).toBe(true);
  });
});

describe('stage rules', () => {
  const twoPieceStage = (rules: Stage['rules']): Stage =>
    makeStage({
      animals: [
        { instanceId: 's1', species: 'squirrel' },
        { instanceId: 'z1', species: 'zebra' },
      ],
      rules,
    });

  test('above requires every A cell to sit strictly above every B cell', () => {
    const stage = twoPieceStage([{ kind: 'above', a: 'squirrel', b: 'zebra' }]);
    let above = createGameState(stage);
    above = placeAnimal(above, 's1', { r: 0, c: 0 });
    above = placeAnimal(above, 'z1', { r: 1, c: 0 });
    expect(isStageRuleSatisfied(above, stage.rules![0])).toBe(true);

    let sameRow = createGameState(stage);
    sameRow = placeAnimal(sameRow, 's1', { r: 1, c: 0 });
    sameRow = placeAnimal(sameRow, 'z1', { r: 1, c: 1 });
    expect(isStageRuleSatisfied(sameRow, stage.rules![0])).toBe(false);
  });

  test('leftOf works on columns the same way', () => {
    const stage = twoPieceStage([{ kind: 'leftOf', a: 'squirrel', b: 'zebra' }]);
    let left = createGameState(stage);
    left = placeAnimal(left, 's1', { r: 0, c: 0 });
    left = placeAnimal(left, 'z1', { r: 0, c: 1 });
    expect(isStageRuleSatisfied(left, stage.rules![0])).toBe(true);

    let right = createGameState(stage);
    right = placeAnimal(right, 's1', { r: 0, c: 4 });
    right = placeAnimal(right, 'z1', { r: 0, c: 0 });
    expect(isStageRuleSatisfied(right, stage.rules![0])).toBe(false);
  });

  test('sameRow is satisfied when the occupied row sets overlap', () => {
    const stage = twoPieceStage([{ kind: 'sameRow', a: 'squirrel', b: 'zebra' }]);
    let same = createGameState(stage);
    same = placeAnimal(same, 's1', { r: 2, c: 0 });
    same = placeAnimal(same, 'z1', { r: 2, c: 2 });
    expect(isStageRuleSatisfied(same, stage.rules![0])).toBe(true);

    let different = createGameState(stage);
    different = placeAnimal(different, 's1', { r: 0, c: 0 });
    different = placeAnimal(different, 'z1', { r: 2, c: 2 });
    expect(isStageRuleSatisfied(different, stage.rules![0])).toBe(false);
  });

  test('differentCol is the inverse of sameCol', () => {
    const stage = twoPieceStage([{ kind: 'differentCol', a: 'squirrel', b: 'zebra' }]);
    // シマウマは横2マス。(2,1)に置くと列1と2を占める。
    let overlapping = createGameState(stage);
    overlapping = placeAnimal(overlapping, 's1', { r: 0, c: 1 });
    overlapping = placeAnimal(overlapping, 'z1', { r: 2, c: 1 });
    expect(isStageRuleSatisfied(overlapping, stage.rules![0])).toBe(false);

    let apart = createGameState(stage);
    apart = placeAnimal(apart, 's1', { r: 0, c: 0 });
    apart = placeAnimal(apart, 'z1', { r: 2, c: 1 });
    expect(isStageRuleSatisfied(apart, stage.rules![0])).toBe(true);
  });

  test('exactDistance requires the minimum distance to match exactly', () => {
    const stage = twoPieceStage([{ kind: 'exactDistance', a: 'squirrel', b: 'zebra', distance: 2 }]);
    let exact = createGameState(stage);
    exact = placeAnimal(exact, 's1', { r: 0, c: 0 });
    exact = placeAnimal(exact, 'z1', { r: 0, c: 2 });
    expect(isStageRuleSatisfied(exact, stage.rules![0])).toBe(true);

    let tooFar = createGameState(stage);
    tooFar = placeAnimal(tooFar, 's1', { r: 0, c: 0 });
    tooFar = placeAnimal(tooFar, 'z1', { r: 0, c: 3 });
    expect(isStageRuleSatisfied(tooFar, stage.rules![0])).toBe(false);
  });

  test('a rule is treated as satisfied while one side is still in the tray', () => {
    const stage = twoPieceStage([{ kind: 'above', a: 'squirrel', b: 'zebra' }]);
    let state = createGameState(stage);
    state = placeAnimal(state, 'z1', { r: 0, c: 0 });
    expect(unsatisfiedStageRules(state)).toEqual([]);
  });

  test('isStageCleared requires stage rules on top of species conditions', () => {
    const stage: Stage = {
      ...makeStage({
        terrain: [
          ['land', 'wall', 'wall', 'wall', 'wall'],
          ['land', 'wall', 'wall', 'wall', 'wall'],
          ...Array.from({ length: 3 }, () => Array<CellTerrain>(5).fill('wall')),
        ],
        animals: [
          { instanceId: 's1', species: 'squirrel' },
          { instanceId: 's2', species: 'squirrel' },
        ],
      }),
      rules: [{ kind: 'differentCol', a: 'squirrel', b: 'squirrel' }],
    };
    let state = createGameState(stage);
    state = placeAnimal(state, 's1', { r: 0, c: 0 });
    state = placeAnimal(state, 's2', { r: 1, c: 0 });
    expect(state.tray).toHaveLength(0);
    expect(isStageCleared(state)).toBe(false);
  });

  test('countSolutions respects stage rules', () => {
    const base = makeStage({
      terrain: [
        ['land', 'wall', 'land', 'wall', 'wall'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: [
        { instanceId: 's1', species: 'squirrel' },
        { instanceId: 'm1', species: 'squirrel' },
      ],
    });
    expect(countSolutions(base, 5)).toBe(1);

    const blocked: Stage = { ...base, rules: [{ kind: 'sameCol', a: 'squirrel', b: 'squirrel' }] };
    expect(countSolutions(blocked, 5)).toBe(0);
  });

  test('unsatisfiedStageRules and countSolutions can skip one rule by index', () => {
    const stage: Stage = {
      ...makeStage({
        terrain: [
          ['land', 'wall', 'land', 'wall', 'wall'],
          ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
        ],
        animals: [
          { instanceId: 's1', species: 'squirrel' },
          { instanceId: 'm1', species: 'squirrel' },
        ],
      }),
      rules: [{ kind: 'sameCol', a: 'squirrel', b: 'squirrel' }],
    };
    let state = createGameState(stage);
    state = placeAnimal(state, 's1', { r: 0, c: 0 });
    state = placeAnimal(state, 'm1', { r: 0, c: 2 });
    expect(unsatisfiedStageRules(state)).toEqual(stage.rules);
    expect(unsatisfiedStageRules(state, 0)).toEqual([]);

    expect(countSolutions(stage, 5)).toBe(0);
    expect(countSolutions(stage, 5, undefined, 0)).toBe(1);
  });
});

describe('propagation', () => {
  test('ruleFilteredCandidateAnchors excludes an anchor that would immediately violate adjacentForbidden', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 'l1', species: 'lion' },
        { instanceId: 'z1', species: 'zebra' },
      ],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 'l1', { r: 0, c: 0 });
    // ライオンは(0,0)-(1,0)。シマウマが(0,1)アンカー(横2マス:(0,1)-(0,2))だとライオンと上下左右で接する。
    const anchors = ruleFilteredCandidateAnchors(state, 'z1');
    expect(anchors).not.toContainEqual({ r: 0, c: 1 });
    // (3,0)アンカー(横2マス:(3,0)-(3,1))はライオンから離れており許される。
    expect(anchors).toContainEqual({ r: 3, c: 0 });
  });

  test('ruleFilteredCandidateAnchors excludes anchors not adjacent to a required block, regardless of other pieces', () => {
    const stage = makeStage({
      terrain: [
        ['water', 'land', 'land', 'land', 'land'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('land')),
      ],
      animals: [{ instanceId: 'c1', species: 'crocodile' }],
    });
    const state = createGameState(stage);
    const anchors = ruleFilteredCandidateAnchors(state, 'c1');
    // ワニ(横2マス)はblockAdjacentRequired(water)を持つ。(0,1)は水ブロックに隣接するので候補に残る。
    expect(anchors).toContainEqual({ r: 0, c: 1 });
    // (3,3)は水ブロックから遠く、候補から外れる。
    expect(anchors).not.toContainEqual({ r: 3, c: 3 });
  });

  test('ruleFilteredCandidateAnchors does not exclude anchors for a not-yet-satisfiable requiring condition', () => {
    // adjacentRequiredのような「必要」系条件は、相手がまだ盤面にいなくても候補から除外してはいけない
    // （将来置かれる可能性があるため）。ウシツツキ(1x1)はgiraffeのとなりが必要。
    const stage = makeStage({ animals: [{ instanceId: 'o1', species: 'oxpecker' }] });
    const state = createGameState(stage);
    const anchors = ruleFilteredCandidateAnchors(state, 'o1');
    expect(anchors.length).toBe(25);
  });

  test("ruleFilteredCandidateAnchors also excludes anchors that would break an already-placed piece's forbidding condition", () => {
    // 種同士の禁止条件は片側（この場合シマウマ側）にしか書かれない設計。ライオン自身には
    // 条件が無いが、既に置かれているシマウマのadjacentForbidden(lion)を破る位置には
    // 置けないはずなので、ライオン側の候補生成でもそれを正しく除外できるかを確認する。
    const stage = makeStage({
      animals: [
        { instanceId: 'z1', species: 'zebra' },
        { instanceId: 'l1', species: 'lion' },
      ],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 'z1', { r: 0, c: 0 }); // シマウマ(横2):(0,0)-(0,1)
    const anchors = ruleFilteredCandidateAnchors(state, 'l1');
    // (1,0)アンカー(縦2:(1,0)-(2,0))は(0,0)と上下で接し、シマウマの条件を破る。
    expect(anchors).not.toContainEqual({ r: 1, c: 0 });
    // (3,0)アンカー(縦2:(3,0)-(4,0))はシマウマから離れており許される。
    expect(anchors).toContainEqual({ r: 3, c: 0 });
  });

  test('propagateToFixation solves a stage that only needs naked/hidden singles', () => {
    // ライオン(縦2マス)は列0の2箇所((0,0)アンカー/(3,0)アンカー)に幾何的な候補を持つが、
    // シマウマ(横2マス)は列3-4の(0,3)アンカーにしか幾何的に収まらない。
    // 「シマウマはライオンより上」というステージ限定ルールにより、シマウマが行0にいる以上
    // ライオンは行0に重なる(0,0)アンカーを取れず、(3,0)アンカーの1通りに絞られる。
    // シマウマは最初から幾何候補が1つしかないため即決まり(naked single)、続いて
    // このルールでライオンも1通りに絞られ、単純消去法だけで最後まで解ける。
    const stage: Stage = {
      id: 'propagation-l1',
      name: 'x',
      rows: 5,
      cols: 5,
      terrain: [
        ['land', 'wall', 'wall', 'land', 'land'],
        ['land', 'wall', 'wall', 'wall', 'wall'],
        ['wall', 'wall', 'wall', 'wall', 'wall'],
        ['land', 'wall', 'wall', 'wall', 'wall'],
        ['land', 'wall', 'wall', 'wall', 'wall'],
      ],
      animals: [
        { instanceId: 'l1', species: 'lion' },
        { instanceId: 'z1', species: 'zebra' },
      ],
      rules: [{ kind: 'above', a: 'zebra', b: 'lion' }],
    };
    const result = propagateToFixation(createGameState(stage));
    expect(result.contradiction).toBe(false);
    expect(result.fullySolved).toBe(true);
  });

  test('propagateToFixation reports contradiction when a species has zero candidates', () => {
    const stage = makeStage({
      terrain: Array.from({ length: 5 }, () => Array<CellTerrain>(5).fill('wall')),
      animals: [{ instanceId: 's1', species: 'squirrel' }],
    });
    // land が1マスも無いので、リスの置き場所がゼロ。
    const result = propagateToFixation(createGameState(stage));
    expect(result.contradiction).toBe(true);
    expect(result.fullySolved).toBe(false);
  });

  test('propagateToFixation does not report fullySolved when all pieces are placed but a requiring condition is unmet', () => {
    const stage = makeStage({
      terrain: [
        ['land', 'wall', 'wall', 'wall', 'wall'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: [{ instanceId: 'o1', species: 'oxpecker' }],
    });
    // landが1マスしかないのでウシツツキは伝播(naked single)だけで置き切れる。
    // しかしウシツツキのadjacentRequired(giraffe)はこのステージに満たしようがない
    // （キリンが1体もいない）ため、全部置き終わっても実際には解けていない。
    const result = propagateToFixation(createGameState(stage));
    expect(result.state.tray).toHaveLength(0);
    expect(result.fullySolved).toBe(false);
  });
});

describe('solverLevel', () => {
  test('L0 when the geometric packing is already unique', () => {
    const stage = makeStage({ animals: [{ instanceId: 's1', species: 'squirrel' }] });
    // land 25マス全部に対してリス1体だけなので、幾何的な詰め方は25通りある。
    // L0は「幾何解が1通りしかない」ケースなので、幾何解が2通り以上あるこの場合はL0にならない。
    expect(solverLevel(stage)).not.toBe('L0');
  });

  test('L0 when the board and the single piece leave exactly one geometric fit', () => {
    const stage = makeStage({
      terrain: [
        ['land', 'wall', 'wall', 'wall', 'wall'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: [{ instanceId: 's1', species: 'squirrel' }],
    });
    expect(solverLevel(stage)).toBe('L0');
  });

  test('L1 when propagation alone solves the stage', () => {
    const stage: Stage = {
      id: 'solver-level-l1',
      name: 'x',
      rows: 5,
      cols: 5,
      terrain: [
        ['land', 'wall', 'wall', 'land', 'land'],
        ['land', 'wall', 'wall', 'wall', 'wall'],
        ['wall', 'wall', 'wall', 'wall', 'wall'],
        ['land', 'wall', 'wall', 'wall', 'wall'],
        ['land', 'wall', 'wall', 'wall', 'wall'],
      ],
      animals: [
        { instanceId: 'l1', species: 'lion' },
        { instanceId: 'z1', species: 'zebra' },
      ],
      rules: [{ kind: 'above', a: 'zebra', b: 'lion' }],
    };
    // Task 2の `propagateToFixation solves a stage that only needs naked/hidden singles`
    // で確認済みのフィクスチャと同じ形。
    expect(solverLevel(stage)).toBe('L1');
  });

  test('unsolvable when the stage has zero solutions', () => {
    const stage = makeStage({
      terrain: Array.from({ length: 5 }, () => Array<CellTerrain>(5).fill('wall')),
      animals: [{ instanceId: 's1', species: 'squirrel' }],
    });
    expect(solverLevel(stage)).toBe('unsolvable');
  });

  test('at least L2 when propagation makes zero forced moves from the start but a solution exists', () => {
    // 自作フィクスチャではなく、既存の出荷ステージ stage-6（'6. はなれたライオン'）を使う。
    // このステージはライオン1体・キリン2体で、キリンの唯一の条件はadjacentForbidden(lion)。
    // 開始直後はライオン・キリンいずれの候補も複数かつ互いに対称なため、naked/hidden single
    // では最初の1手も確定できず、唯一解(real=1)に到達するには背理法が要ることが
    // 分割1以前からの分析で分かっている（ライオン・キリンの条件は分割1で変更していない）。
    const stage = STAGES.find((s) => s.id === 'stage-6')!;
    const level = solverLevel(stage);
    expect(level).not.toBe('L0');
    expect(level).not.toBe('L1');
    expect(level).not.toBe('unsolvable');
  });
});

describe('shipped stage content', () => {
  test.each(STAGES)('$id ($name) is structurally valid', (stage) => {
    expect(validateStage(stage)).toEqual([]);
  });

  test.each(STAGES)('$id ($name) has exactly one solution', (stage) => {
    expect(solutionStatus(stage)).toBe('unique');
  });

  test('every stage id is unique', () => {
    const ids = STAGES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every stage appears in exactly one chapter', () => {
    const chapterStageIds = CHAPTERS.flatMap((c) => c.stageIds);
    expect(chapterStageIds.sort()).toEqual(STAGES.map((s) => s.id).sort());
  });
});

describe('migrateStageTerrain', () => {
  test('turns removed sky cells into void and leaves everything else alone', () => {
    const legacy = {
      id: 'custom-1',
      name: '古いステージ',
      rows: 5,
      cols: 5,
      terrain: [
        ['sky', 'land', 'water', 'wall', 'void'],
        ...Array.from({ length: 4 }, () => Array(5).fill('land')),
      ],
      animals: [{ instanceId: 's0', species: 'squirrel' }],
    } as unknown as Stage;

    expect(migrateStageTerrain(legacy).terrain[0]).toEqual(['void', 'land', 'water', 'wall', 'void']);
  });

  test('returns an equivalent stage when there is nothing to migrate', () => {
    const stage = makeStage({ animals: [{ instanceId: 's0', species: 'squirrel' }] });
    expect(migrateStageTerrain(stage)).toEqual(stage);
  });
});

describe('species roster', () => {
  const allSpecies = Object.keys(SPECIES) as Species[];

  test('every species has a label and an emoji', () => {
    for (const sp of allSpecies) {
      expect(speciesLabel[sp]).toBeTruthy();
      expect(speciesEmoji[sp]).toBeTruthy();
    }
  });

  test('every condition refers to a species that exists', () => {
    for (const sp of allSpecies) {
      for (const c of SPECIES[sp].conditions) {
        if ('with' in c) expect(SPECIES[c.with]).toBeDefined();
        if ('from' in c) expect(SPECIES[c.from]).toBeDefined();
      }
    }
  });

  test('at least three species share each of the 1x1, vertical-domino and 2x2 shapes', () => {
    const byShape = new Map<string, Species[]>();
    for (const sp of allSpecies) {
      const shape = SPECIES[sp].shape;
      byShape.set(shape, [...(byShape.get(shape) ?? []), sp]);
    }
    expect(byShape.get('single')!.length).toBeGreaterThanOrEqual(3);
    expect(byShape.get('domino_v')!.length).toBeGreaterThanOrEqual(3);
    expect(byShape.get('square2x2')!.length).toBeGreaterThanOrEqual(3);
  });
});

describe('stage submission snippet', () => {
  test('encodes every block kind and includes stage rules', () => {
    const stage: Stage = {
      id: 'draft',
      name: 'てすと',
      rows: 5,
      cols: 5,
      terrain: [
        ['land', 'water', 'tree', 'wall', 'void'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: [{ instanceId: 's0', species: 'squirrel' }],
      rules: [
        { kind: 'above', a: 'squirrel', b: 'zebra' },
        { kind: 'exactDistance', a: 'squirrel', b: 'zebra', distance: 2 },
      ],
    };
    const snippet = buildStageCodeSnippet(stage);
    expect(snippet).toContain(`'.~T#x'`);

    // Pin the entire rules block — brackets, indentation, and each rule line's
    // trailing comma — not just a substring of one rule. This also covers a
    // mixed-type rule (exactDistance) so the numeric `distance` field must be
    // asserted unquoted (a serialization regression could emit `distance: '2'`,
    // which would silently break when pasted into stages.ts's number-typed field).
    const expectedRulesBlock = [
      '  rules: [',
      `    { kind: 'above', a: 'squirrel', b: 'zebra' },`,
      `    { kind: 'exactDistance', a: 'squirrel', b: 'zebra', distance: 2 },`,
      '  ],',
    ].join('\n');
    expect(snippet).toContain(expectedRulesBlock);
    expect(snippet).not.toContain(`distance: '2'`);
  });

  test('omits the rules block when a stage has none', () => {
    const stage: Stage = {
      id: 'draft',
      name: 'てすと',
      rows: 5,
      cols: 5,
      terrain: Array.from({ length: 5 }, () => Array<CellTerrain>(5).fill('wall')),
      animals: [{ instanceId: 's0', species: 'squirrel' }],
    };
    expect(buildStageCodeSnippet(stage)).not.toContain('rules:');
  });
});

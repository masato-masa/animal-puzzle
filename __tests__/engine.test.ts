import {
  boundingBox,
  canPlace,
  conditionCheckers,
  countSolutions,
  createGameState,
  isStageCleared,
  moveAnimal,
  placeAnimal,
  resetStage,
  returnPieceAt,
  shapeCells,
  solutionStatus,
  terrainAt,
  validateStage,
  type CellTerrain,
  type Stage,
} from '@/engine';
import { CHAPTERS, STAGES } from '@/levels/stages';

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

  test('canPlace rejects terrain mismatch', () => {
    const stage = makeStage({ animals: [{ instanceId: 'c1', species: 'crocodile' }] });
    const state = createGameState(stage);
    expect(canPlace(state, 'c1', { r: 0, c: 0 })).toBe(false);
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

  test('symbiosisRequired fails without the required neighbor and passes once adjacent', () => {
    const stage = makeStage({
      terrain: [
        ['sky', 'land', 'land', 'land', 'land'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('land')),
      ],
      animals: [
        { instanceId: 'o1', species: 'oxpecker' },
        { instanceId: 'g1', species: 'giraffe' },
      ],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 'o1', { r: 0, c: 0 });
    const oxAlone = state.placed[0];
    expect(
      conditionCheckers.symbiosisRequired(state, oxAlone, { kind: 'symbiosisRequired', with: 'giraffe' })
    ).toBe(false);

    state = placeAnimal(state, 'g1', { r: 1, c: 0 }); // (1,0),(2,0) -> (1,0) adjacent to (0,0)
    const oxWithGiraffe = state.placed.find((p) => p.instanceId === 'o1')!;
    expect(
      conditionCheckers.symbiosisRequired(state, oxWithGiraffe, { kind: 'symbiosisRequired', with: 'giraffe' })
    ).toBe(true);
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
    const stage = makeStage({ animals: [{ instanceId: 'zA', species: 'zebra' }] });
    let state = createGameState(stage);
    state = placeAnimal(state, 'zA', { r: 0, c: 0 });
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

  test('flags a per-terrain cell count mismatch', () => {
    const bad: Stage = {
      ...validStage,
      terrain: [Array<CellTerrain>(5).fill('water'), ...validStage.terrain.slice(1)],
    };
    expect(validateStage(bad).some((e) => e.includes('terrain "land" cell count'))).toBe(true);
  });

  test('flags flockRequired with fewer than 2 instances', () => {
    const stage: Stage = {
      id: 'lonely-zebra',
      name: 'x',
      rows: 5,
      cols: 5,
      terrain: Array.from({ length: 5 }, () => Array<CellTerrain>(5).fill('land')),
      animals: [
        { instanceId: 'z1', species: 'zebra' },
        ...Array.from({ length: 23 }, (_, i) => ({ instanceId: `s${i}`, species: 'squirrel' as const })),
      ],
    };
    expect(validateStage(stage).some((e) => e.includes('flockRequired but fewer than 2'))).toBe(true);
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

  test('flags symbiosisRequired with a missing partner species', () => {
    const stage: Stage = {
      id: 'lonely-oxpecker',
      name: 'x',
      rows: 5,
      cols: 5,
      terrain: [
        Array<CellTerrain>(5).fill('sky'),
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('land')),
      ],
      animals: [
        ...Array.from({ length: 5 }, (_, i) => ({ instanceId: `o${i}`, species: 'oxpecker' as const })),
        ...Array.from({ length: 20 }, (_, i) => ({ instanceId: `s${i}`, species: 'squirrel' as const })),
      ],
    };
    expect(validateStage(stage).some((e) => e.includes('symbiosisRequired(giraffe) but no giraffe'))).toBe(true);
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

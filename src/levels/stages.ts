import type { AnimalInstance, CellTerrain, Species, Stage } from '@/engine';

let uid = 0;
const animals = (spec: Array<[Species, number]>): AnimalInstance[] => {
  const list: AnimalInstance[] = [];
  for (const [species, count] of spec) {
    for (let i = 0; i < count; i++) list.push({ instanceId: `${species}-${uid++}`, species });
  }
  return list;
};

const TERRAIN_CHARS: Record<string, CellTerrain> = { '.': 'land', '~': 'water', T: 'tree', '#': 'wall', x: 'void' };
/** 1文字1マスの見取り図から地形グリッドを作る（.=平地 ~=水ブロック T=木ブロック #=壁 x=void）。 */
const terrain = (rows: string[]): CellTerrain[][] => rows.map((row) => row.split('').map((ch) => TERRAIN_CHARS[ch] ?? 'wall'));

/**
 * 全ステージはscripts/generate-open-stages.ts(開けた土地+animalRulesで唯一解に絞る方式、
 * 2026-09-04導入)で生成され、engine/solver.tsのcountSolutionsで唯一解であることと、
 * lib/stage-difficulty.tsのgradeStage/meetsChapterBarで章ごとの合格ラインを満たすことが
 * 検証済み（__tests__/engine.test.ts の「shipped stage content」回帰テストで継続的に
 * チェックされる）。壁で通り道を1本に絞る旧方式とは異なり、幾何学的な置き方は多数
 * （このバッチは全ステージで12通り以上）存在し、唯一解への絞り込みはanimalRules
 * (動物1種につきルール1つ)だけで行っている。手動で編集した場合は、その保証が
 * 失われる点に注意。
 */
export const STAGES: Stage[] = [
  // ==== 1章 ====
  {
    id: 'stage-1',
    name: '1. サルとウシツツキの上下',
    rows: 5,
    cols: 5,
    terrain: terrain(['#..##', '...##', '.#~##', '.....', '#.###']),
    animals: animals([['crocodile', 1], ['elephant', 1], ['oxpecker', 1], ['monkey', 1], ['leopard', 1], ['lion', 1]]),
    animalRules: {
      lion: { kind: 'exactDistance', with: 'monkey', distance: 3 },
      monkey: { kind: 'below', with: 'oxpecker' },
      crocodile: { kind: 'rightOf', with: 'oxpecker' },
      oxpecker: { kind: 'above', with: 'monkey' },
      leopard: { kind: 'surroundForbidden', with: 'elephant' },
      elephant: { kind: 'differentRow', with: 'lion' },
    },
  },
  {
    id: 'stage-2',
    name: '2. ヒョウとリスのきょり',
    rows: 5,
    cols: 5,
    terrain: terrain(['###..', '.....', '#.###', '...##', '.####']),
    animals: animals([['giraffe', 1], ['squirrel', 1], ['zebra', 1], ['elephant', 1], ['leopard', 1], ['oxpecker', 1]]),
    animalRules: {
      elephant: { kind: 'diagonalForbidden', with: 'oxpecker' },
      oxpecker: { kind: 'adjacentRequired', with: 'leopard' },
      zebra: { kind: 'exactDistance', with: 'elephant', distance: 1 },
      giraffe: { kind: 'exactDistance', with: 'zebra', distance: 1 },
      squirrel: { kind: 'differentCol', with: 'elephant' },
      leopard: { kind: 'adjacentForbidden', with: 'squirrel' },
    },
  },
  {
    id: 'stage-3',
    name: '3. サイとライオンの上下',
    rows: 5,
    cols: 5,
    terrain: terrain(['####.', '~###.', '.....', '..##.', '###..']),
    animals: animals([['crocodile', 1], ['squirrel', 1], ['monkey', 1], ['lion', 1], ['rhino', 1], ['giraffe', 1]]),
    animalRules: {
      squirrel: { kind: 'minDistance', from: 'lion', distance: 3 },
      monkey: { kind: 'differentRow', with: 'crocodile' },
      crocodile: { kind: 'below', with: 'squirrel' },
      rhino: { kind: 'exactDistance', with: 'squirrel', distance: 1 },
      lion: { kind: 'above', with: 'rhino' },
      giraffe: { kind: 'sameRow', with: 'monkey' },
    },
  },
  {
    id: 'stage-4',
    name: '4. ゴリラとリスの列',
    rows: 5,
    cols: 5,
    terrain: terrain(['#.###', '#...#', '##...', '##.T#', '...##']),
    animals: animals([['squirrel', 1], ['oxpecker', 1], ['monkey', 1], ['zebra', 1], ['gorilla', 1], ['lion', 1]]),
    animalRules: {
      lion: { kind: 'adjacentForbidden', with: 'monkey' },
      zebra: { kind: 'diagonalForbidden', with: 'monkey' },
      gorilla: { kind: 'sameCol', with: 'squirrel' },
      squirrel: { kind: 'surroundForbidden', with: 'gorilla' },
      oxpecker: { kind: 'minDistance', from: 'monkey', distance: 3 },
      monkey: { kind: 'adjacentRequired', with: 'gorilla' },
    },
  },
  // ==== 2章 ====
  {
    id: 'stage-5',
    name: '5. 水辺のシマウマとゴリラ',
    rows: 5,
    cols: 5,
    terrain: terrain(['..###', '#.###', '..~##', '....T', '#...#']),
    animals: animals([['zebra', 1], ['squirrel', 1], ['gorilla', 1], ['oxpecker', 1], ['leopard', 1], ['crocodile', 1]]),
    animalRules: {
      leopard: { kind: 'exactDistance', with: 'squirrel', distance: 2 },
      squirrel: { kind: 'differentRow', with: 'zebra' },
      oxpecker: { kind: 'surroundForbidden', with: 'squirrel' },
      crocodile: { kind: 'rightOf', with: 'gorilla' },
      gorilla: { kind: 'sameRow', with: 'zebra' },
      zebra: { kind: 'blockAdjacentRequired', block: 'water' },
    },
  },
  {
    id: 'stage-6',
    name: '6. キリンと水辺',
    rows: 5,
    cols: 5,
    terrain: terrain(['##..#', '##.##', '#...#', '~.#..', '#.##.']),
    animals: animals([['crocodile', 1], ['giraffe', 1], ['oxpecker', 1], ['leopard', 1], ['zebra', 1], ['lion', 1]]),
    animalRules: {
      leopard: { kind: 'minDistance', from: 'zebra', distance: 2 },
      giraffe: { kind: 'blockAdjacentRequired', block: 'water' },
      zebra: { kind: 'above', with: 'giraffe' },
      crocodile: { kind: 'sameCol', with: 'giraffe' },
      lion: { kind: 'adjacentForbidden', with: 'zebra' },
      oxpecker: { kind: 'diagonalForbidden', with: 'leopard' },
    },
  },
  {
    id: 'stage-7',
    name: '7. ライオンとリスの上下',
    rows: 5,
    cols: 5,
    terrain: terrain(['.~###', '.....', '###..', '##..#', '#...#']),
    animals: animals([['crocodile', 1], ['squirrel', 1], ['lion', 1], ['leopard', 1], ['elephant', 1], ['giraffe', 1]]),
    animalRules: {
      leopard: { kind: 'exactDistance', with: 'squirrel', distance: 1 },
      squirrel: { kind: 'diagonalForbidden', with: 'crocodile' },
      giraffe: { kind: 'diagonalForbidden', with: 'lion' },
      lion: { kind: 'above', with: 'squirrel' },
      crocodile: { kind: 'diagonalForbidden', with: 'leopard' },
      elephant: { kind: 'sameCol', with: 'leopard' },
    },
  },
  {
    id: 'stage-8',
    name: '8. ヒョウとゴリラのきょり',
    rows: 5,
    cols: 5,
    terrain: terrain(['#...#', '..#..', '..##.', 'T~#..', '###.#']),
    animals: animals([['squirrel', 1], ['crocodile', 1], ['leopard', 1], ['giraffe', 1], ['gorilla', 1], ['lion', 1]]),
    animalRules: {
      leopard: { kind: 'exactDistance', with: 'gorilla', distance: 1 },
      lion: { kind: 'adjacentForbidden', with: 'giraffe' },
      squirrel: { kind: 'differentRow', with: 'lion' },
      crocodile: { kind: 'sameCol', with: 'gorilla' },
      giraffe: { kind: 'adjacentForbidden', with: 'leopard' },
      gorilla: { kind: 'adjacentForbidden', with: 'leopard' },
    },
  },
  {
    id: 'stage-9',
    name: '9. キリンとシマウマのきょり',
    rows: 5,
    cols: 5,
    terrain: terrain(['##...', '~#.##', '...##', '##.##', '##.##']),
    animals: animals([['squirrel', 1], ['giraffe', 1], ['zebra', 1], ['crocodile', 1], ['monkey', 1], ['oxpecker', 1]]),
    animalRules: {
      zebra: { kind: 'exactDistance', with: 'giraffe', distance: 1 },
      giraffe: { kind: 'adjacentForbidden', with: 'monkey' },
      crocodile: { kind: 'diagonalForbidden', with: 'zebra' },
      monkey: { kind: 'differentCol', with: 'oxpecker' },
      oxpecker: { kind: 'minDistance', from: 'zebra', distance: 3 },
      squirrel: { kind: 'sameCol', with: 'giraffe' },
    },
  },
  // ==== 3章 ====
  {
    id: 'stage-10',
    name: '10. ヒョウとキリンの上下',
    rows: 5,
    cols: 5,
    terrain: terrain(['####.', '##.#.', '.#...', '...##', '~####']),
    animals: animals([['monkey', 1], ['lion', 1], ['crocodile', 1], ['squirrel', 1], ['giraffe', 1], ['leopard', 1]]),
    animalRules: {
      squirrel: { kind: 'leftOf', with: 'lion' },
      leopard: { kind: 'above', with: 'giraffe' },
      lion: { kind: 'minDistance', from: 'leopard', distance: 3 },
      monkey: { kind: 'minDistance', from: 'giraffe', distance: 2 },
      giraffe: { kind: 'leftOf', with: 'squirrel' },
      crocodile: { kind: 'below', with: 'leopard' },
    },
  },
  {
    id: 'stage-11',
    name: '11. サルとゴリラの列',
    rows: 5,
    cols: 5,
    terrain: terrain(['###..', '.##..', '.#..#', '....#', '###T#']),
    animals: animals([['giraffe', 1], ['squirrel', 1], ['gorilla', 1], ['leopard', 1], ['monkey', 1], ['zebra', 1]]),
    animalRules: {
      zebra: { kind: 'rightOf', with: 'monkey' },
      squirrel: { kind: 'adjacentForbidden', with: 'monkey' },
      monkey: { kind: 'leftOf', with: 'gorilla' },
      gorilla: { kind: 'sameRow', with: 'giraffe' },
      giraffe: { kind: 'differentCol', with: 'leopard' },
      leopard: { kind: 'sameCol', with: 'gorilla' },
    },
  },
  {
    id: 'stage-12',
    name: '12. キリンとヒョウのきょり',
    rows: 5,
    cols: 5,
    terrain: terrain(['###.#', '#...#', '#.#.#', '~.#..', '####.']),
    animals: animals([['squirrel', 1], ['monkey', 1], ['crocodile', 1], ['giraffe', 1], ['zebra', 1], ['leopard', 1]]),
    animalRules: {
      zebra: { kind: 'above', with: 'giraffe' },
      leopard: { kind: 'below', with: 'monkey' },
      crocodile: { kind: 'surroundForbidden', with: 'giraffe' },
      squirrel: { kind: 'rightOf', with: 'monkey' },
      giraffe: { kind: 'exactDistance', with: 'leopard', distance: 1 },
      monkey: { kind: 'differentCol', with: 'giraffe' },
    },
  },
  {
    id: 'stage-13',
    name: '13. ワニとウシツツキ',
    rows: 5,
    cols: 5,
    terrain: terrain(['.####', '.###~', '.....', '.##.#', '###.#']),
    animals: animals([['zebra', 1], ['crocodile', 1], ['lion', 1], ['oxpecker', 1], ['squirrel', 1], ['leopard', 1]]),
    animalRules: {
      leopard: { kind: 'differentCol', with: 'crocodile' },
      lion: { kind: 'surroundForbidden', with: 'zebra' },
      squirrel: { kind: 'minDistance', from: 'lion', distance: 3 },
      oxpecker: { kind: 'sameCol', with: 'leopard' },
      crocodile: { kind: 'minDistance', from: 'oxpecker', distance: 2 },
      zebra: { kind: 'adjacentRequired', with: 'crocodile' },
    },
  },
  {
    id: 'stage-14',
    name: '14. シマウマとリスの上下',
    rows: 5,
    cols: 5,
    terrain: terrain(['~####', '...##', '##..#', '###.#', '###..']),
    animals: animals([['zebra', 1], ['oxpecker', 1], ['squirrel', 1], ['crocodile', 1], ['giraffe', 1]]),
    animalRules: {
      oxpecker: { kind: 'minDistance', from: 'crocodile', distance: 2 },
      giraffe: { kind: 'above', with: 'zebra' },
      crocodile: { kind: 'sameRow', with: 'squirrel' },
      squirrel: { kind: 'differentRow', with: 'zebra' },
      zebra: { kind: 'minDistance', from: 'squirrel', distance: 2 },
    },
  },
  {
    id: 'stage-15',
    name: '15. サイとウシツツキの列',
    rows: 5,
    cols: 5,
    terrain: terrain(['..###', '#.###', '#....', '....#', '.####']),
    animals: animals([['squirrel', 1], ['zebra', 1], ['oxpecker', 1], ['rhino', 1], ['lion', 1], ['leopard', 1]]),
    animalRules: {
      zebra: { kind: 'differentCol', with: 'rhino' },
      leopard: { kind: 'adjacentRequired', with: 'oxpecker' },
      squirrel: { kind: 'sameCol', with: 'zebra' },
      oxpecker: { kind: 'leftOf', with: 'rhino' },
      rhino: { kind: 'adjacentRequired', with: 'squirrel' },
      lion: { kind: 'surroundForbidden', with: 'leopard' },
    },
  },
  // ==== 4章 ====
  {
    id: 'stage-16',
    name: '16. サルとライオンの上下',
    rows: 5,
    cols: 5,
    terrain: terrain(['###.#', '~...#', '#.#.#', '##..#', '##...']),
    animals: animals([['elephant', 1], ['squirrel', 1], ['crocodile', 1], ['oxpecker', 1], ['lion', 1], ['monkey', 1]]),
    animalRules: {
      monkey: { kind: 'above', with: 'lion' },
      elephant: { kind: 'below', with: 'squirrel' },
      lion: { kind: 'differentCol', with: 'squirrel' },
      oxpecker: { kind: 'rightOf', with: 'elephant' },
      squirrel: { kind: 'minDistance', from: 'elephant', distance: 2 },
      crocodile: { kind: 'leftOf', with: 'lion' },
    },
  },
  {
    id: 'stage-17',
    name: '17. キリンとウシツツキの上下',
    rows: 5,
    cols: 5,
    terrain: terrain(['###..', '###.#', '###.#', '##...', '...~#']),
    animals: animals([['crocodile', 1], ['oxpecker', 1], ['lion', 1], ['giraffe', 1], ['leopard', 1], ['monkey', 1]]),
    animalRules: {
      monkey: { kind: 'exactDistance', with: 'oxpecker', distance: 2 },
      lion: { kind: 'leftOf', with: 'giraffe' },
      crocodile: { kind: 'diagonalForbidden', with: 'giraffe' },
      giraffe: { kind: 'above', with: 'oxpecker' },
      leopard: { kind: 'minDistance', from: 'crocodile', distance: 3 },
      oxpecker: { kind: 'rightOf', with: 'lion' },
    },
  },
  {
    id: 'stage-18',
    name: '18. ワニとヒョウの決着',
    rows: 5,
    cols: 5,
    terrain: terrain(['~.###', '#..##', '##.##', '...##', '##...']),
    animals: animals([['giraffe', 1], ['monkey', 1], ['zebra', 1], ['crocodile', 1], ['leopard', 1], ['squirrel', 1]]),
    animalRules: {
      zebra: { kind: 'adjacentRequired', with: 'giraffe' },
      giraffe: { kind: 'minDistance', from: 'crocodile', distance: 2 },
      leopard: { kind: 'differentCol', with: 'giraffe' },
      monkey: { kind: 'below', with: 'leopard' },
      squirrel: { kind: 'sameRow', with: 'crocodile' },
      crocodile: { kind: 'adjacentForbidden', with: 'leopard' },
    },
  },
  {
    id: 'stage-19',
    name: '19. サイとライオンのきょり',
    rows: 5,
    cols: 5,
    terrain: terrain(['..##T', '.....', '#~#..', '#...#', '#...#']),
    animals: animals([['monkey', 1], ['lion', 1], ['leopard', 1], ['crocodile', 1], ['gorilla', 1], ['rhino', 1]]),
    animalRules: {
      crocodile: { kind: 'minDistance', from: 'lion', distance: 3 },
      rhino: { kind: 'leftOf', with: 'lion' },
      lion: { kind: 'differentRow', with: 'leopard' },
      monkey: { kind: 'above', with: 'crocodile' },
      gorilla: { kind: 'above', with: 'rhino' },
      leopard: { kind: 'adjacentRequired', with: 'crocodile' },
    },
  },
  {
    id: 'stage-20',
    name: '20. さいごのちょうせん',
    rows: 5,
    cols: 5,
    terrain: terrain(['###..', 'T.#..', '#.#..', '....#', '~#..#']),
    animals: animals([['gorilla', 1], ['leopard', 1], ['giraffe', 1], ['lion', 1], ['crocodile', 1], ['zebra', 1]]),
    animalRules: {
      gorilla: { kind: 'sameRow', with: 'lion' },
      leopard: { kind: 'leftOf', with: 'zebra' },
      zebra: { kind: 'rightOf', with: 'crocodile' },
      giraffe: { kind: 'surroundForbidden', with: 'zebra' },
      crocodile: { kind: 'differentRow', with: 'zebra' },
      lion: { kind: 'leftOf', with: 'leopard' },
    },
  },
];

const stageIdsFrom = (fromId: string, toId: string): string[] => {
  const from = STAGES.findIndex((s) => s.id === fromId);
  const to = STAGES.findIndex((s) => s.id === toId);
  return STAGES.slice(from, to + 1).map((s) => s.id);
};

export const CHAPTERS: { id: string; name: string; stageIds: string[] }[] = [
  { id: 'savanna-basics', name: '1章 サバンナのきほん', stageIds: stageIdsFrom('stage-1', 'stage-4') },
  { id: 'savanna-thinking', name: '2章 かんがえるサバンナ', stageIds: stageIdsFrom('stage-5', 'stage-9') },
  { id: 'wisdom-challenge', name: '3章 ちえくらべ', stageIds: stageIdsFrom('stage-10', 'stage-15') },
  { id: 'final-challenge', name: '4章 さいごのちょうせん', stageIds: stageIdsFrom('stage-16', 'stage-20') },
];

export const getStage = (id: string): Stage | undefined => STAGES.find((s) => s.id === id);

export const getStageIndex = (id: string): number => STAGES.findIndex((s) => s.id === id);

export const getNextStage = (id: string): Stage | undefined => {
  const index = getStageIndex(id);
  return index === -1 ? undefined : STAGES[index + 1];
};

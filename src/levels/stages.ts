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
 * 全ステージはscripts/generate-stages.test.tsで生成され、engine/solver.tsの
 * countSolutionsで唯一解であることと、lib/stage-difficulty.tsのgradeStage/
 * meetsChapterBarで章ごとの合格ラインを満たすことが検証済み
 * （__tests__/engine.test.ts の「shipped stage content」回帰テストで継続的にチェックされる）。
 * 手動で編集した場合は、その保証が失われる点に注意。
 */
export const STAGES: Stage[] = [
  {
    id: 'stage-1',
    name: '1. 1章 サバンナのきほん',
    rows: 6,
    cols: 7,
    terrain: terrain(['.#..#..', '.##.##.', '###.##.', '#######', '.##.##.', '.##.##.']),
    animals: animals([['giraffe', 2], ['zebra', 2], ['lion', 4]]),
  },
  {
    id: 'stage-2',
    name: '2. 1章 サバンナのきほん',
    rows: 5,
    cols: 5,
    terrain: terrain(['..###', '####.', '####.', '#.###', '#...#']),
    animals: animals([['zebra', 2], ['lion', 1], ['giraffe', 1]]),
  },
  {
    id: 'stage-3',
    name: '3. 1章 サバンナのきほん',
    rows: 6,
    cols: 5,
    terrain: terrain(['..#..', '.##..', '.####', '#####', '.##..', '.##..']),
    animals: animals([['zebra', 1], ['elephant', 2], ['giraffe', 1], ['lion', 1]]),
  },
  {
    id: 'stage-4',
    name: '4. 1章 サバンナのきほん',
    rows: 5,
    cols: 5,
    terrain: terrain(['...#.', '##.#.', '###.#', '###.#', '..###']),
    animals: animals([['leopard', 1], ['zebra', 2], ['lion', 2]]),
  },
  {
    id: 'stage-5',
    name: '5. 1章 サバンナのきほん',
    rows: 5,
    cols: 5,
    terrain: terrain(['..###', '####.', '####.', '#.###', '#...#']),
    animals: animals([['leopard', 1], ['lion', 1], ['zebra', 2]]),
  },
  {
    id: 'stage-6',
    name: '6. 2章 かんがえるサバンナ',
    rows: 5,
    cols: 7,
    terrain: terrain(['..###..', '##.#.##', '##.#.##', '.#####.', '...#...']),
    animals: animals([['giraffe', 2], ['zebra', 4], ['lion', 2]]),
  },
  {
    id: 'stage-7',
    name: '7. 2章 かんがえるサバンナ',
    rows: 5,
    cols: 5,
    terrain: terrain(['...#.', '##.#.', '###.#', '###.#', '..###']),
    animals: animals([['lion', 2], ['zebra', 2], ['giraffe', 1]]),
  },
  {
    id: 'stage-8',
    name: '8. 2章 かんがえるサバンナ',
    rows: 5,
    cols: 7,
    terrain: terrain(['...#...', '.#####.', '##.#.##', '##.#.##', '..###..']),
    animals: animals([['lion', 2], ['zebra', 4], ['leopard', 2]]),
  },
  {
    id: 'stage-9',
    name: '9. 3章 さいごのちょうせん',
    rows: 6,
    cols: 7,
    terrain: terrain(['.#.....', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.']),
    animals: animals([['giraffe', 2], ['zebra', 2], ['leopard', 4]]),
  },
  {
    id: 'stage-10',
    name: '10. 3章 さいごのちょうせん',
    rows: 6,
    cols: 7,
    terrain: terrain(['.....#.', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.']),
    animals: animals([['leopard', 4], ['lion', 2], ['zebra', 2]]),
  },
];

const stageIdsFrom = (fromId: string, toId: string): string[] => {
  const from = STAGES.findIndex((s) => s.id === fromId);
  const to = STAGES.findIndex((s) => s.id === toId);
  return STAGES.slice(from, to + 1).map((s) => s.id);
};

export const CHAPTERS: { id: string; name: string; stageIds: string[] }[] = [
  { id: 'savanna-basics', name: '1章 サバンナのきほん', stageIds: stageIdsFrom('stage-1', 'stage-5') },
  { id: 'savanna-thinking', name: '2章 かんがえるサバンナ', stageIds: stageIdsFrom('stage-6', 'stage-8') },
  { id: 'final-challenge', name: '3章 さいごのちょうせん', stageIds: stageIdsFrom('stage-9', 'stage-10') },
];

export const getStage = (id: string): Stage | undefined => STAGES.find((s) => s.id === id);

export const getStageIndex = (id: string): number => STAGES.findIndex((s) => s.id === id);

export const getNextStage = (id: string): Stage | undefined => {
  const index = getStageIndex(id);
  return index === -1 ? undefined : STAGES[index + 1];
};

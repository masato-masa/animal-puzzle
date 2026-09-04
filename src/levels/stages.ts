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
    rows: 7,
    cols: 5,
    terrain: terrain(['..#..', '.##..', '.####', '###..', '.##..', '.####', '###..']),
    animals: animals([['elephant', 2], ['zebra', 2], ['lion', 1], ['leopard', 1]]),
  },
  {
    id: 'stage-2',
    name: '2. 1章 サバンナのきほん',
    rows: 5,
    cols: 5,
    terrain: terrain(['..###', '####.', '####.', '#.###', '#...#']),
    animals: animals([['zebra', 2], ['leopard', 1], ['lion', 1]]),
  },
  {
    id: 'stage-3',
    name: '3. 1章 サバンナのきほん',
    rows: 6,
    cols: 5,
    terrain: terrain(['..#..', '.##..', '.####', '#####', '.##..', '.##..']),
    animals: animals([['leopard', 1], ['elephant', 2], ['lion', 1], ['zebra', 1]]),
  },
  {
    id: 'stage-4',
    name: '4. 1章 サバンナのきほん',
    rows: 5,
    cols: 5,
    terrain: terrain(['..#.#', '.##.#', '.####', '#####', '###..']),
    animals: animals([['zebra', 2], ['squirrel', 2], ['lion', 1]]),
  },
  {
    id: 'stage-5',
    name: '5. 1章 サバンナのきほん',
    rows: 6,
    cols: 5,
    terrain: terrain(['..#..', '.##..', '.####', '#####', '.##..', '.##..']),
    animals: animals([['zebra', 1], ['rhino', 2], ['leopard', 1], ['lion', 1]]),
  },
  {
    id: 'stage-6',
    name: '6. 2章 かんがえるサバンナ',
    rows: 5,
    cols: 7,
    terrain: terrain(['..###..', '##.#.##', '##.#.##', '.#####.', '...#...']),
    animals: animals([['zebra', 4], ['lion', 2], ['giraffe', 2]]),
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
    terrain: terrain(['..###..', '##.#.##', '##.#.##', '.#####.', '...#...']),
    animals: animals([['zebra', 4], ['lion', 2], ['leopard', 2]]),
  },
  {
    id: 'stage-9',
    name: '9. 2章 かんがえるサバンナ',
    rows: 5,
    cols: 5,
    terrain: terrain(['...#.', '##.#.', '###.#', '###.#', '..###']),
    animals: animals([['lion', 2], ['zebra', 2], ['leopard', 1]]),
  },
  {
    id: 'stage-10',
    name: '10. 2章 かんがえるサバンナ',
    rows: 6,
    cols: 7,
    terrain: terrain(['.....#.', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.']),
    animals: animals([['giraffe', 2], ['zebra', 2], ['leopard', 4]]),
  },
  {
    id: 'stage-11',
    name: '11. 3章 ゾウのひみつ',
    rows: 5,
    cols: 7,
    terrain: terrain(['..###..', '##.#.##', '##.#.##', '.#####.', '...#...']),
    animals: animals([['lion', 2], ['zebra', 4], ['giraffe', 2]]),
  },
  {
    id: 'stage-12',
    name: '12. 3章 ゾウのひみつ',
    rows: 5,
    cols: 7,
    terrain: terrain(['..###..', '##.#.##', '##.#.##', '.#####.', '...#...']),
    animals: animals([['leopard', 2], ['zebra', 4], ['lion', 2]]),
  },
  {
    id: 'stage-13',
    name: '13. 3章 ゾウのひみつ',
    rows: 5,
    cols: 5,
    terrain: terrain(['...#.', '##.#.', '###.#', '###.#', '..###']),
    animals: animals([['lion', 2], ['giraffe', 1], ['zebra', 2]]),
  },
  {
    id: 'stage-14',
    name: '14. 3章 ゾウのひみつ',
    rows: 6,
    cols: 7,
    terrain: terrain(['.....#.', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.']),
    animals: animals([['giraffe', 2], ['zebra', 2], ['leopard', 4]]),
  },
  {
    id: 'stage-15',
    name: '15. 3章 ゾウのひみつ',
    rows: 5,
    cols: 5,
    terrain: terrain(['...#.', '##.#.', '###.#', '###.#', '..###']),
    animals: animals([['lion', 2], ['zebra', 2], ['leopard', 1]]),
  },
  {
    id: 'stage-16',
    name: '16. 4章 ちえくらべ',
    rows: 5,
    cols: 5,
    terrain: terrain(['...#.', '##.#.', '###.#', '###.#', '..###']),
    animals: animals([['lion', 2], ['zebra', 2], ['giraffe', 1]]),
  },
  {
    id: 'stage-17',
    name: '17. 4章 ちえくらべ',
    rows: 6,
    cols: 7,
    terrain: terrain(['.....#.', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.']),
    animals: animals([['leopard', 4], ['zebra', 2], ['lion', 2]]),
  },
  {
    id: 'stage-18',
    name: '18. 4章 ちえくらべ',
    rows: 5,
    cols: 5,
    terrain: terrain(['...#.', '##.#.', '###.#', '###.#', '..###']),
    animals: animals([['lion', 2], ['zebra', 2], ['leopard', 1]]),
  },
  {
    id: 'stage-19',
    name: '19. 4章 ちえくらべ',
    rows: 5,
    cols: 7,
    terrain: terrain(['..###..', '##.#.##', '##.#.##', '.#####.', '...#...']),
    animals: animals([['zebra', 4], ['giraffe', 2], ['lion', 2]]),
  },
  {
    id: 'stage-20',
    name: '20. 4章 ちえくらべ',
    rows: 5,
    cols: 7,
    terrain: terrain(['..###..', '##.#.##', '##.#.##', '.#####.', '...#...']),
    animals: animals([['zebra', 4], ['leopard', 2], ['lion', 2]]),
  },
  {
    id: 'stage-21',
    name: '21. 5章 めいろのさばんな',
    rows: 6,
    cols: 7,
    terrain: terrain(['.....#.', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.']),
    animals: animals([['lion', 2], ['leopard', 4], ['zebra', 2]]),
  },
  {
    id: 'stage-22',
    name: '22. 5章 めいろのさばんな',
    rows: 6,
    cols: 7,
    terrain: terrain(['.....#.', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.']),
    animals: animals([['zebra', 2], ['lion', 2], ['leopard', 4]]),
  },
  {
    id: 'stage-23',
    name: '23. 5章 めいろのさばんな',
    rows: 6,
    cols: 7,
    terrain: terrain(['.....#.', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.']),
    animals: animals([['zebra', 2], ['giraffe', 2], ['leopard', 4]]),
  },
  {
    id: 'stage-24',
    name: '24. 5章 めいろのさばんな',
    rows: 6,
    cols: 7,
    terrain: terrain(['.....#.', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.']),
    animals: animals([['leopard', 4], ['lion', 2], ['zebra', 2]]),
  },
  {
    id: 'stage-25',
    name: '25. 6章 さいごのちょうせん',
    rows: 6,
    cols: 7,
    terrain: terrain(['.....#.', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.']),
    animals: animals([['giraffe', 2], ['leopard', 4], ['zebra', 2]]),
  },
  {
    id: 'stage-26',
    name: '26. 6章 さいごのちょうせん',
    rows: 6,
    cols: 7,
    terrain: terrain(['.....#.', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.']),
    animals: animals([['leopard', 4], ['lion', 2], ['zebra', 2]]),
  },
  {
    id: 'stage-27',
    name: '27. 6章 さいごのちょうせん',
    rows: 6,
    cols: 7,
    terrain: terrain(['.....#.', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.']),
    animals: animals([['zebra', 2], ['lion', 2], ['leopard', 4]]),
  },
  {
    id: 'stage-28',
    name: '28. 6章 さいごのちょうせん',
    rows: 6,
    cols: 7,
    terrain: terrain(['.....#.', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.']),
    animals: animals([['giraffe', 2], ['zebra', 2], ['leopard', 4]]),
  },
];

const stageIdsFrom = (fromId: string, toId: string): string[] => {
  const from = STAGES.findIndex((s) => s.id === fromId);
  const to = STAGES.findIndex((s) => s.id === toId);
  return STAGES.slice(from, to + 1).map((s) => s.id);
};

export const CHAPTERS: { id: string; name: string; stageIds: string[] }[] = [
  { id: 'savanna-basics', name: '1章 サバンナのきほん', stageIds: stageIdsFrom('stage-1', 'stage-5') },
  { id: 'savanna-thinking', name: '2章 かんがえるサバンナ', stageIds: stageIdsFrom('stage-6', 'stage-10') },
  { id: 'elephant-secret', name: '3章 ゾウのひみつ', stageIds: stageIdsFrom('stage-11', 'stage-15') },
  { id: 'wisdom-challenge', name: '4章 ちえくらべ', stageIds: stageIdsFrom('stage-16', 'stage-20') },
  { id: 'maze-savanna', name: '5章 めいろのさばんな', stageIds: stageIdsFrom('stage-21', 'stage-24') },
  { id: 'final-challenge', name: '6章 さいごのちょうせん', stageIds: stageIdsFrom('stage-25', 'stage-28') },
];

export const getStage = (id: string): Stage | undefined => STAGES.find((s) => s.id === id);

export const getStageIndex = (id: string): number => STAGES.findIndex((s) => s.id === id);

export const getNextStage = (id: string): Stage | undefined => {
  const index = getStageIndex(id);
  return index === -1 ? undefined : STAGES[index + 1];
};

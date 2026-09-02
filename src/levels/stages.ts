import type { AnimalInstance, CellTerrain, Species, Stage } from '@/engine';

let uid = 0;
const animals = (spec: Array<[Species, number]>): AnimalInstance[] => {
  const list: AnimalInstance[] = [];
  for (const [species, count] of spec) {
    for (let i = 0; i < count; i++) list.push({ instanceId: `${species}-${uid++}`, species });
  }
  return list;
};

const TERRAIN_CHARS: Record<string, CellTerrain> = { '.': 'land', '~': 'water', '^': 'sky', '#': 'wall', x: 'void' };
/** 1文字1マスの見取り図から地形グリッドを作る（.=平地 ~=水場 ^=空 #=壁 x=void）。 */
const terrain = (rows: string[]): CellTerrain[][] => rows.map((row) => row.split('').map((ch) => TERRAIN_CHARS[ch] ?? 'wall'));

/**
 * 全ステージは「配置可能なパターンが1通り」になるよう engine/solver.ts の countSolutions で
 * 検証済み（__tests__/engine.test.ts の「shipped stage content」回帰テストで継続的にチェックされる）。
 * 動物は1ステージ5体まで。壁(#)で盤面を好きな形に区切ることで、正方形でない見た目や
 * ピースの配置を一意に絞り込む仕掛けを表現している。
 */
export const STAGES: Stage[] = [
  {
    id: 'stage-1',
    name: '1. リスのひろば',
    rows: 5,
    cols: 5,
    terrain: terrain(['#####', '##.##', '#...#', '##.##', '#####']),
    animals: animals([['squirrel', 5]]),
  },
  {
    id: 'stage-2',
    name: '2. シマウマのなかまたち',
    rows: 5,
    cols: 5,
    terrain: terrain(['..###', '..###', '#####', '#####', '#####']),
    animals: animals([['zebra', 2]]),
  },
  {
    id: 'stage-3',
    name: '3. ライオンをちかづけるな',
    rows: 5,
    cols: 5,
    terrain: terrain(['..###', '..###', '.##.#', '.##.#', '#####']),
    animals: animals([
      ['zebra', 2],
      ['lion', 1],
      ['squirrel', 2],
    ]),
  },
  {
    id: 'stage-4',
    name: '4. キリンとライオンのきょり',
    rows: 5,
    cols: 5,
    terrain: terrain(['..###', '..###', '.##.#', '.##.#', '#####']),
    animals: animals([
      ['zebra', 2],
      ['giraffe', 1],
      ['lion', 1],
    ]),
  },
  {
    id: 'stage-5',
    name: '5. ゾウのなかよし',
    rows: 5,
    cols: 5,
    terrain: terrain(['#####', '....#', '....#', '#####', '#####']),
    animals: animals([['elephant', 2]]),
  },
  {
    id: 'stage-6',
    name: '6. はなれたライオン',
    rows: 5,
    cols: 5,
    terrain: terrain(['..#.#', '..#.#', '#####', '##.##', '#####']),
    animals: animals([
      ['lion', 1],
      ['giraffe', 2],
      ['squirrel', 1],
    ]),
  },
  {
    id: 'stage-7',
    name: '7. れつのひみつ',
    rows: 6,
    cols: 7,
    terrain: terrain(['..##..#', '.###.##', '.###.##', '#######', '.###.##', '.###.##']),
    animals: animals([
      ['zebra', 2],
      ['lion', 2],
      ['giraffe', 2],
    ]),
  },
  {
    id: 'stage-8',
    name: '8. しまうまのくさり',
    rows: 8,
    cols: 7,
    terrain: terrain([
      '..##..#',
      '.###.##',
      '.###.##',
      '#######',
      '.###.##',
      '.###.##',
      '#######',
      '..#####',
    ]),
    animals: animals([
      ['zebra', 3],
      ['lion', 2],
      ['giraffe', 2],
    ]),
  },
  {
    id: 'stage-9',
    name: '9. さばんなのだいさくせん',
    rows: 6,
    cols: 7,
    terrain: terrain(['..#..#.', '.##.##.', '.##.###', '#######', '.##.##.', '.##.##.']),
    animals: animals([
      ['zebra', 2],
      ['lion', 4],
      ['giraffe', 2],
    ]),
  },
  {
    id: 'stage-10',
    name: '10. ゾウのすきまさがし',
    rows: 6,
    cols: 5,
    terrain: terrain(['..#..', '.##..', '.####', '#####', '.##..', '.##..']),
    animals: animals([
      ['zebra', 1],
      ['lion', 1],
      ['giraffe', 1],
      ['elephant', 2],
    ]),
  },
  {
    id: 'stage-11',
    name: '11. わかれたせき',
    rows: 7,
    cols: 5,
    terrain: terrain(['..#..', '.##..', '.####', '###..', '.##..', '.####', '###..']),
    animals: animals([
      ['zebra', 2],
      ['lion', 1],
      ['giraffe', 1],
      ['elephant', 2],
    ]),
  },
  {
    id: 'stage-12',
    name: '12. たてにならぶゾウ',
    rows: 7,
    cols: 5,
    terrain: terrain(['..#..', '..##.', '####.', '..###', '..##.', '####.', '..###']),
    animals: animals([
      ['zebra', 2],
      ['lion', 1],
      ['squirrel', 2],
      ['elephant', 2],
    ]),
  },
  {
    id: 'stage-13',
    name: '13. しまうまのてがかり',
    rows: 6,
    cols: 7,
    terrain: terrain(['.....#.', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.']),
    animals: animals([
      ['lion', 3],
      ['giraffe', 3],
      ['zebra', 2],
    ]),
  },
  {
    id: 'stage-14',
    name: '14. みっつのおへや',
    rows: 7,
    cols: 5,
    terrain: terrain(['..#.#', '..#.#', '###..', '#####', '..#.#', '..#.#', '###..']),
    animals: animals([
      ['lion', 4],
      ['giraffe', 2],
      ['zebra', 2],
    ]),
  },
  {
    id: 'stage-15',
    name: '15. れんさのなぞ',
    rows: 7,
    cols: 8,
    terrain: terrain(['.....#..', '.#####..', '########', '########', '########', '######.#', '######.#']),
    animals: animals([
      ['lion', 2],
      ['giraffe', 2],
      ['zebra', 2],
    ]),
  },
  {
    id: 'stage-16',
    name: '16. じゅうじろのひみつ',
    rows: 8,
    cols: 7,
    terrain: terrain([
      '.######',
      '#.##.##',
      '#.##.##',
      '#....##',
      '#######',
      '#.##.##',
      '#.##.##',
      '######.',
    ]),
    animals: animals([
      ['lion', 2],
      ['giraffe', 2],
      ['zebra', 2],
      ['squirrel', 2],
    ]),
  },
  {
    id: 'stage-17',
    name: '17. とびとびのしまじま',
    rows: 7,
    cols: 8,
    terrain: terrain(['.###.##.', '####.###', '#....###', '########', '#.#####.', '#.#####.', '###.####']),
    animals: animals([
      ['giraffe', 1],
      ['lion', 2],
      ['zebra', 2],
      ['squirrel', 3],
    ]),
  },
  {
    id: 'stage-18',
    name: '18. ひしがたのさばんな',
    rows: 8,
    cols: 8,
    terrain: terrain([
      'xxx.#xxx',
      'xx.###xx',
      'x#.##.#x',
      '#####.#.',
      '.#....##',
      'x######x',
      'xx####xx',
      'xxx#.xxx',
    ]),
    animals: animals([
      ['giraffe', 1],
      ['lion', 1],
      ['zebra', 2],
      ['squirrel', 4],
    ]),
  },
];

const stageIdsFrom = (fromId: string, toId: string): string[] => {
  const from = STAGES.findIndex((s) => s.id === fromId);
  const to = STAGES.findIndex((s) => s.id === toId);
  return STAGES.slice(from, to + 1).map((s) => s.id);
};

export const CHAPTERS: { id: string; name: string; stageIds: string[] }[] = [
  { id: 'savanna-basics', name: '1章 サバンナのきほん', stageIds: stageIdsFrom('stage-1', 'stage-5') },
  { id: 'savanna-thinking', name: '2章 かんがえるサバンナ', stageIds: stageIdsFrom('stage-6', 'stage-9') },
  { id: 'elephant-secret', name: '3章 ゾウのひみつ', stageIds: stageIdsFrom('stage-10', 'stage-12') },
  { id: 'wisdom-challenge', name: '4章 ちえくらべ', stageIds: stageIdsFrom('stage-13', 'stage-15') },
  { id: 'maze-savanna', name: '5章 めいろのサバンナ', stageIds: stageIdsFrom('stage-16', 'stage-18') },
];

export const getStage = (id: string): Stage | undefined => STAGES.find((s) => s.id === id);

export const getStageIndex = (id: string): number => STAGES.findIndex((s) => s.id === id);

export const getNextStage = (id: string): Stage | undefined => {
  const index = getStageIndex(id);
  return index === -1 ? undefined : STAGES[index + 1];
};

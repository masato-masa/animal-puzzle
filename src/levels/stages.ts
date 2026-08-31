import type { AnimalInstance, CellTerrain, Species, Stage } from '@/engine';

let uid = 0;
const animals = (spec: Array<[Species, number]>): AnimalInstance[] => {
  const list: AnimalInstance[] = [];
  for (const [species, count] of spec) {
    for (let i = 0; i < count; i++) list.push({ instanceId: `${species}-${uid++}`, species });
  }
  return list;
};

const TERRAIN_CHARS: Record<string, CellTerrain> = { '.': 'land', '~': 'water', '^': 'sky', x: 'void' };
const terrain = (rows: string[]): CellTerrain[][] => rows.map((row) => row.split('').map((ch) => TERRAIN_CHARS[ch] ?? 'land'));
const landGrid = (rows: number, cols: number): CellTerrain[][] => Array.from({ length: rows }, () => Array<CellTerrain>(cols).fill('land'));

export const STAGES: Stage[] = [
  {
    id: 'stage-1',
    name: '1. リスのひろば',
    rows: 5,
    cols: 5,
    terrain: landGrid(5, 5),
    animals: animals([['squirrel', 25]]),
  },
  {
    id: 'stage-2',
    name: '2. ライオンとシマウマ',
    rows: 5,
    cols: 5,
    terrain: landGrid(5, 5),
    animals: animals([
      ['lion', 2],
      ['zebra', 2],
      ['squirrel', 17],
    ]),
  },
  {
    id: 'stage-3',
    name: '3. キリンのきょり',
    rows: 6,
    cols: 6,
    terrain: landGrid(6, 6),
    animals: animals([
      ['lion', 2],
      ['zebra', 2],
      ['giraffe', 2],
      ['squirrel', 24],
    ]),
  },
  {
    id: 'stage-4',
    name: '4. ワニのいる水辺',
    rows: 7,
    cols: 7,
    terrain: terrain([
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '~~.....',
      '~~.....',
    ]),
    animals: animals([
      ['lion', 2],
      ['zebra', 2],
      ['giraffe', 2],
      ['crocodile', 2],
      ['squirrel', 33],
    ]),
  },
  {
    id: 'stage-5',
    name: '5. サバンナ全開',
    rows: 8,
    cols: 8,
    terrain: terrain([
      '...^^...',
      '........',
      '........',
      '........',
      '........',
      '........',
      '~~......',
      '~~......',
    ]),
    animals: animals([
      ['lion', 2],
      ['zebra', 2],
      ['giraffe', 2],
      ['crocodile', 2],
      ['elephant', 2],
      ['oxpecker', 2],
      ['squirrel', 38],
    ]),
  },
  {
    id: 'stage-6',
    name: '6. じゅうじ型のひろば',
    rows: 7,
    cols: 7,
    terrain: terrain(['xxx.xxx', 'xxx.xxx', 'xxx.xxx', '.......', 'xxx.xxx', 'xxx.xxx', 'xxx.xxx']),
    animals: animals([['squirrel', 13]]),
  },
];

export const CHAPTERS: { id: string; name: string; stageIds: string[] }[] = [
  { id: 'savanna-basics', name: 'サバンナのきほん', stageIds: STAGES.map((s) => s.id) },
];

export const getStage = (id: string): Stage | undefined => STAGES.find((s) => s.id === id);

export const getStageIndex = (id: string): number => STAGES.findIndex((s) => s.id === id);

export const getNextStage = (id: string): Stage | undefined => {
  const index = getStageIndex(id);
  return index === -1 ? undefined : STAGES[index + 1];
};

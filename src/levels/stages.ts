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
 * 存在し、唯一解への絞り込みはanimalRules(動物1種につきルール1つ)だけで行っている。
 * 1章の最初の3面(stage-1〜3)は駒数2〜3体の入門用、それ以降は駒数4〜8体。
 * 2026-11-08（AP-7）: 外しても唯一解・思考レベルが変わらない「飾りのルール」を全面から
 * 取り除いた（220 → 126 個）。ルールの無い種は「とくに条件なし」で、どこに置いてもよい。
 * 2026-11-08（AP-8）: 序盤 1〜8 面は「新しい種類のルールを 1 面に 1 つだけ」導入する順に作り直した
 * （水のとなり→となりに置けない→上下→左右→同じ行→ななめ→距離以上→ちょうどの距離）。
 * 導入するルールはその面の唯一解を支える（テストで保証）。
 * 手動で編集した場合は、その保証が失われる点に注意。
 */
export const STAGES: Stage[] = [
  // ==== 1章 ====
  {
    id: 'stage-1',
    name: '1. サルは水のそば',
    rows: 3,
    cols: 4,
    terrain: terrain(['.###','.#~#','...#']),
    animals: animals([['zebra', 1], ['lion', 1], ['monkey', 1]]),
    animalRules: {
      monkey: { kind: 'blockAdjacentRequired', block: 'water' },
    },
  },
  {
    id: 'stage-2',
    name: '2. シマウマはサイがにがて',
    rows: 3,
    cols: 4,
    terrain: terrain(['.#..','.#..','...#']),
    animals: animals([['oxpecker', 1], ['rhino', 1], ['leopard', 1], ['zebra', 1]]),
    animalRules: {
      zebra: { kind: 'adjacentForbidden', with: 'rhino' },
    },
  },
  {
    id: 'stage-3',
    name: '3. ヒョウはゴリラのうえ',
    rows: 4,
    cols: 4,
    terrain: terrain(['#...','#.##','#...','##..']),
    animals: animals([['oxpecker', 1], ['crocodile', 1], ['leopard', 1], ['gorilla', 1]]),
    animalRules: {
      leopard: { kind: 'above', with: 'gorilla' },
    },
  },
  {
    id: 'stage-4',
    name: '4. サルはキリンのみぎ',
    rows: 3,
    cols: 4,
    terrain: terrain(['#...','..#.','.###']),
    animals: animals([['leopard', 1], ['monkey', 1], ['giraffe', 1], ['lion', 1]]),
    animalRules: {
      monkey: { kind: 'rightOf', with: 'giraffe' },
      lion: { kind: 'below', with: 'monkey' },
    },
  },
  {
    id: 'stage-5',
    name: '5. ワニとサルはおなじぎょう',
    rows: 5,
    cols: 4,
    terrain: terrain(['..##','...#','.#..','.###','.###']),
    animals: animals([['rhino', 1], ['crocodile', 1], ['monkey', 1], ['squirrel', 1], ['giraffe', 1]]),
    animalRules: {
      crocodile: { kind: 'sameRow', with: 'monkey' },
    },
  },
  {
    id: 'stage-6',
    name: '6. ゴリラはヒョウのななめがにがて',
    rows: 4,
    cols: 4,
    terrain: terrain(['#...','##..','...#','.#.#']),
    animals: animals([['leopard', 1], ['gorilla', 1], ['giraffe', 1], ['squirrel', 1], ['oxpecker', 1]]),
    animalRules: {
      gorilla: { kind: 'diagonalForbidden', with: 'leopard' },
      giraffe: { kind: 'below', with: 'squirrel' },
    },
  },
  {
    id: 'stage-7',
    name: '7. サイはシマウマからはなれて',
    rows: 5,
    cols: 5,
    terrain: terrain(['#####','#....','#..##','#.###','#....']),
    animals: animals([['rhino', 1], ['zebra', 1], ['leopard', 1], ['oxpecker', 1], ['crocodile', 1]]),
    animalRules: {
      rhino: { kind: 'minDistance', from: 'zebra', distance: 2 },
    },
  },
  {
    id: 'stage-8',
    name: '8. ゴリラとサルのあいだ',
    rows: 4,
    cols: 5,
    terrain: terrain(['#..##','#.###','..###','.....']),
    animals: animals([['oxpecker', 1], ['monkey', 1], ['zebra', 1], ['lion', 1], ['gorilla', 1]]),
    animalRules: {
      gorilla: { kind: 'exactDistance', with: 'monkey', distance: 2 },
    },
  },
  {
    id: 'stage-9',
    name: '9. 森と水辺のなかまたち',
    rows: 5,
    cols: 5,
    terrain: terrain(['T..##', '#~.##', '##.#.', '#..#.', '#....']),
    animals: animals([['lion', 1], ['squirrel', 1], ['crocodile', 1], ['gorilla', 1], ['leopard', 1], ['oxpecker', 1]]),
    animalRules: {
      crocodile: { kind: 'above', with: 'gorilla' },
      lion: { kind: 'exactDistance', with: 'leopard', distance: 1 },
      leopard: { kind: 'minDistance', from: 'crocodile', distance: 2 },
      gorilla: { kind: 'adjacentForbidden', with: 'oxpecker' },
    },
  },
  // ==== 2章 ====
  {
    id: 'stage-10',
    name: '10. となりのサル',
    rows: 4,
    cols: 4,
    terrain: terrain(['#...', '..#.', '.##.', '.###']),
    animals: animals([['squirrel', 1], ['lion', 1], ['monkey', 1], ['leopard', 1], ['oxpecker', 1], ['zebra', 1]]),
    animalRules: {
      zebra: { kind: 'exactDistance', with: 'squirrel', distance: 1 },
      leopard: { kind: 'above', with: 'squirrel' },
      oxpecker: { kind: 'minDistance', from: 'zebra', distance: 2 },
      lion: { kind: 'sameRow', with: 'monkey' },
    },
  },
  {
    id: 'stage-11',
    name: '11. 水辺のキリン',
    rows: 5,
    cols: 3,
    terrain: terrain(['.##', '.##', '.##', '..#', '~..']),
    animals: animals([['crocodile', 1], ['squirrel', 1], ['giraffe', 1], ['monkey', 1], ['oxpecker', 1]]),
    animalRules: {
      squirrel: { kind: 'blockAdjacentRequired', block: 'water' },
      monkey: { kind: 'sameCol', with: 'squirrel' },
      giraffe: { kind: 'adjacentForbidden', with: 'squirrel' },
    },
  },
  {
    id: 'stage-12',
    name: '12. キリンをさがして',
    rows: 5,
    cols: 2,
    terrain: terrain(['..', '.#', '.#', '.#', '..']),
    animals: animals([['squirrel', 1], ['monkey', 1], ['giraffe', 1], ['leopard', 1], ['oxpecker', 1]]),
    animalRules: {
      monkey: { kind: 'minDistance', from: 'giraffe', distance: 3 },
      leopard: { kind: 'adjacentForbidden', with: 'giraffe' },
      giraffe: { kind: 'differentCol', with: 'squirrel' },
      oxpecker: { kind: 'below', with: 'squirrel' },
    },
  },
  {
    id: 'stage-13',
    name: '13. ワニとヒョウの下',
    rows: 5,
    cols: 5,
    terrain: terrain(['.....', '.###.', '####.', '###~.', '####.']),
    animals: animals([['oxpecker', 1], ['lion', 1], ['monkey', 1], ['zebra', 1], ['leopard', 1], ['crocodile', 1]]),
    animalRules: {
      crocodile: { kind: 'exactDistance', with: 'oxpecker', distance: 2 },
      lion: { kind: 'exactDistance', with: 'monkey', distance: 3 },
      monkey: { kind: 'surroundForbidden', with: 'zebra' },
    },
  },
  {
    id: 'stage-14',
    name: '14. ライオンとワニ',
    rows: 4,
    cols: 4,
    terrain: terrain(['...#', '##.#', '##..', '#..~']),
    animals: animals([['monkey', 1], ['zebra', 1], ['squirrel', 1], ['crocodile', 1], ['lion', 1]]),
    animalRules: {
      zebra: { kind: 'diagonalForbidden', with: 'lion' },
      lion: { kind: 'sameRow', with: 'crocodile' },
      squirrel: { kind: 'adjacentForbidden', with: 'lion' },
    },
  },
  {
    id: 'stage-15',
    name: '15. 8ひきのなかまたち',
    rows: 5,
    cols: 6,
    terrain: terrain(['#...T#', '..#..#', '...#..', '#.###.', '#.###~']),
    animals: animals([
      ['lion', 1],
      ['crocodile', 1],
      ['squirrel', 1],
      ['giraffe', 1],
      ['oxpecker', 1],
      ['zebra', 1],
      ['gorilla', 1],
      ['monkey', 1],
    ]),
    animalRules: {
      squirrel: { kind: 'sameCol', with: 'gorilla' },
      oxpecker: { kind: 'surroundForbidden', with: 'lion' },
      gorilla: { kind: 'adjacentForbidden', with: 'oxpecker' },
      crocodile: { kind: 'minDistance', from: 'gorilla', distance: 3 },
    },
  },
  {
    id: 'stage-16',
    name: '16. もりのしまうま',
    rows: 5,
    cols: 5,
    terrain: terrain(['.....', '..##.', '.##..', '...##', '#T.##']),
    animals: animals([
      ['giraffe', 1],
      ['leopard', 1],
      ['squirrel', 1],
      ['gorilla', 1],
      ['monkey', 1],
      ['lion', 1],
      ['zebra', 1],
      ['oxpecker', 1],
    ]),
    animalRules: {
      giraffe: { kind: 'exactDistance', with: 'leopard', distance: 3 },
      leopard: { kind: 'sameCol', with: 'zebra' },
      lion: { kind: 'differentRow', with: 'squirrel' },
      oxpecker: { kind: 'minDistance', from: 'gorilla', distance: 3 },
    },
  },
  {
    id: 'stage-17',
    name: '17. 水辺のシマウマとキリン',
    rows: 4,
    cols: 4,
    terrain: terrain(['..##', '#...', '#~#.', '##..']),
    animals: animals([['squirrel', 1], ['crocodile', 1], ['zebra', 1], ['giraffe', 1], ['oxpecker', 1]]),
    animalRules: {
      zebra: { kind: 'minDistance', from: 'crocodile', distance: 2 },
      giraffe: { kind: 'surroundForbidden', with: 'crocodile' },
      squirrel: { kind: 'sameRow', with: 'zebra' },
    },
  },
  {
    id: 'stage-18',
    name: '18. ライオンとサル',
    rows: 5,
    cols: 3,
    terrain: terrain(['.##', '...', '#.#', '..~', '.##']),
    animals: animals([['leopard', 1], ['monkey', 1], ['crocodile', 1], ['lion', 1], ['squirrel', 1]]),
    animalRules: {
      lion: { kind: 'diagonalForbidden', with: 'leopard' },
      leopard: { kind: 'diagonalForbidden', with: 'monkey' },
      crocodile: { kind: 'surroundForbidden', with: 'lion' },
    },
  },
  {
    id: 'stage-19',
    name: '19. 3びきのちえくらべ',
    rows: 5,
    cols: 1,
    terrain: terrain(['.', '.', '.', '.', '.']),
    animals: animals([['squirrel', 1], ['leopard', 1], ['giraffe', 1]]),
    animalRules: {
      giraffe: { kind: 'above', with: 'squirrel' },
      leopard: { kind: 'exactDistance', with: 'giraffe', distance: 1 },
    },
  },
  // ==== 3章 ====
  {
    id: 'stage-20',
    name: '20. ななめのひみつ',
    rows: 5,
    cols: 4,
    terrain: terrain(['..##', '..##', '#.#.', '#...', '###.']),
    animals: animals([['zebra', 1], ['giraffe', 1], ['leopard', 1], ['lion', 1], ['oxpecker', 1], ['squirrel', 1]]),
    animalRules: {
      leopard: { kind: 'exactDistance', with: 'squirrel', distance: 1 },
      giraffe: { kind: 'above', with: 'squirrel' },
      zebra: { kind: 'leftOf', with: 'squirrel' },
    },
  },
  {
    id: 'stage-21',
    name: '21. ゾウとワニ',
    rows: 4,
    cols: 4,
    terrain: terrain(['.#..', '.#.~', '....', '..##']),
    animals: animals([['crocodile', 1], ['oxpecker', 1], ['squirrel', 1], ['leopard', 1], ['monkey', 1], ['elephant', 1]]),
    animalRules: {
      elephant: { kind: 'surroundForbidden', with: 'crocodile' },
      oxpecker: { kind: 'adjacentRequired', with: 'squirrel' },
      monkey: { kind: 'above', with: 'elephant' },
      squirrel: { kind: 'exactDistance', with: 'elephant', distance: 1 },
    },
  },
  {
    id: 'stage-22',
    name: '22. サイとサル',
    rows: 4,
    cols: 5,
    terrain: terrain(['###..', '..##.', '..#..', '~....']),
    animals: animals([['squirrel', 1], ['elephant', 1], ['oxpecker', 1], ['rhino', 1], ['crocodile', 1], ['monkey', 1]]),
    animalRules: {
      squirrel: { kind: 'below', with: 'rhino' },
      rhino: { kind: 'minDistance', from: 'monkey', distance: 3 },
    },
  },
  {
    id: 'stage-23',
    name: '23. ライオンとゾウ',
    rows: 5,
    cols: 4,
    terrain: terrain(['..#.', '....', '.#..', '.###', '.~##']),
    animals: animals([['monkey', 1], ['squirrel', 1], ['lion', 1], ['elephant', 1], ['leopard', 1], ['crocodile', 1]]),
    animalRules: {
      squirrel: { kind: 'adjacentForbidden', with: 'elephant' },
      lion: { kind: 'rightOf', with: 'elephant' },
    },
  },
  {
    id: 'stage-24',
    name: '24. キリンとライオン',
    rows: 3,
    cols: 4,
    terrain: terrain(['###.', '.##.', '....']),
    animals: animals([['giraffe', 1], ['lion', 1], ['oxpecker', 1], ['monkey', 1], ['squirrel', 1]]),
    animalRules: {
      oxpecker: { kind: 'minDistance', from: 'giraffe', distance: 2 },
      giraffe: { kind: 'leftOf', with: 'squirrel' },
      squirrel: { kind: 'sameRow', with: 'lion' },
      lion: { kind: 'diagonalForbidden', with: 'monkey' },
    },
  },
  {
    id: 'stage-25',
    name: '25. 森と岩場のちえくらべ',
    rows: 6,
    cols: 6,
    terrain: terrain(['#..###', '~#....', '....#.', '..##..', '#T##..', '#####.']),
    animals: animals([
      ['oxpecker', 1],
      ['giraffe', 1],
      ['gorilla', 1],
      ['monkey', 1],
      ['zebra', 1],
      ['leopard', 1],
      ['crocodile', 1],
      ['rhino', 1],
    ]),
    animalRules: {
      gorilla: { kind: 'minDistance', from: 'zebra', distance: 3 },
      rhino: { kind: 'blockAdjacentRequired', block: 'tree' },
      monkey: { kind: 'exactDistance', with: 'zebra', distance: 1 },
      giraffe: { kind: 'differentRow', with: 'gorilla' },
    },
  },
  {
    id: 'stage-26',
    name: '26. サイとゾウの試練',
    rows: 6,
    cols: 5,
    terrain: terrain(['#...#', '###..', '.##.#', '.#..#', '....#', '#~#.#']),
    animals: animals([
      ['oxpecker', 1],
      ['squirrel', 1],
      ['giraffe', 1],
      ['lion', 1],
      ['crocodile', 1],
      ['elephant', 1],
      ['zebra', 1],
      ['monkey', 1],
    ]),
    animalRules: {
      zebra: { kind: 'diagonalForbidden', with: 'lion' },
      giraffe: { kind: 'minDistance', from: 'zebra', distance: 3 },
      squirrel: { kind: 'rightOf', with: 'giraffe' },
      monkey: { kind: 'diagonalForbidden', with: 'elephant' },
    },
  },
  {
    id: 'stage-27',
    name: '27. サルとキリンの推理',
    rows: 4,
    cols: 5,
    terrain: terrain(['#....', '~..#.', '#.##.', '#.###']),
    animals: animals([['monkey', 1], ['giraffe', 1], ['crocodile', 1], ['oxpecker', 1], ['lion', 1], ['leopard', 1]]),
    animalRules: {
      leopard: { kind: 'sameCol', with: 'crocodile' },
      crocodile: { kind: 'exactDistance', with: 'giraffe', distance: 1 },
      lion: { kind: 'diagonalForbidden', with: 'crocodile' },
      monkey: { kind: 'above', with: 'oxpecker' },
    },
  },
  {
    id: 'stage-28',
    name: '28. シマウマのれつ',
    rows: 5,
    cols: 3,
    terrain: terrain(['##.', '##.', '...', '##.', '##.']),
    animals: animals([['zebra', 1], ['oxpecker', 1], ['monkey', 1], ['squirrel', 1], ['giraffe', 1]]),
    animalRules: {
      giraffe: { kind: 'minDistance', from: 'squirrel', distance: 3 },
      monkey: { kind: 'above', with: 'zebra' },
      oxpecker: { kind: 'diagonalForbidden', with: 'zebra' },
    },
  },
  {
    id: 'stage-29',
    name: '29. 4ひきのなぞ',
    rows: 5,
    cols: 2,
    terrain: terrain(['#.', '#.', '..', '.#', '.#']),
    animals: animals([['lion', 1], ['oxpecker', 1], ['squirrel', 1], ['giraffe', 1]]),
    animalRules: {
      oxpecker: { kind: 'sameRow', with: 'giraffe' },
      lion: { kind: 'above', with: 'squirrel' },
    },
  },
  {
    id: 'stage-30',
    name: '30. さいしょのちょうせん',
    rows: 4,
    cols: 2,
    terrain: terrain(['.#', '.#', '.#', '..']),
    animals: animals([['squirrel', 1], ['oxpecker', 1], ['leopard', 1], ['monkey', 1]]),
    animalRules: {
      squirrel: { kind: 'adjacentForbidden', with: 'leopard' },
      oxpecker: { kind: 'rightOf', with: 'monkey' },
      monkey: { kind: 'diagonalForbidden', with: 'oxpecker' },
    },
  },
  // ==== 4章 ====
  {
    id: 'stage-31',
    name: '31. シマウマとキリンの決着',
    rows: 5,
    cols: 4,
    terrain: terrain(['.###', '.#..', '....', '###.', '###.']),
    animals: animals([['zebra', 1], ['lion', 1], ['oxpecker', 1], ['giraffe', 1], ['monkey', 1], ['leopard', 1]]),
    animalRules: {
      leopard: { kind: 'sameCol', with: 'giraffe' },
      zebra: { kind: 'sameRow', with: 'giraffe' },
      oxpecker: { kind: 'exactDistance', with: 'lion', distance: 1 },
      monkey: { kind: 'rightOf', with: 'zebra' },
    },
  },
  {
    id: 'stage-32',
    name: '32. ライオンとキリンのきずな',
    rows: 4,
    cols: 5,
    terrain: terrain(['..#..', '#...#', '#.###', '#.###']),
    animals: animals([['oxpecker', 1], ['giraffe', 1], ['squirrel', 1], ['zebra', 1], ['monkey', 1], ['lion', 1]]),
    animalRules: {
      zebra: { kind: 'differentRow', with: 'monkey' },
      monkey: { kind: 'minDistance', from: 'lion', distance: 3 },
      giraffe: { kind: 'rightOf', with: 'lion' },
      oxpecker: { kind: 'below', with: 'squirrel' },
      lion: { kind: 'below', with: 'giraffe' },
    },
  },
  {
    id: 'stage-33',
    name: '33. 水辺のライオン',
    rows: 4,
    cols: 5,
    terrain: terrain(['..###', '#.##.', '~....', '#.###']),
    animals: animals([['lion', 1], ['monkey', 1], ['zebra', 1], ['crocodile', 1], ['leopard', 1]]),
    animalRules: {
      lion: { kind: 'minDistance', from: 'crocodile', distance: 3 },
      monkey: { kind: 'above', with: 'leopard' },
    },
  },
  {
    id: 'stage-34',
    name: '34. ワニとヒョウのやくそく',
    rows: 3,
    cols: 4,
    terrain: terrain(['..##', '.#~.', '....']),
    animals: animals([['crocodile', 1], ['leopard', 1], ['monkey', 1], ['oxpecker', 1], ['zebra', 1]]),
    animalRules: {
      monkey: { kind: 'above', with: 'zebra' },
      zebra: { kind: 'minDistance', from: 'monkey', distance: 3 },
      leopard: { kind: 'adjacentRequired', with: 'crocodile' },
      oxpecker: { kind: 'differentCol', with: 'zebra' },
    },
  },
  {
    id: 'stage-35',
    name: '35. 水辺のヒョウとキリン',
    rows: 5,
    cols: 5,
    terrain: terrain(['##..#', '##.##', '.....', '##~#.', '####.']),
    animals: animals([['leopard', 1], ['giraffe', 1], ['monkey', 1], ['zebra', 1], ['crocodile', 1], ['oxpecker', 1]]),
    animalRules: {
      oxpecker: { kind: 'minDistance', from: 'leopard', distance: 2 },
      zebra: { kind: 'rightOf', with: 'monkey' },
      crocodile: { kind: 'adjacentForbidden', with: 'zebra' },
      monkey: { kind: 'minDistance', from: 'oxpecker', distance: 2 },
    },
  },
  {
    id: 'stage-36',
    name: '36. サイなきサバンナ',
    rows: 5,
    cols: 4,
    terrain: terrain(['...#', '.#.#', '.#..', '###.', '###.']),
    animals: animals([['lion', 1], ['zebra', 1], ['squirrel', 1], ['giraffe', 1], ['leopard', 1], ['monkey', 1]]),
    animalRules: {
      zebra: { kind: 'below', with: 'monkey' },
      leopard: { kind: 'minDistance', from: 'squirrel', distance: 2 },
      giraffe: { kind: 'above', with: 'lion' },
      monkey: { kind: 'adjacentForbidden', with: 'squirrel' },
    },
  },
  {
    id: 'stage-37',
    name: '37. サイとゴリラの大試練',
    rows: 7,
    cols: 5,
    terrain: terrain(['..#.#', '..#..', '#....', '###.#', '##~.T', '....#', '##.##']),
    animals: animals([
      ['leopard', 1],
      ['gorilla', 1],
      ['lion', 1],
      ['zebra', 1],
      ['crocodile', 1],
      ['oxpecker', 1],
      ['rhino', 1],
      ['squirrel', 1],
    ]),
    animalRules: {
      gorilla: { kind: 'leftOf', with: 'rhino' },
      lion: { kind: 'sameRow', with: 'squirrel' },
      crocodile: { kind: 'adjacentRequired', with: 'gorilla' },
    },
  },
  {
    id: 'stage-38',
    name: '38. 3つの水辺',
    rows: 3,
    cols: 3,
    terrain: terrain(['...', '.~#', '...']),
    animals: animals([['monkey', 1], ['oxpecker', 1], ['zebra', 1], ['squirrel', 1], ['crocodile', 1]]),
    animalRules: {
      crocodile: { kind: 'exactDistance', with: 'squirrel', distance: 1 },
      monkey: { kind: 'adjacentRequired', with: 'zebra' },
      squirrel: { kind: 'above', with: 'crocodile' },
    },
  },
  {
    id: 'stage-39',
    name: '39. キリンとワニの一直線',
    rows: 2,
    cols: 4,
    terrain: terrain(['.~.#', '....']),
    animals: animals([['giraffe', 1], ['crocodile', 1], ['oxpecker', 1], ['squirrel', 1]]),
    animalRules: {
      squirrel: { kind: 'leftOf', with: 'oxpecker' },
      giraffe: { kind: 'adjacentRequired', with: 'crocodile' },
      crocodile: { kind: 'rightOf', with: 'giraffe' },
    },
  },
  {
    id: 'stage-40',
    name: '40. げんかいちょうせん',
    rows: 5,
    cols: 5,
    terrain: terrain(['###.#', '~...#', '...##', '.#...', '.####']),
    animals: animals([['elephant', 1], ['monkey', 1], ['oxpecker', 1], ['crocodile', 1], ['giraffe', 1], ['lion', 1]]),
    animalRules: {
      lion: { kind: 'adjacentRequired', with: 'oxpecker' },
      crocodile: { kind: 'rightOf', with: 'monkey' },
      monkey: { kind: 'below', with: 'oxpecker' },
    },
  },
];

const stageIdsFrom = (fromId: string, toId: string): string[] => {
  const from = STAGES.findIndex((s) => s.id === fromId);
  const to = STAGES.findIndex((s) => s.id === toId);
  return STAGES.slice(from, to + 1).map((s) => s.id);
};

export const CHAPTERS: { id: string; name: string; stageIds: string[] }[] = [
  { id: 'savanna-basics', name: '1章 サバンナのきほん', stageIds: stageIdsFrom('stage-1', 'stage-9') },
  { id: 'savanna-thinking', name: '2章 かんがえるサバンナ', stageIds: stageIdsFrom('stage-10', 'stage-19') },
  { id: 'wisdom-challenge', name: '3章 ちえくらべ', stageIds: stageIdsFrom('stage-20', 'stage-30') },
  { id: 'final-challenge', name: '4章 さいごのちょうせん', stageIds: stageIdsFrom('stage-31', 'stage-40') },
];

export const getStage = (id: string): Stage | undefined => STAGES.find((s) => s.id === id);

export const getStageIndex = (id: string): number => STAGES.findIndex((s) => s.id === id);

export const getNextStage = (id: string): Stage | undefined => {
  const index = getStageIndex(id);
  return index === -1 ? undefined : STAGES[index + 1];
};

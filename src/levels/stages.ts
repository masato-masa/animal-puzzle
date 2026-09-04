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
    name: '1. キリンとなかまたちのひろば',
    rows: 6,
    cols: 7,
    terrain: terrain(['.#..#..', '.##.##.', '###.##.', '#######', '.##.##.', '.##.##.']),
    animals: animals([['giraffe', 2], ['zebra', 2], ['lion', 4]]),
  },
  {
    id: 'stage-2',
    name: '2. サバンナのライオンたち',
    rows: 5,
    cols: 5,
    terrain: terrain(['..###', '####.', '####.', '#.###', '#...#']),
    animals: animals([['zebra', 2], ['lion', 1], ['giraffe', 1]]),
  },
  {
    id: 'stage-3',
    name: '3. ゾウのおさんぽみち',
    rows: 6,
    cols: 5,
    terrain: terrain(['..#..', '.##..', '.####', '#####', '.##..', '.##..']),
    animals: animals([['zebra', 1], ['elephant', 2], ['giraffe', 1], ['lion', 1]]),
  },
  {
    id: 'stage-4',
    name: '4. ヒョウ、はつとうじょう',
    rows: 5,
    cols: 5,
    terrain: terrain(['...#.', '##.#.', '###.#', '###.#', '..###']),
    animals: animals([['leopard', 1], ['zebra', 2], ['lion', 2]]),
  },
  {
    id: 'stage-5',
    name: '5. ヒョウとライオンのなわばり',
    rows: 5,
    cols: 5,
    terrain: terrain(['..###', '####.', '####.', '#.###', '#...#']),
    animals: animals([['leopard', 1], ['lion', 1], ['zebra', 2]]),
  },
  {
    id: 'stage-6',
    name: '6. サバンナのだいかんげい',
    rows: 5,
    cols: 7,
    terrain: terrain(['..###..', '##.#.##', '##.#.##', '.#####.', '...#...']),
    animals: animals([['giraffe', 2], ['zebra', 4], ['lion', 2]]),
  },
  {
    id: 'stage-7',
    name: '7. かんがえるライオンたち',
    rows: 5,
    cols: 5,
    terrain: terrain(['...#.', '##.#.', '###.#', '###.#', '..###']),
    animals: animals([['lion', 2], ['zebra', 2], ['giraffe', 1]]),
  },
  {
    id: 'stage-8',
    name: '8. ヒョウとライオンのちえくらべ',
    rows: 5,
    cols: 7,
    terrain: terrain(['...#...', '.#####.', '##.#.##', '##.#.##', '..###..']),
    animals: animals([['lion', 2], ['zebra', 4], ['leopard', 2]]),
  },
  {
    id: 'stage-9',
    name: '9. ヒョウたちのちょうせん',
    rows: 6,
    cols: 7,
    terrain: terrain(['.#.....', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.']),
    animals: animals([['giraffe', 2], ['zebra', 2], ['leopard', 4]]),
  },
  {
    id: 'stage-10',
    name: '10. さいごのヒョウたいけつ',
    rows: 6,
    cols: 7,
    terrain: terrain(['.....#.', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.']),
    animals: animals([['leopard', 4], ['lion', 2], ['zebra', 2]]),
  },
  {
    // 手作業で組んだ試作ステージ(2回目)。1回目(壁で1本道を作る手法)はキリン・ヒョウ側の
    // 置き場所が壁でほぼ一意に決まってしまい「ルールが仕事をしていない」状態だった。
    // 今回は壁をほぼ使わず、5x4の開けた土地(幾何学的な置き方は500通り以上)を用意し、
    // 唯一解への絞り込みを完全にルール(StageRule)側でやらせている:
    // 「ワニと同じ列にいるライオン」「シマウマの真上にいるゾウ」という2つの手がかりを
    // 同時に満たす配置を見つける必要がある(L4、唯一解、countRuleMoves=2)。
    id: 'stage-11',
    name: '11. ひらけた草原の推理',
    rows: 5,
    cols: 5,
    terrain: terrain(['....~', '....#', '....#', '....#', '....#']),
    animals: animals([['elephant', 2], ['lion', 2], ['leopard', 2], ['crocodile', 1], ['zebra', 1]]),
    rules: [
      { kind: 'sameCol', a: 'lion', b: 'crocodile' },
      { kind: 'above', a: 'elephant', b: 'zebra' },
    ],
  },
  {
    // 手作業で組んだ試作ステージ(3回目)。ここからは方針を変え、種に固定で紐づく
    // 性格(AnimalDef.conditions)を一切使わず、animalRulesでこのステージ専用に
    // 動物1種につきルールをちょうど1つだけ直接指定している。動物の性格とステージ
    // 限定ルールという2系統に分かれていた仕組みを、1種類のルール語彙(SpeciesCondition。
    // above/leftOf/sameRow/sameCol/exactDistance等も含む)に統合したことで実現した。
    // 同じキリンでも他のステージでは違うルールになりうる。
    // 地形はstage-11と同じ(検証済みの5x4開放地)だが、動物の顔ぶれはstage-11と重ならない
    // ものを選び、実質同じパズルにならないようにしている
    // (__tests__/engine.test.tsの鏡像重複検出テストで機械的に確認済み)。
    // 5つのルールをすべて満たす配置をちょうど1つ見つける(L4、唯一解、countRuleMoves=1)。
    id: 'stage-12',
    name: '12. 5つのやくそく',
    rows: 5,
    cols: 5,
    terrain: terrain(['....~', '....#', '....#', '....#', '....#']),
    animals: animals([['giraffe', 2], ['rhino', 2], ['monkey', 2], ['crocodile', 1], ['gorilla', 1]]),
    animalRules: {
      crocodile: { kind: 'blockAdjacentRequired', block: 'water' },
      rhino: { kind: 'minDistance', from: 'rhino', distance: 2 },
      giraffe: { kind: 'exactDistance', with: 'crocodile', distance: 2 },
      gorilla: { kind: 'differentCol', with: 'giraffe' },
      monkey: { kind: 'differentRow', with: 'gorilla' },
    },
  },
  {
    // 同じくanimalRules方式の試作(2面目)。種の顔ぶれを変え、いつもは「キリンの隣が必要」
    // なオオハシチドリが、ここでは代わりに「サイからきっちり2マス」の距離条件を持つ、
    // というように、同じ種でも通常の性格とは違うルールを試している。
    // 木のブロックを1つだけ含む、ほぼ壁なしの土地(幾何学的な置き方48通り)から
    // 5つのルールを満たす配置をちょうど1つ見つける(L4、唯一解、countRuleMoves=1)。
    id: 'stage-13',
    name: '13. もりのなかまたち',
    rows: 5,
    cols: 5,
    terrain: terrain(['#...#', '#....', '..#..', '....T', '#...#']),
    animals: animals([['rhino', 2], ['gorilla', 1], ['giraffe', 2], ['squirrel', 1], ['oxpecker', 1]]),
    animalRules: {
      rhino: { kind: 'minDistance', from: 'rhino', distance: 2 },
      gorilla: { kind: 'blockAdjacentRequired', block: 'tree' },
      giraffe: { kind: 'sameRow', with: 'gorilla' },
      squirrel: { kind: 'exactDistance', with: 'gorilla', distance: 1 },
      oxpecker: { kind: 'adjacentRequired', with: 'giraffe' },
    },
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
  { id: 'special-challenge', name: '4章 とくべつなちょうせん（試作）', stageIds: stageIdsFrom('stage-11', 'stage-13') },
];

export const getStage = (id: string): Stage | undefined => STAGES.find((s) => s.id === id);

export const getStageIndex = (id: string): number => STAGES.findIndex((s) => s.id === id);

export const getNextStage = (id: string): Stage | undefined => {
  const index = getStageIndex(id);
  return index === -1 ? undefined : STAGES[index + 1];
};

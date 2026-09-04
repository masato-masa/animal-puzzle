# ステージ生成器と全ステージ作り直し 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存5種（リス・ライオン・ゾウ）に性格を付与して図鑑を完成させ、章ごとの合格ライン（`meetsChapterBar`）を満たすステージを機械的に生成する開発用スクリプトを作り、それを実行して出荷ステージを6章30面に作り直す。

**Architecture:** 生成器は「地形パターン（幾何的にタイル張り可能と実証済みの見取り図＋その見取り図が必要とする駒の形の多重集合）」と「その形の枠に、どの種を当てるか（種構成ロジック）」を分離する。パターンは既存18ステージの見取り図を流用する（ランダムなブロック配置は幾何的に成立する確率が極めて低いことがスパイクで実証済み）。種構成ロジックはスパイクで判明した2つの知見を直接コードに埋め込む：(1) 自己回避・距離制約のような対称な性質を持つ種は2体までに制限する（増やすと唯一解が壊れるか、背理法でしか解けずルール手数Rに寄与しない）、(2) 残りは非対称な「特定の種を避ける／必要とする」性質の種で埋める（これがルール手数Rを稼ぐ）。生成はJestテストとして実装し（プロジェクトにts-node等のスクリプト実行環境が無いため）、`npm test` の対象からは除外する。

**Tech Stack:** TypeScript 6, Expo SDK 57, Jest (jest-expo preset), Node.js の `fs` モジュール（生成結果のファイル書き出し）

**Spec:** `docs/superpowers/specs/2026-09-03-rules-and-difficulty-design.md`（§7 動物ロースター、§8.4 章ごとの合格ライン〈2026-09-04改訂版〉、§9 ステージ生成器、§11 移行と互換性が本計画の直接の根拠）

## Global Constraints

- Expo SDK は v57。生成器はUIを持たないので、ブラウザでの目視確認は最終確認（Task 5）のみでよい
- テストは `npm test`、型チェックは `npm run typecheck`。**両方greenでなければコミットしない**
- パスエイリアスは `@/` → `src/`
- コード内コメント・識別子の説明・ステージ名はすべて日本語。既存コードのコメント密度・書き方に合わせる
- **本計画では「出荷済み18ステージを壊さない」制約を適用しない。** 全ステージデータを作り直すのがこの計画の目的そのもの。Task 1（種の性格更新）とTask 4（新ステージデータへの差し替え）の間は、意図的に `shipped stage content` の一部が一時的に赤くなる（詳細はTask 1参照）。**最終的に全タスク完了時点で全テストgreen** であること
- ルール手数Rの目標値は2026-09-04改訂版（設計書§8.4）: 1章 0〜3／2〜4章 **2以上**／5〜6章 **3以上**。当初案（4以上／5以上）ではない
- 章の数と面数: **6章・30面**（各章5面）
- 出荷済みステージのIDは `stage-1` から連番で振り直す（`clearedStageIds` による進捗保存は、IDが同じ意味を持たなくなる以上、本計画の対象外——設計書§11の「既存IDを維持」は本計画では適用しない。全ステージ差し替えである以上、進捗はリセットされるのが自然な挙動）
- コミットメッセージは日本語。末尾に `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
- 種同士の制約は片側にのみ書く、という既存方針（`src/engine/species.ts` 冒頭コメント）を守る

---

## File Structure

| ファイル | 役割 | 変更 |
|---|---|---|
| `src/engine/species.ts` | 動物図鑑 | 修正（リス・ライオン・ゾウに性格を追加） |
| `scripts/stage-patterns.ts` | 幾何的にタイル張り可能と実証済みの地形テンプレート集 | **新規** |
| `scripts/compose-animals.ts` | 形の枠に種を当てる構成ロジック（対称種を2体までに制限） | **新規** |
| `scripts/format-stage.ts` | ステージを `stages.ts` 貼り付け用のTS文字列に整形 | **新規** |
| `scripts/generate-stages.test.ts` | 章ごとに探索し、合格ラインを満たすステージを集めてファイルに書き出す実行用テスト | **新規** |
| `package.json` | jestの `testPathIgnorePatterns` | 修正（`scripts/` を通常テストから除外） |
| `src/levels/stages.ts` | 出荷ステージ | 全面差し替え |
| `__tests__/engine.test.ts` | エンジンのテスト | 修正（`shipped stage content` が `meetsChapterBar` を実際に強制するようにする） |
| `__tests__/stage-generator.test.ts` | 生成器のロジック自体の単体テスト | **新規** |

---

### Task 1: 既存5種（リス・ライオン・ゾウ）に性格を追加する

**目的:** 分割1の実装計画（`docs/superpowers/plans/2026-09-03-engine-rules-expansion.md`）末尾の申し送り事項を実行し、動物図鑑を完成させる。これにより1x1・縦2・2x2それぞれで「幾何的には区別できないが性格が違う種」が最低3種そろう（設計書§7の設計原理）。

**Files:**
- Modify: `src/engine/species.ts`
- Test: `__tests__/engine.test.ts`

**Interfaces:**
- Consumes: `SpeciesCondition`（`src/engine/types.ts`、既存）
- Produces: `SPECIES.squirrel.conditions`/`SPECIES.lion.conditions`/`SPECIES.elephant.conditions` が空でなくなる

**注意（本タスクの副作用）**: `src/levels/stages.ts` の既存18ステージの多くはリス・ライオン・ゾウを使っており、この変更で一部ステージの唯一解が壊れる（複数解になる、または解無しになる）可能性が高い。**これは想定内であり、Task 4で全ステージを新しいデータに差し替えるまで放置してよい。** `__tests__/engine.test.ts` の既存の `describe('shipped stage content', ...)` ブロックは、本タスク完了後からTask 4完了までの間、失敗する場合がある。本タスクのステップでは、そのブロックの実行を一時的にスキップしない（`.skip` を使わない）——失敗する理由が分かっているので、失敗ログをそのまま残し、Task 4で解消する。

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/engine.test.ts` の `describe('species roster', ...)` ブロック内、末尾に追加する。

```ts
  test('squirrel avoids lion, lion is territorial, elephant avoids squirrel and monkey', () => {
    expect(SPECIES.squirrel.conditions).toContainEqual({ kind: 'adjacentForbidden', with: 'lion' });
    expect(SPECIES.lion.conditions).toContainEqual({ kind: 'adjacentForbidden', with: 'lion' });
    expect(SPECIES.elephant.conditions).toContainEqual({ kind: 'adjacentForbidden', with: 'squirrel' });
    expect(SPECIES.elephant.conditions).toContainEqual({ kind: 'adjacentForbidden', with: 'monkey' });
  });
```

- [ ] **Step 2: テストを走らせて失敗を確認する**

Run: `npm test -- __tests__/engine.test.ts -t "squirrel avoids lion"`
Expected: FAIL。3種とも `conditions: []` のまま。

- [ ] **Step 3: 実装する**

`src/engine/species.ts` の該当3エントリを書き換える。

```ts
  squirrel: {
    species: 'squirrel',
    shape: 'single',
    conditions: [{ kind: 'adjacentForbidden', with: 'lion' }],
  },
```

```ts
  lion: {
    species: 'lion',
    shape: 'domino_v',
    conditions: [{ kind: 'adjacentForbidden', with: 'lion' }],
  },
```

```ts
  elephant: {
    species: 'elephant',
    shape: 'square2x2',
    conditions: [
      { kind: 'adjacentForbidden', with: 'squirrel' },
      { kind: 'adjacentForbidden', with: 'monkey' },
    ],
  },
```

- [ ] **Step 4: 新しいテストを走らせて通ることを確認する**

Run: `npm test -- __tests__/engine.test.ts -t "squirrel avoids lion"`
Expected: PASS

- [ ] **Step 5: 型チェックを走らせる**

Run: `npm run typecheck`
Expected: PASS（型は変わらないので必ず通る）

- [ ] **Step 6: 全体テストを走らせ、想定通りの失敗だけであることを確認する**

Run: `npm test`
Expected: `shipped stage content` 内の一部テスト（`... has exactly one solution` など）がFAILする可能性がある。もし失敗が発生したら、それが「リス・ライオン・ゾウの新しい条件によって唯一解が崩れた」という理由によるものであることを、該当ステージの動物構成を目視して確認すること（例えばリスとライオンが両方登場するステージなど）。全く無関係な理由（型エラーやクラッシュ）での失敗であれば、それは本タスクの不具合なので修正すること。

- [ ] **Step 7: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
リス・ライオン・ゾウに性格を追加し、動物図鑑を完成させる

分割1の申し送り事項(docs/superpowers/plans/2026-09-03-engine-rules-expansion.md
末尾)を実行した。リスはライオンのとなりに置けない、ライオンは同種のとなりに
置けない(縄張り)、ゾウはリス・サルのとなりに置けない(ふんでしまう)。

これにより1x1(リス/サル/ウシツツキ)・縦2(ライオン/キリン/ヒョウ)・
2x2(ゾウ/サイ/ゴリラ)のいずれも、幾何的には区別できないが性格が違う種が
3種そろった。

この変更で既存18ステージの一部の唯一解が崩れる可能性があるが、全ステージを
作り直すTask 4まで意図的に放置する。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 地形テンプレート集と種構成ロジック

**目的:** 生成器の核となる2つの純関数群を作る。地形テンプレートは「この見取り図に、この形の駒がぴったり何個入るか」が既存18ステージの実績で分かっている組み合わせをそのまま流用する（ランダムなブロック配置は、スパイクで幾何的に成立する確率が数%以下と判明したため採用しない）。種構成ロジックは、対称な性質を持つ種を2体までに制限する。

**Files:**
- Create: `scripts/stage-patterns.ts`
- Create: `scripts/compose-animals.ts`
- Test: `__tests__/stage-generator.test.ts`

**Interfaces:**
- Consumes: `SHAPES`/`ShapeKey`/`Species`/`AnimalInstance`/`CellTerrain`（`@/engine`）
- Produces:
  - `type PatternTemplate = { rows: number; cols: number; rowsStr: string[]; slotShapes: ShapeKey[] }`
  - `PATTERNS: PatternTemplate[]`
  - `terrainFromRows(rowsStr: string[]): CellTerrain[][]`
  - `composeAnimals(slotShapes: ShapeKey[]): AnimalInstance[]`

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/stage-generator.test.ts` を新規作成する。

```ts
import { validateStage, countGeometricPlacements, SHAPES, SPECIES, type Stage } from '@/engine';
import { PATTERNS, terrainFromRows } from '../scripts/stage-patterns';
import { composeAnimals } from '../scripts/compose-animals';

describe('stage-patterns', () => {
  test('every pattern land-cell count matches the total cells its slotShapes require', () => {
    for (const pattern of PATTERNS) {
      const terrain = terrainFromRows(pattern.rowsStr);
      const landCount = terrain.flat().filter((t) => t === 'land').length;
      const requiredCount = pattern.slotShapes.reduce((sum, shape) => sum + SHAPES[shape].length, 0);
      expect(landCount).toBe(requiredCount);
    }
  });

  test('every pattern geometrically fits its own slotShapes with at least 2 distinct packings', () => {
    // パターンが実際にタイル張り可能(幾何解>=1)で、かつL0でない(幾何解>=2)ことを、
    // composeAnimalsで実際に動物を割り当てて確認する。10回試して1回でも
    // 幾何解>=2になれば、そのパターン自体は使い物になる(種の組み合わせによっては
    // 幾何解が変わりうるため、パターン自体の検証としてはゆるくてよい)。
    for (const pattern of PATTERNS) {
      const terrain = terrainFromRows(pattern.rowsStr);
      let sawMultiple = false;
      for (let i = 0; i < 10 && !sawMultiple; i++) {
        const animals = composeAnimals(pattern.slotShapes);
        const stage: Stage = { id: 'test', name: 'x', rows: pattern.rows, cols: pattern.cols, terrain, animals };
        if (validateStage(stage).length > 0) continue;
        if (countGeometricPlacements(stage, 2) >= 2) sawMultiple = true;
      }
      expect(sawMultiple).toBe(true);
    }
  });
});

describe('composeAnimals', () => {
  test('produces one animal instance per slot, matching the requested shape', () => {
    const slots: Array<'single' | 'domino_v' | 'domino_h' | 'square2x2'> = ['domino_v', 'domino_v', 'single'];
    const animals = composeAnimals(slots);
    expect(animals).toHaveLength(3);
    // 実際の形はSHAPES[SPECIES[species].shape]で決まるので、種を見てshapeを検算する。
    for (const a of animals) {
      expect(SHAPES[SPECIES[a.species].shape].length).toBeGreaterThan(0);
    }
  });

  test('never uses more than 2 instances of a symmetric (self-referential) species in one call', () => {
    // lion/leopard/rhinoは自己回避・同種距離制約を持つ「対称な」種。
    // domino_vスロットを10個要求しても、lion+leopardの合計は2体までに制限されるはず。
    const slots = Array.from({ length: 10 }, () => 'domino_v' as const);
    const animals = composeAnimals(slots);
    const symmetricCount = animals.filter((a) => a.species === 'lion' || a.species === 'leopard').length;
    expect(symmetricCount).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 2: テストを走らせて失敗を確認する**

Run: `npm test -- __tests__/stage-generator.test.ts`
Expected: FAIL。`../scripts/stage-patterns`/`../scripts/compose-animals` が存在しない。

- [ ] **Step 3: `scripts/stage-patterns.ts` を作る**

既存18ステージのうち13面の見取り図を、そのまま「幾何的にタイル張り可能と実証済みの型」として流用する。各パターンの `slotShapes` は、そのステージの元の動物構成（`src/levels/stages.ts` の該当ステージの `animals` 引数）が要求する形の多重集合そのもの。

```ts
import type { CellTerrain, ShapeKey } from '@/engine';

export type PatternTemplate = { rows: number; cols: number; rowsStr: string[]; slotShapes: ShapeKey[] };

const TERRAIN_CHARS: Record<string, CellTerrain> = { '.': 'land', '~': 'water', T: 'tree', '#': 'wall', x: 'void' };

/** 1文字1マスの見取り図から地形グリッドを作る。src/levels/stages.tsのterrain()と同じ規約。 */
export const terrainFromRows = (rowsStr: string[]): CellTerrain[][] =>
  rowsStr.map((row) => row.split('').map((ch) => TERRAIN_CHARS[ch] ?? 'wall'));

/**
 * 既存の出荷ステージの見取り図をそのまま流用した、幾何的にタイル張り可能と
 * 実証済みの地形テンプレート集。ランダムなブロック配置は幾何的に成立する確率が
 * 数%以下(スパイク実測)だったため、証明済みの形を再利用する方針にした。
 * slotShapesは、そのステージが元々要求していた駒の形の多重集合。
 */
export const PATTERNS: PatternTemplate[] = [
  // 小規模(1章向け)
  { rows: 5, cols: 5, rowsStr: ['#####', '##.##', '#...#', '##.##', '#####'], slotShapes: ['single', 'single', 'single', 'single', 'single'] },
  { rows: 5, cols: 5, rowsStr: ['..###', '..###', '#####', '#####', '#####'], slotShapes: ['domino_h', 'domino_h'] },
  { rows: 5, cols: 5, rowsStr: ['..#.#', '.##.#', '.####', '#####', '###..'], slotShapes: ['domino_h', 'domino_h', 'domino_v', 'single', 'single'] },
  { rows: 5, cols: 5, rowsStr: ['..###', '####.', '####.', '#.###', '#...#'], slotShapes: ['domino_h', 'domino_h', 'domino_v', 'domino_v'] },
  { rows: 5, cols: 5, rowsStr: ['..###', '..###', '#####', '###.#', '###.#'], slotShapes: ['domino_v', 'domino_v', 'domino_v'] },
  { rows: 5, cols: 5, rowsStr: ['...#.', '##.#.', '###.#', '###.#', '..###'], slotShapes: ['domino_h', 'domino_h', 'domino_v', 'domino_v', 'domino_v'] },
  // 中規模(2〜4章向け、2x2を含む)
  { rows: 6, cols: 5, rowsStr: ['..#..', '.##..', '.####', '#####', '.##..', '.##..'], slotShapes: ['domino_h', 'domino_v', 'domino_v', 'square2x2', 'square2x2'] },
  { rows: 7, cols: 5, rowsStr: ['..#..', '.##..', '.####', '###..', '.##..', '.####', '###..'], slotShapes: ['domino_h', 'domino_h', 'domino_v', 'domino_v', 'square2x2', 'square2x2'] },
  { rows: 7, cols: 5, rowsStr: ['..#..', '..##.', '####.', '..###', '..##.', '####.', '..###'], slotShapes: ['domino_h', 'domino_h', 'domino_v', 'single', 'single', 'square2x2', 'square2x2'] },
  // 大規模(5〜6章向け、駒数多め)
  { rows: 6, cols: 7, rowsStr: ['.....#.', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.'], slotShapes: ['domino_v', 'domino_v', 'domino_v', 'domino_v', 'domino_v', 'domino_v', 'domino_h', 'domino_h'] },
  { rows: 7, cols: 5, rowsStr: ['..#.#', '..#.#', '###..', '#####', '..#.#', '..#.#', '###..'], slotShapes: ['domino_v', 'domino_v', 'domino_v', 'domino_v', 'domino_v', 'domino_v', 'domino_h', 'domino_h'] },
  { rows: 6, cols: 7, rowsStr: ['..#..#.', '.##.##.', '.##.###', '#######', '.##.##.', '.##.##.'], slotShapes: ['domino_h', 'domino_h', 'domino_v', 'domino_v', 'domino_v', 'domino_v', 'domino_v', 'domino_v'] },
  { rows: 5, cols: 7, rowsStr: ['..###..', '##.#.##', '##.#.##', '.#####.', '...#...'], slotShapes: ['domino_h', 'domino_h', 'domino_h', 'domino_h', 'domino_v', 'domino_v', 'domino_v', 'domino_v'] },
];
```

- [ ] **Step 4: `scripts/compose-animals.ts` を作る**

```ts
import type { AnimalInstance, Species, ShapeKey } from '@/engine';

const rand = (n: number): number => Math.floor(Math.random() * n);
const pick = <T,>(arr: T[]): T => arr[rand(arr.length)];
const shuffle = <T,>(arr: T[]): T[] =>
  arr.map((v) => [Math.random(), v] as const).sort((a, b) => a[0] - b[0]).map(([, v]) => v);

/** その形を持つ、地形限定条件(blockAdjacentRequired)を持たない種の候補プール。 */
const SHAPE_POOLS: Partial<Record<ShapeKey, Species[]>> = {
  single: ['squirrel', 'monkey'],
  domino_h: ['zebra'],
  domino_v: ['lion', 'giraffe', 'leopard'],
  square2x2: ['elephant', 'rhino'],
};

/**
 * 自己回避(縄張り)・同種距離制約のような「対称な」性質を持つ種。スパイクで、
 * これらを並べすぎると(a)唯一解が壊れる(駒同士が入れ替え可能になる)か、
 * (b)唯一解は保てても背理法(L2以上)でしか解決できずルール手数Rに寄与しない、
 * の2つの失敗モードのどちらかに陥ることが分かった。1ステージあたり2体までに制限する。
 */
const SYMMETRIC_SPECIES: ReadonlySet<Species> = new Set(['lion', 'leopard', 'rhino']);
const MAX_SYMMETRIC_INSTANCES = 2;

/**
 * 地形テンプレートが要求する形の枠(slotShapes)に、実際に置く種を割り当てる。
 * 対称な種は2体までに制限し、残りは非対称な「特定の種を避ける/必要とする」性質の種
 * (giraffe/zebraのavoid-lion、squirrelのavoid-lion等)で埋める。これがルール手数Rを稼ぐ
 * (スパイクで、対称な種のみで構成したステージはR=0〜1に留まったが、非対称な種を
 * 中心に据えるとRが伸びる傾向を確認した)。
 */
export const composeAnimals = (slotShapes: ShapeKey[]): AnimalInstance[] => {
  let uid = 0;
  let symmetricUsed = 0;
  const species = slotShapes.map((shape) => {
    const pool = SHAPE_POOLS[shape];
    if (!pool || pool.length === 0) throw new Error(`no species pool for shape: ${shape}`);
    const candidates = symmetricUsed >= MAX_SYMMETRIC_INSTANCES ? pool.filter((s) => !SYMMETRIC_SPECIES.has(s)) : pool;
    const chosen = pick(candidates.length > 0 ? candidates : pool);
    if (SYMMETRIC_SPECIES.has(chosen)) symmetricUsed++;
    return chosen;
  });
  return shuffle(species).map((sp) => ({ instanceId: `${sp}-${uid++}`, species: sp }));
};
```

- [ ] **Step 5: テストを走らせて通ることを確認する**

Run: `npm test -- __tests__/stage-generator.test.ts`
Expected: PASS。もし `every pattern geometrically fits ...` が失敗する場合、該当パターンの `rowsStr`/`slotShapes` の対応が誤っている（元ステージの動物構成を再確認すること）。

- [ ] **Step 6: 型チェックを走らせる**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 7: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
生成器の地形テンプレートと種構成ロジックを追加

地形は既存18ステージの見取り図をそのまま流用する(ランダムなブロック配置は
幾何的に成立する確率が数%以下とスパイクで判明したため)。種構成は、
自己回避・距離制約のような対称な性質の種を2体までに制限し、残りを
非対称な「特定の種を避ける/必要とする」性質の種で埋める。対称な種を
並べすぎると唯一解が壊れるか、背理法でしか解決できずルール手数Rに
寄与しないことがスパイクで分かったための設計。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 探索ループと出力フォーマッタ

**目的:** 章ごとに、パターン×種構成をランダムに試し、`validateStage`→唯一解→`gradeStage`/`meetsChapterBar` を通過したステージだけを採用する探索ループを作る。採用したステージを `stages.ts` に貼り付けられる形式に整形し、ファイルに書き出す。

**Files:**
- Create: `scripts/format-stage.ts`
- Create: `scripts/generate-stages.ts`
- Create: `scripts/generate-stages.test.ts`
- Modify: `package.json`
- Test: `__tests__/stage-generator.test.ts`

**Interfaces:**
- Consumes: Task 2 の `PATTERNS`/`terrainFromRows`/`composeAnimals`、`validateStage`/`countGeometricPlacements`/`countSolutions`（`@/engine`）、`gradeStage`/`meetsChapterBar`（`@/lib/stage-difficulty`）
- Produces:
  - `formatStageSnippet(stage: Stage, id: string, name: string): string`（`scripts/format-stage.ts`）
  - `type ChapterTarget = { chapterNumber: number; needed: number }`（`scripts/generate-stages.ts`）
  - `generateForChapter(target: ChapterTarget, maxAttempts: number, maxMillis: number): Stage[]`（`scripts/generate-stages.ts`）
  - `CHAPTER_DEFS: { chapterNumber: number; id: string; name: string }[]`、`STAGES_PER_CHAPTER: number`（`scripts/generate-stages.ts`）

**設計上の注意（なぜ2ファイルに分けるか）**: `generateForChapter` を探索の重い実行本体（`test('generate 6 chapters...')`）と同じ `scripts/generate-stages.test.ts` に置いてしまうと、`__tests__/stage-generator.test.ts` がそこから `generateForChapter` を import した時点で、その `.test.ts` ファイルのトップレベルコードが評価され、中の重い `test(...)` 呼び出しがJestのグローバルレジストリに登録されてしまう（Jestの `test`/`describe` はどのファイルを実行中かに関わらず、評価された時点でその瞬間のテストファイルのスイートに登録される）。これは `scripts/` を `testPathIgnorePatterns` で除外した意味を壊す。**ロジック（`generateForChapter` 等）は `.test.` を含まない `scripts/generate-stages.ts` に置き、`scripts/generate-stages.test.ts` はそれを import して実行するだけの薄いランナーにする。**

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/stage-generator.test.ts` 冒頭のimportを以下に差し替える（Task 2の3行に、`gradeStage`/`meetsChapterBar`・`formatStageSnippet`・`generateForChapter` を追加する）。

```ts
import { validateStage, countGeometricPlacements, SHAPES, SPECIES, type Stage } from '@/engine';
import { gradeStage, meetsChapterBar } from '@/lib/stage-difficulty';
import { PATTERNS, terrainFromRows } from '../scripts/stage-patterns';
import { composeAnimals } from '../scripts/compose-animals';
import { formatStageSnippet } from '../scripts/format-stage';
import { generateForChapter } from '../scripts/generate-stages';
```

ファイル末尾に追加する。

```ts
describe('formatStageSnippet', () => {
  test('produces a stages.ts-pasteable object literal', () => {
    const stage: Stage = {
      id: 'draft',
      name: 'draft',
      rows: 5,
      cols: 5,
      terrain: terrainFromRows(['##.##', '##.##', '.....', '##.##', '##.##']),
      animals: [
        { instanceId: 'squirrel-0', species: 'squirrel' },
        { instanceId: 'squirrel-1', species: 'squirrel' },
      ],
    };
    const snippet = formatStageSnippet(stage, 'stage-1', '1. てすと');
    expect(snippet).toContain(`id: 'stage-1'`);
    expect(snippet).toContain(`name: '1. てすと'`);
    expect(snippet).toContain(`terrain(['##.##', '##.##', '.....', '##.##', '##.##'])`);
    expect(snippet).toContain(`['squirrel', 2]`);
  });
});

describe('generateForChapter', () => {
  test('finds a stage meeting chapter 1 bar within a bounded search', () => {
    // このテストはnpm test全体の実行時間に直接乗るため、予算を小さく保つ。
    // 1章のバー(L1〜L2, R0〜3)は最も緩いので、数百試行・数秒あれば十分見つかるはず。
    const stages = generateForChapter({ chapterNumber: 1, needed: 1 }, 500, 8000);
    expect(stages.length).toBe(1);
    const [stage] = stages;
    expect(validateStage(stage)).toEqual([]);
    const grade = gradeStage(stage);
    expect(meetsChapterBar(grade, 1, stage)).toEqual([]);
  }, 10000);
});
```

- [ ] **Step 2: テストを走らせて失敗を確認する**

Run: `npm test -- __tests__/stage-generator.test.ts`
Expected: FAIL。`formatStageSnippet`/`generateForChapter` が存在しない。

- [ ] **Step 3: `scripts/format-stage.ts` を作る**

`src/lib/stage-submission.ts` の `buildStageCodeSnippet` と同じ整形規約（`terrain([...])`/`animals([...])` を使う書式）に合わせる。

```ts
import type { CellTerrain, Species, Stage } from '@/engine';

const TERRAIN_CODE: Record<CellTerrain, string> = { land: '.', water: '~', tree: 'T', wall: '#', void: 'x' };

const terrainSnippet = (stage: Stage): string =>
  `terrain([${stage.terrain.map((row) => `'${row.map((t) => TERRAIN_CODE[t]).join('')}'`).join(', ')}])`;

const animalCounts = (stage: Stage): [Species, number][] => {
  const counts = new Map<Species, number>();
  for (const a of stage.animals) counts.set(a.species, (counts.get(a.species) ?? 0) + 1);
  return [...counts.entries()];
};

const animalsSnippet = (stage: Stage): string =>
  `animals([${animalCounts(stage).map(([sp, n]) => `['${sp}', ${n}]`).join(', ')}])`;

const rulesSnippet = (stage: Stage): string => {
  if (!stage.rules || stage.rules.length === 0) return '';
  const parts = stage.rules.map((rule) => {
    const fields = Object.entries(rule).map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`);
    return `{ ${fields.join(', ')} }`;
  });
  return `\n    rules: [${parts.join(', ')}],`;
};

/** src/levels/stages.tsのSTAGES配列にそのまま貼り付けられる、1ステージ分のオブジェクトリテラル。 */
export const formatStageSnippet = (stage: Stage, id: string, name: string): string =>
  `  {
    id: '${id}',
    name: '${name}',
    rows: ${stage.rows},
    cols: ${stage.cols},
    terrain: ${terrainSnippet(stage)},
    animals: ${animalsSnippet(stage)},${rulesSnippet(stage)}
  },`;
```

- [ ] **Step 4: `scripts/generate-stages.ts` を作る（探索ロジック本体、非テストファイル）**

```ts
import { validateStage, countGeometricPlacements, countSolutions, type Stage } from '@/engine';
import { gradeStage, meetsChapterBar } from '@/lib/stage-difficulty';
import { PATTERNS, terrainFromRows } from './stage-patterns';
import { composeAnimals } from './compose-animals';

const rand = (n: number): number => Math.floor(Math.random() * n);

export type ChapterTarget = { chapterNumber: number; needed: number };

/** 同じ地形×同じ動物構成(種の多重集合)の重複を避けるための署名。 */
const compositionSignature = (patternIndex: number, stage: Stage): string =>
  `${patternIndex}:${[...stage.animals].map((a) => a.species).sort().join(',')}`;

/**
 * 指定した章の合格ラインを満たすステージを、必要数集まるまでランダムに探索する。
 * 幾何的に不成立・唯一解でない・合格ラインを満たさない候補は即座に捨てる。
 * maxAttempts/maxMillisのどちらかに達したら、集まった分だけを返して打ち切る
 * (必要数に届かない場合もある。呼び出し側で件数を確認すること)。
 */
export const generateForChapter = (target: ChapterTarget, maxAttempts: number, maxMillis: number): Stage[] => {
  const found: Stage[] = [];
  const seen = new Set<string>();
  const start = Date.now();
  let attempts = 0;
  while (found.length < target.needed && attempts < maxAttempts && Date.now() - start < maxMillis) {
    attempts++;
    const patternIndex = rand(PATTERNS.length);
    const pattern = PATTERNS[patternIndex];
    const terrain = terrainFromRows(pattern.rowsStr);
    const animals = composeAnimals(pattern.slotShapes);
    const stage: Stage = { id: 'draft', name: 'draft', rows: pattern.rows, cols: pattern.cols, terrain, animals };

    if (validateStage(stage).length > 0) continue;
    if (countGeometricPlacements(stage, 2) < 2) continue;
    if (countSolutions(stage, 2) !== 1) continue;

    const grade = gradeStage(stage);
    if (meetsChapterBar(grade, target.chapterNumber, stage).length > 0) continue;

    const sig = compositionSignature(patternIndex, stage);
    if (seen.has(sig)) continue;
    seen.add(sig);
    found.push(stage);
  }
  return found;
};

export const CHAPTER_DEFS: { chapterNumber: number; id: string; name: string }[] = [
  { chapterNumber: 1, id: 'savanna-basics', name: '1章 サバンナのきほん' },
  { chapterNumber: 2, id: 'savanna-thinking', name: '2章 かんがえるサバンナ' },
  { chapterNumber: 3, id: 'elephant-secret', name: '3章 ゾウのひみつ' },
  { chapterNumber: 4, id: 'wisdom-challenge', name: '4章 ちえくらべ' },
  { chapterNumber: 5, id: 'maze-savanna', name: '5章 めいろのさばんな' },
  { chapterNumber: 6, id: 'final-challenge', name: '6章 さいごのちょうせん' },
];

export const STAGES_PER_CHAPTER = 5;
```

- [ ] **Step 5: `scripts/generate-stages.test.ts` を作る（薄いランナー）**

このファイル自体はJestテストとして書くが、Step 7でpackage.jsonのignore対象にするため、通常の `npm test` では実行されない。ロジックは一切持たず、`scripts/generate-stages.ts` を呼び出してファイルに書き出すだけにする。

```ts
import * as fs from 'fs';
import * as path from 'path';
import { formatStageSnippet } from './format-stage';
import { CHAPTER_DEFS, STAGES_PER_CHAPTER, generateForChapter } from './generate-stages';

test('generate 6 chapters x 5 stages and write to scripts/generated-stages.txt', () => {
  let globalIndex = 1;
  const stageBlocks: string[] = [];
  const chapterBlocks: string[] = [];

  for (const chapter of CHAPTER_DEFS) {
    const stages = generateForChapter({ chapterNumber: chapter.chapterNumber, needed: STAGES_PER_CHAPTER }, 20000, 120000);
    expect(stages.length).toBe(STAGES_PER_CHAPTER);

    const firstId = `stage-${globalIndex}`;
    for (const stage of stages) {
      const id = `stage-${globalIndex}`;
      const name = `${globalIndex}. ${chapter.name}`;
      stageBlocks.push(formatStageSnippet(stage, id, name));
      globalIndex++;
    }
    const lastId = `stage-${globalIndex - 1}`;
    chapterBlocks.push(
      `  { id: '${chapter.id}', name: '${chapter.name}', stageIds: stageIdsFrom('${firstId}', '${lastId}') },`
    );
  }

  const output = `// このファイルは scripts/generate-stages.test.ts の実行で生成された。
// src/levels/stages.ts のSTAGES配列・CHAPTERS配列にそのまま貼り付けること。

export const GENERATED_STAGES = \`
${stageBlocks.join('\n')}
\`;

export const GENERATED_CHAPTERS = \`
${chapterBlocks.join('\n')}
\`;
`;

  fs.writeFileSync(path.join(__dirname, 'generated-stages.txt'), output);
}, 130000 * 6);
```

- [ ] **Step 6: テストを走らせて既存のテストが通ることを確認する**

Run: `npm test -- __tests__/stage-generator.test.ts`
Expected: PASS（Step 1で書いた `formatStageSnippet`/`generateForChapter` のテストのみ。`generate 6 chapters x 5 stages ...` は `scripts/generate-stages.test.ts` の中にあり、まだ別ファイルなので `__tests__/stage-generator.test.ts` の実行には含まれない。この時点では `scripts/` はまだ `testPathIgnorePatterns` に入っていないため、通しで `npm test` を実行すると `scripts/generate-stages.test.ts` の重い生成テストも走ってしまう——Step 7で除外するまでは `npm test -- __tests__/stage-generator.test.ts` のように対象を絞って実行すること）。

- [ ] **Step 7: `scripts/` を通常テストの対象から除外する**

`package.json` の `jest.testPathIgnorePatterns` に `<rootDir>/scripts/` を追加する。

```json
    "testPathIgnorePatterns": [
      "/node_modules/",
      "<rootDir>/src/app/",
      "<rootDir>/scripts/"
    ],
```

- [ ] **Step 8: 通常の `npm test` が `scripts/generate-stages.test.ts` を実行しないことを確認する**

Run: `npm test`
Expected: PASS。テスト一覧に `scripts/generate-stages.test.ts` が含まれていないこと（テストスイート数が変わらないことで確認できる）。

- [ ] **Step 9: 型チェックを走らせる**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 10: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
章ごとの探索ループと出力フォーマッタを追加

パターン×種構成をランダムに試し、validateStage→唯一解→
gradeStage/meetsChapterBarを通過したステージだけを採用する。
採用したステージはstages.tsに貼り付けられる形式に整形して
scripts/generated-stages.txtに書き出す。

生成器はJestテストとして実装した(プロジェクトにts-node等の
TypeScript実行環境が無いため)。時間がかかる(章あたり最大2分)ため
package.jsonのtestPathIgnorePatternsでscripts/を通常のnpm testから
除外し、明示的に指定したときだけ実行されるようにした。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 生成器を実行し、全ステージを作り直す

**目的:** 生成器を実際に走らせ、出力を `src/levels/stages.ts` に反映する。`shipped stage content` の回帰テストを、章の合格ラインを実際に強制する内容に更新する。

**Files:**
- Modify: `src/levels/stages.ts`（全面差し替え）
- Modify: `__tests__/engine.test.ts`

**Interfaces:**
- Consumes: Task 3 の `scripts/generate-stages.test.ts` の出力、Task 1 完了後の `SPECIES`、`gradeStage`/`meetsChapterBar`（`@/lib/stage-difficulty`）

- [ ] **Step 1: 生成器を実行する**

`testPathIgnorePatterns` で除外されているため、明示的にオーバーライドして実行する。

```bash
npx jest --testPathIgnorePatterns="/node_modules/" scripts/generate-stages.test.ts
```

Expected: 数分かかる（章あたり最大2分×6章）。成功すれば `scripts/generated-stages.txt` が書き出される。もしいずれかの章で `stages.length).toBe(STAGES_PER_CHAPTER)` のアサーションが失敗した場合（必要数集まらなかった場合）、`generateForChapter` の `maxAttempts`/`maxMillis` を増やして再実行すること（コードは変更せず、この実行コマンドだけで足りるはず）。

- [ ] **Step 2: 出力を確認する**

`scripts/generated-stages.txt` を読み、30ステージ・6章ぶんのブロックが出力されていることを目視確認する。

- [ ] **Step 3: `src/levels/stages.ts` を書き換える**

ファイル冒頭の `uid`/`animals`/`TERRAIN_CHARS`/`terrain` ヘルパー関数と、末尾の `stageIdsFrom`/`getStage`/`getStageIndex`/`getNextStage` はそのまま残す。`export const STAGES: Stage[] = [...]` の中身を `scripts/generated-stages.txt` の `GENERATED_STAGES` テンプレート文字列の中身（各ステージのオブジェクトリテラル）で丸ごと置き換える。`export const CHAPTERS: ...` の中身を同ファイルの `GENERATED_CHAPTERS` の中身で置き換える。

ファイル冒頭のコメント（現在「全ステージは...countSolutionsで検証済み」で始まる説明）を、生成器で作られたことが分かる内容に更新する。

```ts
/**
 * 全ステージはscripts/generate-stages.test.tsで生成され、engine/solver.tsの
 * countSolutionsで唯一解であることと、lib/stage-difficulty.tsのgradeStage/
 * meetsChapterBarで章ごとの合格ラインを満たすことが検証済み
 * （__tests__/engine.test.ts の「shipped stage content」回帰テストで継続的にチェックされる）。
 * 手動で編集した場合は、その保証が失われる点に注意。
 */
```

- [ ] **Step 4: `scripts/generated-stages.txt` を削除する**

生成の中間成果物であり、`src/levels/stages.ts` に反映済みなので不要になる。

```bash
rm scripts/generated-stages.txt
```

- [ ] **Step 5: `shipped stage content` の回帰テストを、章の合格ラインを実際に強制する内容に更新する**

`__tests__/engine.test.ts` の `describe('shipped stage content', ...)` ブロック内の `test.each(STAGES)('$id ($name) grades consistently with its known unique solution', ...)`（分割2のTask 7で追加したもの）を、以下で置き換える。import に `meetsChapterBar` を `@/lib/stage-difficulty` から追加し、`CHAPTERS` は既に import 済みであることを確認する。

```ts
  test.each(STAGES)('$id ($name) meets its chapter difficulty bar', (stage) => {
    const chapterIndex = CHAPTERS.findIndex((c) => c.stageIds.includes(stage.id));
    expect(chapterIndex).toBeGreaterThanOrEqual(0);
    const chapterNumber = chapterIndex + 1;
    const grade = gradeStage(stage);
    expect(meetsChapterBar(grade, chapterNumber, stage)).toEqual([]);
  });
```

- [ ] **Step 6: 全体テストを走らせる**

Run: `npm test`
Expected: PASS。もし特定のステージが `meetsChapterBar` に落ちる場合（Task 3の生成器はTask 4実行時点のロジックで検証済みのはずだが、`src/levels/stages.ts` への手動転記でミスがあれば再現しうる）、`scripts/generated-stages.txt` の内容と転記後の内容を突き合わせて修正すること。

- [ ] **Step 7: 型チェックを走らせる**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 8: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
生成器を実行し、6章30面の新ステージデータに作り直す

scripts/generate-stages.test.tsを実行し、各章の合格ライン
(1章L1〜L2、2〜4章L3以上R>=2、5〜6章L4 R>=3)を満たすステージを
5面ずつ集めた。src/levels/stages.tsのSTAGES/CHAPTERSを丸ごと
差し替えた。

shipped stage contentの回帰テストを、gradeStage/meetsChapterBarで
実際に章の合格ラインを強制する内容に更新した(分割2のTask 7では
唯一解であることの整合性チェックのみだった)。

出荷済みIDは維持しない全面差し替えのため、AsyncStorageの
clearedStageIdsに保存された進捗はリセットされる。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 実機確認とデプロイ

**目的:** 新しいステージデータで実際にゲームが遊べることを確認してから公開する。

**Files:** なし（確認とビルド・公開のみ）

- [ ] **Step 1: 最終確認**

Run: `npm test && npm run typecheck`
Expected: 両方PASS

- [ ] **Step 2: プレビューでゲーム画面を確認する**

`.claude/launch.json` の設定でプレビューを起動し（無ければ `{"version":"0.0.1","configurations":[{"name":"web","runtimeExecutable":"npx","runtimeArgs":["expo","start","--web"],"port":8081}]}` を追加する）、トップページを開いて章と面が想定どおり6章30面表示されることを確認する。`stage-1` と、6章の最初の面（`meetsChapterBar` の 5〜6章バーを満たすはずの面）を開き、条件パネルを開いて、動物の性格・ステージ限定ルールが表示され、実際にドラッグで動物を配置して唯一解にたどり着けることを確認する。スクリーンショットを撮る。

- [ ] **Step 3: master へ push**

```bash
git push origin master
```

- [ ] **Step 4: web をビルドする**

```bash
npx expo export -p web
```

- [ ] **Step 5: SPA フォールバックと .nojekyll を用意する**

```bash
cp dist/+not-found.html dist/404.html && touch dist/.nojekyll
```

- [ ] **Step 6: gh-pages ブランチへ push する**

使い捨ての `git worktree` を使って `dist/` の中身（`.nojekyll` を含む）を `gh-pages` に push する。リモートの `gh-pages` が先に進んでいた場合は force-push せず、`git reset --soft origin/gh-pages` してから再度 `dist/` の内容をコミットし直すこと。

- [ ] **Step 7: デプロイが反映されたか確認する**

`dist/_expo/` 以下の実在するアセットURLに対して `curl -sI` を打ち、200 が返ることを確認する。

Live URL: https://masato-masa.github.io/animal-puzzle/

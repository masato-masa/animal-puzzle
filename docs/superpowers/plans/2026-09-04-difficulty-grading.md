# 難易度の物差し 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ステージの難易度を「思考レベル L1〜L4」「ルール手数R」「効いている条件数」の3指標で機械的に採点する `gradeStage`/`meetsChapterBar` を実装する。分割3のステージ生成器がこれを使ってフィルタする。

**Architecture:** 既存の `src/engine` はイミュータブルな純関数群。今回追加する解析系（伝播・背理法深さ探索・トレース）も同じ純関数スタイルで積み上げる。既存の `SPECIES` テーブル（種の性格）と `Stage.rules`（ステージ限定ルール）は変更しない — 「特定の条件を1つだけ外して解を数え直す」ために、`isAnimalSatisfied`/`unsatisfiedStageRules`/`countSolutions` に**後方互換な追加の省略可能引数**を足し、既存呼び出し箇所は一切変えずに条件を選択的に無視できるようにする。

**Tech Stack:** TypeScript 6, Expo SDK 57, Jest (jest-expo preset)

**Spec:** `docs/superpowers/specs/2026-09-03-rules-and-difficulty-design.md`（§8「難易度の基準」が本計画の直接の根拠）

## Global Constraints

- Expo SDK は v57。UIの変更はこの計画に含まれない（`src/engine` と `src/lib` のみ）ので、ブラウザでの目視確認は不要
- テストは `npm test`、型チェックは `npm run typecheck`。**両方greenでなければコミットしない**
- パスエイリアスは `@/` → `src/`
- コード内コメント・識別子の説明はすべて日本語。既存コードのコメント密度・書き方に合わせる
- **既存の呼び出し箇所を一切壊さない。** `isAnimalSatisfied`/`violatingAnimals`/`isStageCleared`/`unsatisfiedStageRules`/`countSolutions` に足す新引数は全て省略可能（optional）にし、省略時は今までと完全に同じ挙動にする
- **出荷済み18ステージのデータ（`src/levels/stages.ts`）は変更しない。** 章ごとの合格ライン（L3以上・R≧4など）を既存18ステージに強制するのは分割3（生成器＋全ステージ作り直し）の仕事。本計画では `gradeStage` が既存18ステージに対しても矛盾なく動く（`solutions===1`が一致する）ことだけを確認する
- コミットメッセージは日本語。末尾に `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
- 種同士の制約は片側にのみ書く、という既存方針（`src/engine/species.ts` 冒頭コメント）は本計画では触らない

---

## File Structure

| ファイル | 役割 | 変更 |
|---|---|---|
| `src/engine/types.ts` | 型定義 | 修正（`ConditionSkip` 型を追加） |
| `src/engine/conditions.ts` | 種の性格の判定 | 修正（省略可能な `skip` 引数） |
| `src/engine/stage-rules.ts` | ステージ限定ルールの判定 | 修正（省略可能な `skipRuleIndex` 引数） |
| `src/engine/solver.ts` | 解の数え上げ | 修正（`skip`/`skipRuleIndex` を通す、`findSolution` を追加） |
| `src/engine/propagation.ts` | 候補生成（幾何のみ／ルール適用後）と単純消去法による伝播 | **新規** |
| `src/engine/solver-level.ts` | 深さ制限つき背理法によるレベル判定 | **新規** |
| `src/engine/rule-trace.ts` | 決定的な解答トレース上のルール手数R | **新規** |
| `src/engine/index.ts` | 再エクスポート | 修正 |
| `src/lib/stage-difficulty.ts` | `gradeStage`/`meetsChapterBar`（条件数の算出・章の合格ライン表を含む） | **新規** |
| `__tests__/engine.test.ts` | エンジンのテスト | 修正 |

---

### Task 1: 条件・ルールを選択的に無視できるようにする

**目的:** 「この条件だけ外したら解は何通りになるか」を測るため、既存の判定関数に省略可能な `skip` 引数を足す。

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/conditions.ts`
- Modify: `src/engine/stage-rules.ts`
- Modify: `src/engine/solver.ts`
- Test: `__tests__/engine.test.ts`

**Interfaces:**
- Produces:
  - `type ConditionSkip = { species: Species; index: number }`（`src/engine/types.ts`）
  - `isAnimalSatisfied(state: GameState, animal: PlacedAnimal, skip?: ConditionSkip): boolean`
  - `violatingAnimals(state: GameState, skip?: ConditionSkip): PlacedAnimal[]`
  - `unsatisfiedStageRules(state: GameState, skipRuleIndex?: number): StageRule[]`
  - `isStageCleared(state: GameState, skip?: ConditionSkip, skipRuleIndex?: number): boolean`
  - `countSolutions(stage: Stage, cap?: number, skip?: ConditionSkip, skipRuleIndex?: number): number`

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/engine.test.ts` の `describe('conditionCheckers', ...)` 内、末尾に追加する。

```ts
  test('isAnimalSatisfied can skip one specific condition by index', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 'z1', species: 'zebra' },
        { instanceId: 'l1', species: 'lion' },
      ],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 'z1', { r: 0, c: 0 });
    state = placeAnimal(state, 'l1', { r: 0, c: 2 });
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
```

`describe('stage rules', ...)` 内、末尾に追加する。

```ts
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
```

- [ ] **Step 2: テストを走らせて失敗を確認する**

Run: `npm test -- __tests__/engine.test.ts`
Expected: FAIL。`skip` を渡すとTypeScriptの余剰引数エラー、または挙動が変わらないことによるアサーション失敗。

- [ ] **Step 3: 実装する**

`src/engine/types.ts` に追加する。

```ts
/** ステージ採点用: この種のconditions配列の特定indexの条件だけを判定から除外する指定。 */
export type ConditionSkip = { species: Species; index: number };
```

`src/engine/conditions.ts` を書き換える。`import type { ConditionSkip, ... } from './types';` を足す。

```ts
export const isAnimalSatisfied = (state: GameState, animal: PlacedAnimal, skip?: ConditionSkip): boolean =>
  SPECIES[animal.species].conditions
    .filter((_, i) => !(skip && skip.species === animal.species && skip.index === i))
    .every((c) => conditionCheckers[c.kind](state, animal, c));

export const violatingAnimals = (state: GameState, skip?: ConditionSkip): PlacedAnimal[] =>
  state.placed.filter((a) => !isAnimalSatisfied(state, a, skip));

export const isStageCleared = (state: GameState, skip?: ConditionSkip, skipRuleIndex?: number): boolean =>
  state.tray.length === 0 &&
  violatingAnimals(state, skip).length === 0 &&
  unsatisfiedStageRules(state, skipRuleIndex).length === 0;
```

`import { unsatisfiedStageRules } from './stage-rules';` は既存のまま（既に import 済み）。

`src/engine/stage-rules.ts` の `unsatisfiedStageRules` を書き換える。

```ts
export const unsatisfiedStageRules = (state: GameState, skipRuleIndex?: number): StageRule[] =>
  (state.stage.rules ?? []).filter((r, i) => i !== skipRuleIndex && !isStageRuleSatisfied(state, r));
```

`src/engine/solver.ts` の `countSolutions` を書き換える。`import type { ConditionSkip, GameState, Stage } from './types';` に変更する。

```ts
export const countSolutions = (
  stage: Stage,
  cap = 2,
  skip?: ConditionSkip,
  skipRuleIndex?: number
): number => {
  const instances = stage.animals;
  const seen = new Set<string>();
  let count = 0;

  const backtrack = (state: GameState, index: number): void => {
    if (count >= cap) return;
    if (index === instances.length) {
      if (isStageCleared(state, skip, skipRuleIndex)) {
        const sig = canonicalSignature(state);
        if (!seen.has(sig)) {
          seen.add(sig);
          count++;
        }
      }
      return;
    }
    const instance = instances[index];
    for (let r = 0; r < stage.rows && count < cap; r++) {
      for (let c = 0; c < stage.cols && count < cap; c++) {
        const next = placeAnimal(state, instance.instanceId, { r, c });
        if (next !== state) backtrack(next, index + 1);
      }
    }
  };

  backtrack(createGameState(stage), 0);
  return count;
};
```

`countGeometricPlacements`/`solutionStatus`/`hasUniqueSolution` は変更しない（`skip` 不要）。

- [ ] **Step 4: テストと型チェックを走らせる**

Run: `npm test && npm run typecheck`
Expected: 両方PASS。既存の `shipped stage content` を含む全テストが影響を受けないことを確認する（新引数は全て省略可能）。

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
条件・ステージルールを1つだけ無視して判定できるようにする

ステージ採点で「この条件を外すと解が増えるか」を調べるための下ごしらえ。
isAnimalSatisfied/unsatisfiedStageRules/isStageCleared/countSolutionsに
省略可能なskip引数を追加した。既存の呼び出し箇所は引数を省略するため
挙動は一切変わらない。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 候補生成と単純消去法による伝播

**目的:** 「地形・重なりだけを見た候補」と「単調な条件（置くと即座に破れる条件）まで適用した候補」の両方を計算できるようにし、naked single / hidden single による確定を、詰まるまで繰り返す。

**Files:**
- Create: `src/engine/propagation.ts`
- Test: `__tests__/engine.test.ts`

**Interfaces:**
- Consumes: Task 1 の型は使わない。`SPECIES`, `conditionCheckers`（`conditions.ts`）、`isStageRuleSatisfied`（`stage-rules.ts`）、`canPlace`/`placeAnimal`/`validAnchorCells`（`board.ts`）、`posKey`（`types.ts`）
- Produces:
  - `ruleFilteredCandidateAnchors(state: GameState, instanceId: string): Pos[]`
  - `type PropagationResult = { state: GameState; fullySolved: boolean; contradiction: boolean }`
  - `propagateToFixation(initial: GameState): PropagationResult`

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/engine.test.ts` の末尾（`describe('shipped stage content', ...)` の前）に追加する。import に `propagateToFixation`, `ruleFilteredCandidateAnchors` を足す。

```ts
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
```

- [ ] **Step 2: テストを走らせて失敗を確認する**

Run: `npm test -- __tests__/engine.test.ts`
Expected: FAIL。`propagateToFixation`/`ruleFilteredCandidateAnchors` が存在しない。

- [ ] **Step 3: `src/engine/propagation.ts` を作る**

```ts
import type { GameState, Pos, Species, SpeciesCondition } from './types';
import { posKey } from './types';
import { SPECIES } from './species';
import { conditionCheckers, isStageCleared } from './conditions';
import { isStageRuleSatisfied } from './stage-rules';
import { canPlace, placeAnimal } from './board';
import { shapeCells } from './shapes';

/**
 * 配置しても「今すでに盤面にある駒・地形だけ」で即座に破れると判定できる条件の種類。
 * adjacentRequired/flockRequiredのような「必要」系条件は、相手が将来置かれれば満たされうるため
 * ここには含めない（isStageClearedで最終判定する）。blockAdjacentRequiredは地形にしか
 * 依存せず常に確定的に判定できるので特別扱いで常にチェックする。
 */
const MONOTONIC_FORBIDDING: ReadonlySet<SpeciesCondition['kind']> = new Set([
  'adjacentForbidden',
  'diagonalForbidden',
  'surroundForbidden',
  'minDistance',
  'blockAdjacentForbidden',
]);

const passesMonotonicSpeciesConditions = (state: GameState, placed: GameState['placed'][number]): boolean =>
  SPECIES[placed.species].conditions
    .filter((c) => MONOTONIC_FORBIDDING.has(c.kind) || c.kind === 'blockAdjacentRequired')
    .every((c) => conditionCheckers[c.kind](state, placed, c));

/**
 * stage.rulesのうち、指定した種が関わるものだけを対象にする。isStageRuleSatisfiedは
 * 相手側の種がまだ1体も置かれていなければ常にtrue（まだ判定できない＝除外しない）を返すため、
 * 「今すでに置かれている相手」との組み合わせでしか実際には絞り込まれない。
 */
const passesMonotonicStageRules = (state: GameState, species: Species): boolean =>
  (state.stage.rules ?? [])
    .filter((r) => r.a === species || r.b === species)
    .every((r) => isStageRuleSatisfied(state, r));

/** 地形・重なりに加えて、単調な条件・ステージルールでも絞り込んだ候補アンカー。 */
export const ruleFilteredCandidateAnchors = (state: GameState, instanceId: string): Pos[] => {
  const inst = state.tray.find((t) => t.instanceId === instanceId);
  if (!inst) return [];
  const out: Pos[] = [];
  for (let r = 0; r < state.stage.rows; r++) {
    for (let c = 0; c < state.stage.cols; c++) {
      const anchor = { r, c };
      if (!canPlace(state, instanceId, anchor)) continue;
      const next = placeAnimal(state, instanceId, anchor);
      const placed = next.placed.find((p) => p.instanceId === instanceId)!;
      if (!passesMonotonicSpeciesConditions(next, placed)) continue;
      // 種同士の禁止条件は片側にしか書かれない設計（species.ts冒頭コメント参照）。
      // 新しく置く駒自身の条件だけでなく、「既に置かれている他の駒」が今から
      // 持っている禁止条件を、この配置によって新たに破ってしまわないかも確認する。
      // これが無いと、例えば「シマウマ→ライオン隣接禁止」でシマウマを先に置いた場合、
      // 後から置くライオンの候補からその隣接マスが正しく除外されない。
      const breaksAlreadyPlaced = next.placed.some(
        (p) => p.instanceId !== instanceId && !passesMonotonicSpeciesConditions(next, p)
      );
      if (breaksAlreadyPlaced) continue;
      if (!passesMonotonicStageRules(next, inst.species)) continue;
      out.push(anchor);
    }
  }
  return out;
};

const emptyCellsOf = (state: GameState): Pos[] => {
  const filled = new Set(state.placed.flatMap((p) => p.cells.map(posKey)));
  const out: Pos[] = [];
  for (let r = 0; r < state.stage.rows; r++) {
    for (let c = 0; c < state.stage.cols; c++) {
      if (state.stage.terrain[r][c] !== 'land') continue;
      if (!filled.has(posKey({ r, c }))) out.push({ r, c });
    }
  }
  return out;
};

export type PropagationResult = { state: GameState; fullySolved: boolean; contradiction: boolean };

/**
 * naked single（ある駒の候補が1つだけ）とhidden single（あるマスを覆える候補が1つだけ）を
 * 交互に探し、見つかる限り確定させ続ける。どちらも見つからなくなったら停止する
 * （矛盾が無ければ「行き詰まり」＝これ以上は背理法が必要、というL1判定の材料になる）。
 */
export const propagateToFixation = (initial: GameState): PropagationResult => {
  let state = initial;
  for (;;) {
    if (state.tray.length === 0) {
      // 伝播は「必要」系条件(adjacentRequired/flockRequired)を絞り込みに使っていないため、
      // 全部置き終わっても実際には条件を満たしていない場合がありうる。isStageClearedで確認する。
      return { state, fullySolved: isStageCleared(state), contradiction: false };
    }

    const candidatesByInstance = new Map(
      state.tray.map((t) => [t.instanceId, ruleFilteredCandidateAnchors(state, t.instanceId)])
    );

    for (const [, cands] of candidatesByInstance) {
      if (cands.length === 0) return { state, fullySolved: false, contradiction: true };
    }

    const nakedSingle = state.tray.find((t) => candidatesByInstance.get(t.instanceId)!.length === 1);
    if (nakedSingle) {
      state = placeAnimal(state, nakedSingle.instanceId, candidatesByInstance.get(nakedSingle.instanceId)![0]);
      continue;
    }

    const emptyCells = emptyCellsOf(state);
    let hiddenSingle: { instanceId: string; anchor: Pos } | null = null;
    for (const cell of emptyCells) {
      const covering: { instanceId: string; anchor: Pos }[] = [];
      for (const t of state.tray) {
        for (const anchor of candidatesByInstance.get(t.instanceId)!) {
          if (shapeCells(t.species, anchor).some((cell2) => cell2.r === cell.r && cell2.c === cell.c)) {
            covering.push({ instanceId: t.instanceId, anchor });
          }
        }
      }
      if (covering.length === 1) {
        hiddenSingle = covering[0];
        break;
      }
      if (covering.length === 0) return { state, fullySolved: false, contradiction: true };
    }
    if (hiddenSingle) {
      state = placeAnimal(state, hiddenSingle.instanceId, hiddenSingle.anchor);
      continue;
    }

    return { state, fullySolved: false, contradiction: false };
  }
};
```

- [ ] **Step 4: テストと型チェックを走らせる**

Run: `npm test && npm run typecheck`
Expected: 両方PASS。特に `propagateToFixation solves a stage that only needs naked/hidden singles` が実際に `fullySolved: true` になること、`ruleFilteredCandidateAnchors also excludes anchors that would break an already-placed piece's forbidding condition` が正しく除外を確認できることを確認する。もし前者が停止してしまう場合は、まず `ruleFilteredCandidateAnchors` が `rules` を正しく参照できているか（`state.stage.rules` 経由）を疑うこと。

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
候補生成(幾何のみ/ルール適用後)とnaked/hidden singleによる伝播を追加

L1判定(伝播だけで解けるか)とR算出(ルールで初めて絞れた手)の両方が
この候補生成に依存する。単調な条件(置くと即座に破れる禁止系条件)と
blockAdjacentRequired(地形にしか依存せず常に確定的)だけを伝播の
絞り込みに使い、adjacentRequired/flockRequiredのような「必要」系条件は
将来の配置で満たされうるため候補から除外しない。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 唯一解の実際の配置を取得する

**目的:** ルール手数Rを数えるには「その唯一解で各駒がどこに置かれるか」が要る。`countSolutions` は解の**数**しか返さないので、実際の配置を返す関数を足す。

**Files:**
- Modify: `src/engine/solver.ts`
- Test: `__tests__/engine.test.ts`

**Interfaces:**
- Consumes: Task 1 の `isStageCleared`
- Produces: `findSolution(stage: Stage): GameState | undefined`

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/engine.test.ts` の `describe('countSolutions / solutionStatus', ...)` 内、末尾に追加する。import に `findSolution` を足す。

```ts
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
```

- [ ] **Step 2: テストを走らせて失敗を確認する**

Run: `npm test -- __tests__/engine.test.ts`
Expected: FAIL。`findSolution` が存在しない。

- [ ] **Step 3: 実装する**

`src/engine/solver.ts` に追加する。

```ts
/** そのステージの解を1つ探して返す（複数ある場合は探索順で最初に見つかったもの）。無ければundefined。 */
export const findSolution = (stage: Stage): GameState | undefined => {
  let found: GameState | undefined;

  const backtrack = (state: GameState, index: number): void => {
    if (found) return;
    if (index === stage.animals.length) {
      if (isStageCleared(state)) found = state;
      return;
    }
    for (let r = 0; r < stage.rows && !found; r++) {
      for (let c = 0; c < stage.cols && !found; c++) {
        const next = placeAnimal(state, stage.animals[index].instanceId, { r, c });
        if (next !== state) backtrack(next, index + 1);
      }
    }
  };

  backtrack(createGameState(stage), 0);
  return found;
};
```

- [ ] **Step 4: テストと型チェックを走らせる**

Run: `npm test && npm run typecheck`
Expected: 両方PASS

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
唯一解の実際の配置を返すfindSolutionを追加

countSolutionsは解の数しか返さないため、ルール手数Rの算出には
実際の駒の配置が要る。既存のbacktrackと同じ探索順で最初に見つかった
解を返す。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 深さ制限つき背理法によるレベル判定

**目的:** 伝播だけで解ければL1、詰まったら深さ1・2・3の背理法を順に許して再挑戦し、届いた深さでレベルを決める。

**Files:**
- Create: `src/engine/solver-level.ts`
- Test: `__tests__/engine.test.ts`

**Interfaces:**
- Consumes: Task 2 の `propagateToFixation`/`ruleFilteredCandidateAnchors`、`countGeometricPlacements`（`solver.ts`）
- Produces:
  - `type SolverLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'unsolvable'`
  - `solverLevel(stage: Stage): SolverLevel`

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/engine.test.ts` の末尾（`describe('shipped stage content', ...)` の前）に追加する。import に `solverLevel` を足す。

```ts
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
```

`describe('solverLevel', ...)` を追加する箇所の先頭付近で `STAGES` を使うため、ファイル冒頭の import に `import { STAGES } from '@/levels/stages';` が無ければ追加する（既に `describe('shipped stage content', ...)` で使われているため、通常は追加不要）。

- [ ] **Step 2: テストを走らせて失敗を確認する**

Run: `npm test -- __tests__/engine.test.ts`
Expected: FAIL。`solverLevel` が存在しない。

- [ ] **Step 3: 実装する**

`src/engine/solver-level.ts` を新規作成する。

```ts
import { propagateToFixation, ruleFilteredCandidateAnchors } from './propagation';
import { countGeometricPlacements } from './solver';
import { createGameState, placeAnimal } from './board';
import type { GameState, Pos, Stage } from './types';

export type SolverLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'unsolvable';

/**
 * 深さdepthまでの「候補を1つ仮置きして伝播し、矛盾すれば消す」を許した上で解けるか。
 * depth=0は伝播のみ(L1相当)。伝播が詰まった時点で深さが尽きていれば失敗。
 * 詰まっていなければ、候補数が最小のインスタンス(MRV)を選び、その候補それぞれを
 * 深さを1消費して再帰的に試す。
 */
const solvableWithinDepth = (state: GameState, depth: number): boolean => {
  const { state: propagated, fullySolved, contradiction } = propagateToFixation(state);
  if (fullySolved) return true;
  if (contradiction) return false;
  if (depth === 0) return false;

  let best: { instanceId: string; anchors: Pos[] } | null = null;
  for (const t of propagated.tray) {
    const anchors = ruleFilteredCandidateAnchors(propagated, t.instanceId);
    if (!best || anchors.length < best.anchors.length) best = { instanceId: t.instanceId, anchors };
  }
  if (!best) return false;

  for (const anchor of best.anchors) {
    const next = placeAnimal(propagated, best.instanceId, anchor);
    if (next === propagated) continue;
    if (solvableWithinDepth(next, depth - 1)) return true;
  }
  return false;
};

/**
 * ステージの思考レベルを判定する。幾何的な詰め方が1通りしかなければルールが
 * 一切仕事をしていないためL0（判定より先に不合格）。以降は深さ0(伝播のみ)から
 * 順に3まで試し、最初に解けた深さをレベルとする。深さ3でも解けなければunsolvable。
 */
export const solverLevel = (stage: Stage): SolverLevel => {
  if (countGeometricPlacements(stage, 2) <= 1) return 'L0';

  const initial = createGameState(stage);
  if (solvableWithinDepth(initial, 0)) return 'L1';
  if (solvableWithinDepth(initial, 1)) return 'L2';
  if (solvableWithinDepth(initial, 2)) return 'L3';
  if (solvableWithinDepth(initial, 3)) return 'L4';
  return 'unsolvable';
};
```

- [ ] **Step 4: テストと型チェックを走らせる**

Run: `npm test && npm run typecheck`
Expected: 両方PASS。`L1 when propagation alone solves the stage` が実際に `'L1'` を返すことを確認する（Task 2 で同じ地形の伝播が `fullySolved: true` になることを既に確認済みなので、この結果は導かれるはず）。

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
深さ制限つき背理法によるsolverLevel(L0〜L4/unsolvable)を追加

伝播だけで解ければL1。詰まったら「候補を1つ仮置きして伝播し矛盾すれば
消す」を深さ1→2→3の順に許して再挑戦し、最初に解けた深さをレベルとする。
幾何的な詰め方が1通りしかないステージは判定より先にL0として扱う。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 解答トレース上のルール手数R

**目的:** 「地形と重なりだけを見た候補が2つ以上あり、条件を適用して初めて1つに絞れた手」の数を、決定的な手順で数える。

**Files:**
- Create: `src/engine/rule-trace.ts`
- Test: `__tests__/engine.test.ts`

**Interfaces:**
- Consumes: Task 2 の `ruleFilteredCandidateAnchors`、Task 3 の `findSolution`、`validAnchorCells`（`board.ts`）
- Produces: `countRuleMoves(stage: Stage): number`

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/engine.test.ts` の末尾（`describe('shipped stage content', ...)` の前）に追加する。import に `countRuleMoves` を足す。

```ts
describe('countRuleMoves', () => {
  test('returns 0 for an unsolvable stage', () => {
    const stage = makeStage({
      terrain: Array.from({ length: 5 }, () => Array<CellTerrain>(5).fill('wall')),
      animals: [{ instanceId: 's1', species: 'squirrel' }],
    });
    expect(countRuleMoves(stage)).toBe(0);
  });

  test('returns 0 when the geometric packing is already unique (no rule ever does work)', () => {
    const stage = makeStage({
      terrain: [
        ['land', 'wall', 'wall', 'wall', 'wall'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: [{ instanceId: 's1', species: 'squirrel' }],
    });
    expect(countRuleMoves(stage)).toBe(0);
  });

  test('counts a move where the geometric candidates are ambiguous but the rule narrows to one', () => {
    const stage: Stage = {
      id: 'rule-moves-l1',
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
    // Task 2/Task 4と同じフィクスチャ。シマウマは幾何的に(0,3)アンカーの1通りしかないので
    // シマウマ自身の手はRに数えられない。ライオンは幾何だけなら(0,0)/(3,0)アンカーの2通りが
    // あるが、「シマウマはライオンより上」のルールでシマウマが行0にいる以上(0,0)アンカーは
    // 使えず1通りに絞られる。この1手がRとして数えられるはず。
    expect(countRuleMoves(stage)).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: テストを走らせて失敗を確認する**

Run: `npm test -- __tests__/engine.test.ts`
Expected: FAIL。`countRuleMoves` が存在しない。

- [ ] **Step 3: `src/engine/rule-trace.ts` を作る**

```ts
import { findSolution } from './solver';
import { createGameState, placeAnimal, validAnchorCells } from './board';
import { ruleFilteredCandidateAnchors } from './propagation';
import type { AnimalInstance, GameState, Pos, Species, Stage } from './types';

type ChosenMove = {
  index: number;
  instanceId: string;
  species: Species;
  anchor: Pos;
  geomCount: number;
  ruleCount: number;
};

/**
 * 決定的な手順で次の1手を選ぶ: 条件適用後の候補数(ruleCount)が最小のインスタンスを選び、
 * 同点なら種名の辞書順、それでも同点なら(解答での)アンカーの行→列の順。
 * 手はsolvedAnchorByInstanceに従って必ず唯一解の位置に置く(トレースを迷わせないため)。
 */
const chooseNextMove = (
  state: GameState,
  remaining: AnimalInstance[],
  solvedAnchorByInstance: Map<string, Pos>
): ChosenMove => {
  let chosen: ChosenMove | null = null;
  remaining.forEach((inst, i) => {
    const geomCount = validAnchorCells(state, inst.instanceId).size;
    const ruleCount = ruleFilteredCandidateAnchors(state, inst.instanceId).length;
    const anchor = solvedAnchorByInstance.get(inst.instanceId)!;
    const better =
      !chosen ||
      ruleCount < chosen.ruleCount ||
      (ruleCount === chosen.ruleCount && inst.species < chosen.species) ||
      (ruleCount === chosen.ruleCount &&
        inst.species === chosen.species &&
        (anchor.r < chosen.anchor.r || (anchor.r === chosen.anchor.r && anchor.c < chosen.anchor.c)));
    if (better) chosen = { index: i, instanceId: inst.instanceId, species: inst.species, anchor, geomCount, ruleCount };
  });
  return chosen!;
};

/**
 * 唯一解が存在する前提で、解答を決定的な順序でトレースし、「幾何だけでは2通り以上あるのに
 * 条件を適用して初めて1通りに絞れた手」の数を数える。解が無ければ0を返す
 * （呼び出し側でsolutions===1を別途確認する想定）。
 */
export const countRuleMoves = (stage: Stage): number => {
  const solution = findSolution(stage);
  if (!solution) return 0;

  const solvedAnchorByInstance = new Map(solution.placed.map((p) => [p.instanceId, p.anchor]));
  let state = createGameState(stage);
  let remaining = [...stage.animals];
  let ruleMoves = 0;

  while (remaining.length > 0) {
    const move = chooseNextMove(state, remaining, solvedAnchorByInstance);
    if (move.geomCount >= 2 && move.ruleCount === 1) ruleMoves++;
    state = placeAnimal(state, move.instanceId, move.anchor);
    remaining = remaining.filter((_, i) => i !== move.index);
  }

  return ruleMoves;
};
```

- [ ] **Step 4: テストと型チェックを走らせる**

Run: `npm test && npm run typecheck`
Expected: 両方PASS

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
解答トレース上のルール手数R(countRuleMoves)を追加

「幾何だけでは決まらず、条件を適用して初めて1通りに絞れた手」の数を、
決定的な手順(条件適用後の候補数が最小の種を選び、同点なら種名→解答での
アンカー行列順)でトレースして数える。既知の唯一解に沿って進めるため、
深さ2以上の背理法が要るステージでも数え上げが止まらない。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `gradeStage` / `meetsChapterBar`

**目的:** ここまでの指標（解の数・幾何解数・レベル・ルール手数R）に加えて「実際に効いている条件数」を算出し、章ごとの合格ラインと突き合わせる。

**Files:**
- Create: `src/lib/stage-difficulty.ts`
- Modify: `src/engine/index.ts`
- Test: `__tests__/engine.test.ts`

**Interfaces:**
- Consumes: Task 1 の `countSolutions(stage, cap, skip, skipRuleIndex)`、Task 4 の `solverLevel`/`SolverLevel`、Task 5 の `countRuleMoves`、`countGeometricPlacements`（`solver.ts`）、`SPECIES`（`species.ts`）、`findDesignWarnings`/`DesignWarning`（`src/lib/stage-design-checks.ts`）
- Produces:
  - `type StageGrade = { solutions: number; geometricPackings: number; level: SolverLevel; ruleMoves: number; effectiveConditions: number; warnings: DesignWarning[] }`
  - `gradeStage(stage: Stage): StageGrade`
  - `meetsChapterBar(grade: StageGrade, chapterNumber: number): string[]`（1始まりの章番号。違反理由の配列、空なら合格）

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/engine.test.ts` とは別に、新規テストファイル `__tests__/stage-difficulty.test.ts` を作る。

```ts
import { gradeStage, meetsChapterBar } from '@/lib/stage-difficulty';
import type { CellTerrain, Stage } from '@/engine';

const unsolvableStage: Stage = {
  id: 'grade-unsolvable',
  name: 'x',
  rows: 5,
  cols: 5,
  terrain: Array.from({ length: 5 }, () => Array<CellTerrain>(5).fill('wall')),
  animals: [{ instanceId: 's1', species: 'squirrel' }],
};

const l0Stage: Stage = {
  id: 'grade-l0',
  name: 'x',
  rows: 5,
  cols: 5,
  terrain: [
    ['land', 'wall', 'wall', 'wall', 'wall'],
    ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
  ],
  animals: [{ instanceId: 's1', species: 'squirrel' }],
};

const l1Stage: Stage = {
  id: 'grade-l1',
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

describe('gradeStage', () => {
  test('unsolvable stage: solutions 0, level unsolvable, no rule moves or effective conditions', () => {
    const grade = gradeStage(unsolvableStage);
    expect(grade.solutions).toBe(0);
    expect(grade.level).toBe('unsolvable');
    expect(grade.ruleMoves).toBe(0);
    expect(grade.effectiveConditions).toBe(0);
  });

  test('L0 stage: unique solution but geometric packing is also 1, level L0', () => {
    const grade = gradeStage(l0Stage);
    expect(grade.solutions).toBe(1);
    expect(grade.geometricPackings).toBe(1);
    expect(grade.level).toBe('L0');
  });

  test('L1 stage: unique solution, geometric packing > 1, level L1, at least one effective condition', () => {
    const grade = gradeStage(l1Stage);
    expect(grade.solutions).toBe(1);
    expect(grade.geometricPackings).toBeGreaterThan(1);
    expect(grade.level).toBe('L1');
    // ステージ限定ルール(zebra above lion)を外すとlion@(0,0)の組み合わせも許されてしまい
    // 解が2つになる。zebra自身のadjacentForbidden(lion)は常に非隣接なので外しても解は
    // 変わらない(効いていない)。よってeffectiveConditionsはルール分の1のみ。
    expect(grade.effectiveConditions).toBeGreaterThanOrEqual(1);
  });
});

describe('meetsChapterBar', () => {
  test('a grade with too few effective conditions for chapter 1 reports a condition-count reason', () => {
    const grade = gradeStage(l1Stage);
    // l1Stageの効いている条件数は1(ステージ限定ルールのみ)で、1章の必要範囲2〜3本に
    // 届かない。ここでは合否理由に条件数の指摘が含まれることを確認する。
    const reasons = meetsChapterBar(grade, 1);
    expect(reasons.some((r) => r.includes('条件数'))).toBe(true);
  });

  test('an unsolvable grade fails every chapter bar with a solutions reason', () => {
    const grade = gradeStage(unsolvableStage);
    const reasons = meetsChapterBar(grade, 1);
    expect(reasons.some((r) => r.includes('唯一解'))).toBe(true);
  });

  test('chapter 2 requires L3 or above', () => {
    const grade = gradeStage(l1Stage); // level L1
    const reasons = meetsChapterBar(grade, 2);
    expect(reasons.some((r) => r.includes('レベル'))).toBe(true);
  });
});
```

- [ ] **Step 2: テストを走らせて失敗を確認する**

Run: `npm test -- __tests__/stage-difficulty.test.ts`
Expected: FAIL。`@/lib/stage-difficulty` が存在しない。

- [ ] **Step 3: 実装する**

`src/engine/index.ts` に2行追加する。

```ts
export * from './propagation';
export * from './solver-level';
export * from './rule-trace';
```

（`export * from './solver';` の直後に挿入する。既存の `export * from './solver';` はそのまま残す。）

`src/lib/stage-difficulty.ts` を新規作成する。

```ts
import type { SolverLevel, Species, Stage } from '@/engine';
import { SPECIES, countGeometricPlacements, countRuleMoves, countSolutions, solverLevel } from '@/engine';
import { findDesignWarnings, type DesignWarning } from './stage-design-checks';

export type StageGrade = {
  solutions: number;
  geometricPackings: number;
  level: SolverLevel;
  ruleMoves: number;
  effectiveConditions: number;
  warnings: DesignWarning[];
};

/**
 * そのステージで実際に効いている条件の数。種の性格・ステージ限定ルールそれぞれについて、
 * 「その1つだけを外すと解が2つ以上になる（唯一性が崩れる）」ものを数える。
 * 解が唯一でないステージではそもそも意味が無いため呼ばない（gradeStageが呼び出し元で分岐する）。
 */
const countEffectiveConditions = (stage: Stage): number => {
  let effective = 0;
  const speciesInStage = new Set<Species>(stage.animals.map((a) => a.species));
  for (const species of speciesInStage) {
    SPECIES[species].conditions.forEach((_, index) => {
      const withoutThis = countSolutions(stage, 2, { species, index });
      if (withoutThis !== 1) effective++;
    });
  }
  (stage.rules ?? []).forEach((_, index) => {
    const withoutThis = countSolutions(stage, 2, undefined, index);
    if (withoutThis !== 1) effective++;
  });
  return effective;
};

export const gradeStage = (stage: Stage): StageGrade => {
  const solutions = countSolutions(stage, 2);
  const geometricPackings = countGeometricPlacements(stage, 20);
  const level = solverLevel(stage);
  const ruleMoves = solutions === 1 ? countRuleMoves(stage) : 0;
  const effectiveConditions = solutions === 1 ? countEffectiveConditions(stage) : 0;
  const warnings = findDesignWarnings(stage);
  return { solutions, geometricPackings, level, ruleMoves, effectiveConditions, warnings };
};

type ChapterBar = { minLevel: SolverLevel; minRuleMoves: number; conditionRange: [number, number] };

/** L0 < L1 < L2 < L3 < L4。unsolvableはどのバーも満たさない別枠として扱う。 */
const LEVEL_ORDER: SolverLevel[] = ['L0', 'L1', 'L2', 'L3', 'L4'];

const levelAtLeast = (level: SolverLevel, min: SolverLevel): boolean => {
  if (level === 'unsolvable') return false;
  return LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(min);
};

/** 設計書8.4節の表そのもの。1章・2〜4章・5〜6章の3段階。 */
const CHAPTER_BARS: ChapterBar[] = [
  { minLevel: 'L1', minRuleMoves: 0, conditionRange: [2, 3] },
  { minLevel: 'L3', minRuleMoves: 4, conditionRange: [3, 6] },
  { minLevel: 'L4', minRuleMoves: 5, conditionRange: [5, 8] },
];

const barForChapter = (chapterNumber: number): ChapterBar => {
  if (chapterNumber <= 1) return CHAPTER_BARS[0];
  if (chapterNumber <= 4) return CHAPTER_BARS[1];
  return CHAPTER_BARS[2];
};

/** 章番号(1始まり)ごとの合格ラインと突き合わせ、違反理由の一覧を返す。空配列なら合格。 */
export const meetsChapterBar = (grade: StageGrade, chapterNumber: number): string[] => {
  const reasons: string[] = [];
  if (grade.solutions !== 1) reasons.push(`唯一解ではない（解の数: ${grade.solutions}）`);
  if (grade.geometricPackings <= 1) reasons.push('幾何的な詰め方が1通りしかない（L0）');

  const bar = barForChapter(chapterNumber);
  if (!levelAtLeast(grade.level, bar.minLevel)) {
    reasons.push(`必要レベル${bar.minLevel}に届いていない（実際: ${grade.level}）`);
  }
  if (grade.ruleMoves < bar.minRuleMoves) {
    reasons.push(`ルール手数が足りない（必要${bar.minRuleMoves}以上、実際${grade.ruleMoves}）`);
  }
  if (grade.effectiveConditions < bar.conditionRange[0] || grade.effectiveConditions > bar.conditionRange[1]) {
    reasons.push(
      `条件数が範囲外（${bar.conditionRange[0]}〜${bar.conditionRange[1]}が必要、実際${grade.effectiveConditions}）`
    );
  }
  return reasons;
};
```

- [ ] **Step 4: テストと型チェックを走らせる**

Run: `npm test && npm run typecheck`
Expected: 両方PASS

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
ステージ採点(gradeStage)と章の合格ライン判定(meetsChapterBar)を追加

解の数・幾何解数・思考レベル・ルール手数Rに加えて、「その条件を1つ
外すと解が2つ以上になるか」で実際に効いている条件数を数える。
meetsChapterBarは設計書8.4節の表(1章/2〜4章/5〜6章)と突き合わせ、
違反理由の一覧を返す。分割3のステージ生成器がこれをフィルタに使う。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 出荷済み18ステージへの採点を回帰テストに加える

**目的:** 新しい採点系が既存18ステージに対しても矛盾なく動くことを確認する。**章の合格ラインを既存18ステージに強制するのは分割3の仕事なので、ここでは強制しない。**

**Files:**
- Modify: `__tests__/engine.test.ts`

**Interfaces:**
- Consumes: Task 6 の `gradeStage`

- [ ] **Step 1: テストを追加する**

`__tests__/engine.test.ts` の `describe('shipped stage content', ...)` ブロックの末尾（`every stage appears in exactly one chapter` テストの後）に追加する。import に `gradeStage`（`@/lib/stage-difficulty`から）を足す。

```ts
  test.each(STAGES)('$id ($name) grades consistently with its known unique solution', (stage) => {
    // 章の合格ライン(L3以上・R≧4など)は分割3(生成器＋全ステージ作り直し)で満たす対象。
    // ここではgradeStageが既存の唯一解判定と矛盾しないことだけを確認する。
    const grade = gradeStage(stage);
    expect(grade.solutions).toBe(1);
    expect(grade.geometricPackings).toBeGreaterThanOrEqual(1);
    expect(grade.level).not.toBe('unsolvable');
  });
```

- [ ] **Step 2: テストを走らせる**

Run: `npm test -- __tests__/engine.test.ts`
Expected: PASS。18ステージ全てで `grade.solutions === 1`・`level !== 'unsolvable'` となることを確認する。

もし特定のステージで `level` が `'unsolvable'` になってしまった場合（Task 4 の深さ3打ち切りが、実際には解けるが探索が深く必要なケースを取りこぼした場合）、それは `solverLevel`/`solvableWithinDepth` の不具合の可能性が高いので、その旨を `NEEDS_CONTEXT` として報告すること（このテストの期待値を緩めて誤魔化さない）。

- [ ] **Step 3: 型チェックを走らせる**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
出荷済み18ステージの回帰テストにgradeStageの整合性チェックを追加

章の合格ライン(L3以上・ルール手数R≧4など)を既存18ステージに強制するのは
分割3(生成器＋全ステージ作り直し)の仕事。ここではgradeStageが既存の
唯一解判定(countSolutions/solutionStatus)と矛盾しない結果を返すことだけを
確認する回帰テストを加えた。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: デプロイ

**Files:** なし（ビルドと公開のみ）

**Note:** 本計画はUIを一切変更しない（`src/engine`/`src/lib`のみ）。プレイヤーから見える変化は無いが、AGENTS.mdの「コード変更が終わったら指示を待たずに再デプロイする」という恒久方針に従い、最新のmasterを反映する。

- [ ] **Step 1: 最終確認**

Run: `npm test && npm run typecheck`
Expected: 両方PASS

- [ ] **Step 2: master へ push**

```bash
git push origin master
```

- [ ] **Step 3: web をビルドする**

```bash
npx expo export -p web
```

- [ ] **Step 4: SPA フォールバックと .nojekyll を用意する**

```bash
cp dist/+not-found.html dist/404.html && touch dist/.nojekyll
```

- [ ] **Step 5: gh-pages ブランチへ push する**

`AGENTS.md` の手順どおり、使い捨ての `git worktree` を使って `dist/` の中身（`.nojekyll` を含む）を `gh-pages` に push する。リモートの `gh-pages` が先に進んでいた場合は force-push せず、`git reset --soft origin/gh-pages` してから再度 `dist/` の内容をコミットし直すこと（前回の分割1デプロイで実際に発生した手順）。

- [ ] **Step 6: デプロイが反映されたか確認する**

`dist/_expo/` 以下の実在するアセットURLに対して `curl -sI` を打ち、200 が返ることを確認する。

Live URL: https://masato-masa.github.io/animal-puzzle/

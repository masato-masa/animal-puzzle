# エンジン拡張とUI 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 盤面をブロック方式に変え、条件を「種の性格」と「ステージ限定ルール」の2層に拡張し、新種4種と条件の達成状況表示を追加する。

**Architecture:** 既存の `src/engine` はイミュータブルな純関数群（`GameState` を受け取り新しい `GameState` を返す）で、UIはそれを読むだけ。この構造は維持する。条件判定は `conditionCheckers` という `kind` をキーにしたレコードで分岐しており、新しい条件は**このレコードにエントリを足すだけ**で追加できる。ステージ限定ルールは種をまたぐため個体単位の判定に乗らず、`src/engine/stage-rules.ts` を新設して別系統で評価する。

**Tech Stack:** TypeScript 6, React Native 0.86 / React 19, Expo SDK 57（[versioned docs](https://docs.expo.dev/versions/v57.0.0/) を必ず参照）, expo-router, Jest (jest-expo preset)

**Spec:** `docs/superpowers/specs/2026-09-03-rules-and-difficulty-design.md`

## Global Constraints

- Expo SDK は v57。API を調べるときは https://docs.expo.dev/versions/v57.0.0/ を読む。記憶で書かない
- テストは `npm test`、型チェックは `npm run typecheck`。**両方green でなければコミットしない**
- パスエイリアスは `@/` → `src/`（`@/assets/` → `assets/`）
- コード内のコメントと、ユーザーに見える文言はすべて日本語
- 既存コードのコメント密度・命名・書き方に合わせる。イミュータブルな純関数のスタイルを崩さない
- **出荷済み18ステージを壊さない。** `__tests__/engine.test.ts` の `shipped stage content` は全タスクを通してgreenのまま。既存5種（リス・シマウマ・ライオン・キリン・ゾウ）の性格変更は本計画の対象外で、分割3（ステージ生成器と全面作り直し）で全ステージの差し替えと同時に行う
- 種同士の制約は**片側にだけ**書く（`src/engine/species.ts` の先頭コメント参照）。両側に重複して書かない
- コミットメッセージは日本語。末尾に `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` を付ける

---

## File Structure

| ファイル | 役割 | 変更 |
|---|---|---|
| `src/engine/types.ts` | 型定義のみ。ロジックを持たない | 修正 |
| `src/engine/board.ts` | 配置可否と盤面操作 | 修正 |
| `src/engine/conditions.ts` | 種の性格（個体単位の条件）の判定 | 修正 |
| `src/engine/stage-rules.ts` | ステージ限定ルール（種ペア単位）の判定 | **新規** |
| `src/engine/species.ts` | 動物図鑑テーブル | 修正 |
| `src/engine/validate.ts` | ステージデータの構造検証 | 修正 |
| `src/engine/solver.ts` | 解の数え上げ | 修正 |
| `src/engine/index.ts` | 再エクスポート | 修正 |
| `src/lib/condition-text.ts` | 条件 → 日本語文言 | 修正 |
| `src/lib/animal-art.ts` | 種 → 画像 | 修正 |
| `src/theme.ts` | 配色・絵文字・種名 | 修正 |
| `src/components/board-cell.tsx` | 盤面1マスの描画 | 修正 |
| `src/components/conditions-panel.tsx` | 条件一覧の表示 | 修正 |
| `src/components/stage-game-view.tsx` | ゲーム画面の組み立て | 修正 |
| `src/app/editor.tsx` | ステージエディタ | 修正 |
| `src/lib/stage-submission.ts` | 投稿用コード片の生成 | 修正 |
| `src/levels/stages.ts` | 出荷ステージ | 修正（見取り図の文字割り当てのみ） |
| `src/storage/migrate-stage.ts` | 保存済みステージの地形を現行の型に合わせる純関数 | **新規** |
| `src/storage/custom-stages.ts` | カスタムステージの保存と読み込み | 修正 |
| `__tests__/engine.test.ts` | エンジンのテスト | 修正 |

---

### Task 1: 盤面をブロック方式にする

地形で置ける動物を限定する方式（`water` には `crocodile` しか置けない等）を廃止し、`land` だけが配置可能マス、それ以外は「置けないブロック」にする。`Terrain` 型と `AnimalDef.terrain` を削除し、`sky` を消す。

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/board.ts:18-25`
- Modify: `src/engine/validate.ts`
- Modify: `src/engine/species.ts`
- Modify: `src/theme.ts:6-57`
- Modify: `src/components/board-cell.tsx`
- Modify: `src/app/editor.tsx:24-32`
- Modify: `src/lib/stage-submission.ts:5`
- Modify: `src/levels/stages.ts:12`
- Create: `src/storage/migrate-stage.ts`
- Modify: `src/storage/custom-stages.ts:7-15`
- Test: `__tests__/engine.test.ts`

**Interfaces:**
- Produces:
  - `type BlockKind = 'wall' | 'water' | 'tree'`
  - `type ConditionBlock = Exclude<BlockKind, 'wall'>`（= `'water' | 'tree'`）
  - `type CellTerrain = 'land' | BlockKind | 'void'`
  - `type AnimalDef = { species: Species; shape: ShapeKey; conditions: Condition[] }`（`terrain` が消える）
  - `Terrain` 型は**削除**される

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/engine.test.ts` の `test('canPlace rejects terrain mismatch', ...)`（73行目付近）を、以下でまるごと置き換える。

```ts
  test('canPlace rejects a water block cell', () => {
    const stage = makeStage({
      terrain: [
        ['water', 'land', 'land', 'land', 'land'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('land')),
      ],
      animals: [{ instanceId: 'z1', species: 'zebra' }],
    });
    const state = createGameState(stage);
    expect(canPlace(state, 'z1', { r: 0, c: 0 })).toBe(false);
    expect(canPlace(state, 'z1', { r: 0, c: 1 })).toBe(true);
  });

  test('canPlace rejects a tree block cell', () => {
    const stage = makeStage({
      terrain: [
        ['tree', 'land', 'land', 'land', 'land'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('land')),
      ],
      animals: [{ instanceId: 's1', species: 'squirrel' }],
    });
    const state = createGameState(stage);
    expect(canPlace(state, 's1', { r: 0, c: 0 })).toBe(false);
    expect(canPlace(state, 's1', { r: 0, c: 1 })).toBe(true);
  });
```

さらに `describe('validateStage', ...)` 内の `test('flags a per-terrain cell count mismatch', ...)`（425行目付近）を置き換える。

```ts
  test('flags a placeable cell count mismatch', () => {
    const bad: Stage = {
      ...validStage,
      terrain: [Array<CellTerrain>(5).fill('water'), ...validStage.terrain.slice(1)],
    };
    expect(validateStage(bad).some((e) => e.includes('placeable cell count'))).toBe(true);
  });

  test('water and tree blocks are excluded from the placeable count just like wall', () => {
    const stage: Stage = {
      id: 'blocks',
      name: 'x',
      rows: 5,
      cols: 5,
      terrain: [
        ['water', 'tree', 'wall', 'land', 'land'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: [
        { instanceId: 's0', species: 'squirrel' },
        { instanceId: 's1', species: 'squirrel' },
      ],
    };
    expect(validateStage(stage)).toEqual([]);
  });
```

最後に `test('flags symbiosisRequired with a missing partner species', ...)`（463行目付近）は `sky` を使っているので置き換える。

```ts
  test('flags symbiosisRequired with a missing partner species', () => {
    const stage: Stage = {
      id: 'lonely-oxpecker',
      name: 'x',
      rows: 5,
      cols: 5,
      terrain: [
        ['land', 'land', 'land', 'wall', 'wall'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: Array.from({ length: 3 }, (_, i) => ({ instanceId: `o${i}`, species: 'oxpecker' as const })),
    };
    expect(validateStage(stage).some((e) => e.includes('symbiosisRequired(giraffe) but no giraffe'))).toBe(true);
  });
```

- [ ] **Step 2: テストを走らせて失敗を確認する**

Run: `npm test -- __tests__/engine.test.ts`
Expected: FAIL。`'water'`/`'tree'` が `CellTerrain` に存在しない型エラー、および `placeable cell count` を含むエラーが出ないことによる失敗。

- [ ] **Step 3: 型を書き換える**

`src/engine/types.ts` の `Terrain` / `CellTerrain` の定義（7〜13行目付近）を、以下で置き換える。

```ts
/** 動物を置けないブロック。盤面の仕切りであり、一部は条件から参照される。 */
export type BlockKind = 'wall' | 'water' | 'tree';

/** 条件から参照できるブロック。草むら(wall)は純粋な仕切りなので含めない。 */
export type ConditionBlock = Exclude<BlockKind, 'wall'>;

/**
 * 盤面グリッド上のセル種別。'land'だけが動物を置けるマスで、ブロックと'void'には
 * 一切置けない＝隣接判定にも関与しない（ブロックを参照する条件を除く）。
 * 'void'は盤面の外側で「マスが存在しない」ことを表す。
 */
export type CellTerrain = 'land' | BlockKind | 'void';
```

同ファイルの `AnimalDef` から `terrain` を削除する。

```ts
export type AnimalDef = {
  species: Species;
  shape: ShapeKey;
  conditions: Condition[];
};
```

- [ ] **Step 4: 配置判定と検証を書き換える**

`src/engine/board.ts` の `canPlace` を以下にする。

```ts
export const canPlace = (state: GameState, instanceId: string, anchor: Pos): boolean => {
  const inTray = state.tray.find((a) => a.instanceId === instanceId);
  if (!inTray) return false;
  const cells = shapeCells(inTray.species, anchor);
  return cells.every((cell) => terrainAt(state.stage, cell) === 'land' && !animalAt(state, cell));
};
```

同ファイル冒頭の `import { SPECIES } from './species';` は未使用になるので削除する。

`src/engine/validate.ts` から `const TERRAINS: Terrain[] = [...]` と、`terrainCounts` / `requiredCounts` を使った地形ごとの検証ブロックを削除し、配置可能マスの数え上げだけを残す。

```ts
  let totalPlaceableCells = 0;
  for (const row of stage.terrain) {
    for (const t of row) {
      if (t === 'land') totalPlaceableCells++;
    }
  }

  let totalRequiredCells = 0;
  for (const a of stage.animals) {
    const def = SPECIES[a.species];
    if (!def) continue;
    totalRequiredCells += SHAPES[def.shape]?.length ?? 0;
  }

  if (totalPlaceableCells !== totalRequiredCells) {
    errors.push(
      `${label} placeable cell count (${totalPlaceableCells}) != total animal cell count (${totalRequiredCells})`
    );
  }
```

`import type { ... Terrain } from './types'` から `Terrain` を外す。

- [ ] **Step 5: 図鑑とUI側の型エラーを解消する**

`src/engine/species.ts` の各エントリから `terrain: '...',` の行をすべて削除する（条件はこの時点では変えない）。ファイル先頭のコメントにある「ワニは常にwater地形にしか存在しないため〜」の段落は事実でなくなるので削除する。

`src/theme.ts` の `colors` から `sky` / `skyDark` / `skyLight` を削除し、木ブロックの色を追加する。

```ts
  /** 水ブロック。誰も乗れない。 */
  water: '#4FB8E8',
  waterDark: '#1E7BA8',
  waterLight: '#A7E3F7',

  /** 木ブロック。誰も乗れない。 */
  tree: '#2E6B3A',
  treeDark: '#1B4423',
  treeLight: '#4F9160',
```

`terrainColors` を置き換える。

```ts
export const terrainColors = {
  land: { fill: colors.land, dark: colors.landDark, light: colors.landLight },
  water: { fill: colors.water, dark: colors.waterDark, light: colors.waterLight },
  tree: { fill: colors.tree, dark: colors.treeDark, light: colors.treeLight },
  wall: { fill: colors.wall, dark: colors.wallDark, light: colors.wallLight },
} as const;
```

`src/components/board-cell.tsx` の props の型を差し替える（`board.tsx` は `void` と `land` を描画前に弾いているので、届くのはブロックだけ）。

```ts
import type { BlockKind } from '@/engine';

type Props = {
  terrain: BlockKind;
  /** 1マスの辺長(px)。茂み画像をパーセント指定にするとreact-native-webで高さ0になることがあるため、実寸で渡す。 */
  size: number;
};

/**
 * 盤面1マス分のブロック。land と void は呼び出し側（board.tsx）で描画しない。
 * wallは切り抜き済みの茂み画像をマスにそのまま置くだけ（枠・背景なし）。
 */
export function BoardCell({ terrain, size }: Props) {
  if (terrain === 'wall') {
    return <Image source={bushArt} resizeMode="contain" style={{ width: size, height: size }} />;
  }
  const palette = terrainColors[terrain];
  return <View style={[styles.tile, { backgroundColor: palette.fill }]} />;
}
```

`src/app/editor.tsx` の24行目の種フィルタから地形参照を外す。

```ts
const ALL_SPECIES = Object.keys(SPECIES) as Species[];
```

`src/lib/stage-submission.ts` の `TERRAIN_CODE` を置き換える。

```ts
const TERRAIN_CODE: Record<CellTerrain, string> = { land: '.', water: '~', tree: 'T', wall: '#', void: 'x' };
```

`src/levels/stages.ts` の `TERRAIN_CHARS` を置き換える（`^`=sky を落とし、`T`=木を足す）。

```ts
const TERRAIN_CHARS: Record<string, CellTerrain> = { '.': 'land', '~': 'water', T: 'tree', '#': 'wall', x: 'void' };
```

同ファイルの見取り図コメント（13行目付近）の凡例も `.=平地 ~=水ブロック T=木ブロック #=壁 x=void` に直す。

- [ ] **Step 6: 保存済みカスタムステージを読めるようにする**

ユーザーがエディタで作って AsyncStorage に保存したステージには `'sky'` を含むものがあり、`CellTerrain` から `sky` が消えた今そのままでは型に合わない。読み込み時に変換する。

まずテストを書く。`__tests__/engine.test.ts` の末尾に追加する（`migrateStageTerrain` を `@/storage/migrate-stage` から import する）。

```ts
describe('migrateStageTerrain', () => {
  test('turns removed sky cells into void and leaves everything else alone', () => {
    const legacy = {
      id: 'custom-1',
      name: '古いステージ',
      rows: 5,
      cols: 5,
      terrain: [
        ['sky', 'land', 'water', 'wall', 'void'],
        ...Array.from({ length: 4 }, () => Array(5).fill('land')),
      ],
      animals: [{ instanceId: 's0', species: 'squirrel' }],
    } as unknown as Stage;

    expect(migrateStageTerrain(legacy).terrain[0]).toEqual(['void', 'land', 'water', 'wall', 'void']);
  });

  test('returns an equivalent stage when there is nothing to migrate', () => {
    const stage = makeStage({ animals: [{ instanceId: 's0', species: 'squirrel' }] });
    expect(migrateStageTerrain(stage)).toEqual(stage);
  });
});
```

`src/storage/migrate-stage.ts` を新規作成する。AsyncStorage を import しない純関数だけの薄いモジュールにして、ストレージ層を触らずにテストできるようにする。

```ts
import type { CellTerrain, Stage } from '@/engine';

const VALID: ReadonlySet<string> = new Set<CellTerrain>(['land', 'wall', 'water', 'tree', 'void']);

/**
 * 保存済みステージの地形を現在のCellTerrainに合わせる。廃止した'sky'や未知の値は
 * 'void'（マスが存在しない）に倒す。水は「乗れる地形」から「乗れないブロック」に
 * 意味が変わったが、値そのものは同じなのでそのまま残す。
 */
export const migrateStageTerrain = (stage: Stage): Stage => ({
  ...stage,
  terrain: stage.terrain.map((row) => row.map((t) => (VALID.has(t) ? t : ('void' as CellTerrain)))),
});
```

`src/storage/custom-stages.ts` の `load` で、返す直前に通す。

```ts
    return Array.isArray(parsed) ? (parsed as Stage[]).map(migrateStageTerrain) : [];
```

`import { migrateStageTerrain } from './migrate-stage';` を足す。

- [ ] **Step 7: テストと型チェックを走らせる**

Run: `npm test && npm run typecheck`
Expected: 両方PASS。特に `shipped stage content` の18ステージが全部greenであること（出荷ステージは `.` と `#` しか使っていないので影響を受けない）。

- [ ] **Step 8: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
盤面を地形方式からブロック方式に変更

地形で置ける動物を限定する方式は、候補が機械的に絞られてかえって簡単になり、
地形ごとに専用の動物が必要になって種類が膨張するため廃止した。

landだけを配置可能マスとし、wall/water/treeは誰も置けないブロックにする。
Terrain型とAnimalDef.terrainを削除、sky地形は消滅。validateStageの地形ごとの
マス数一致検証は、landの総数と動物の占有マス数の一致だけに簡約した。

保存済みのカスタムステージにskyが残っている可能性があるため、読み込み時に
voidへ倒す変換を入れた。

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 条件型の名前を整理する

`Condition` を `SpeciesCondition` に、`symbiosisRequired` を `adjacentRequired` に改名する。ステージ限定ルール（Task 5）と並べたときに、どちらが種の性格なのかが名前で分かるようにするため。意味は変えない。

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/conditions.ts`
- Modify: `src/engine/species.ts:57`
- Modify: `src/engine/validate.ts:75-76`
- Modify: `src/lib/condition-text.ts`
- Test: `__tests__/engine.test.ts`

**Interfaces:**
- Consumes: Task 1 の `AnimalDef`
- Produces:
  - `type SpeciesCondition`（旧 `Condition`。`Condition` という名前は消える）
  - `{ kind: 'adjacentRequired'; with: Species }`（旧 `symbiosisRequired`）
  - `conditionCheckers: Record<SpeciesCondition['kind'], ConditionChecker>`

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/engine.test.ts` の `test('symbiosisRequired fails without the required neighbor and passes once adjacent', ...)`（273行目付近）を置き換える。

```ts
  test('adjacentRequired fails without the required neighbor and passes once adjacent', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 'o1', species: 'oxpecker' },
        { instanceId: 'g1', species: 'giraffe' },
      ],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 'o1', { r: 0, c: 0 });
    const condition = { kind: 'adjacentRequired', with: 'giraffe' } as const;

    expect(conditionCheckers.adjacentRequired(state, state.placed[0], condition)).toBe(false);

    state = placeAnimal(state, 'g1', { r: 0, c: 1 });
    expect(conditionCheckers.adjacentRequired(state, state.placed[0], condition)).toBe(true);
  });
```

`validateStage` の `test('flags symbiosisRequired with a missing partner species', ...)` は、期待文字列を新しい名前に直す。

```ts
    expect(validateStage(stage).some((e) => e.includes('adjacentRequired(giraffe) but no giraffe'))).toBe(true);
```

テスト名も `flags adjacentRequired with a missing partner species` に直す。

- [ ] **Step 2: テストを走らせて失敗を確認する**

Run: `npm test -- __tests__/engine.test.ts`
Expected: FAIL。`conditionCheckers.adjacentRequired` が存在しない。

- [ ] **Step 3: 改名する**

`src/engine/types.ts`:

```ts
/** 動物の性格。全ステージで共通に適用される。 */
export type SpeciesCondition =
  | { kind: 'adjacentForbidden'; with: Species }
  | { kind: 'adjacentRequired'; with: Species }
  | { kind: 'minDistance'; from: Species; distance: number }
  | { kind: 'flockRequired' };
```

`AnimalDef.conditions` の型も `SpeciesCondition[]` にする。

`src/engine/conditions.ts`: `Condition` の import を `SpeciesCondition` に変え、`ConditionChecker` と `conditionCheckers` の型引数を差し替え、チェッカーのキーを改名する。

```ts
  adjacentRequired: (state, animal, c) => {
    if (c.kind !== 'adjacentRequired') return true;
    return neighborsOf(state, animal).some((n) => n.species === c.with);
  },
```

`src/engine/species.ts` の oxpecker: `{ kind: 'adjacentRequired', with: 'giraffe' }`

`src/engine/validate.ts`:

```ts
      if (c.kind === 'adjacentRequired' && !speciesCount.get(c.with)) {
        errors.push(`${label} ${species} has adjacentRequired(${c.with}) but no ${c.with} in stage`);
      }
```

`src/lib/condition-text.ts`: import を `SpeciesCondition` に変え、`case 'symbiosisRequired':` を `case 'adjacentRequired':` にする（返す文言は変えない）。

- [ ] **Step 4: テストと型チェックを走らせる**

Run: `npm test && npm run typecheck`
Expected: 両方PASS

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
条件型をSpeciesConditionに、symbiosisRequiredをadjacentRequiredに改名

ステージ限定ルールを追加したときに、どちらが動物の性格でどちらが出題側の
仕掛けなのかを名前で区別できるようにする。意味は変えていない。

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: ななめ隣接禁止・まわり8マス禁止を追加する

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/conditions.ts`
- Modify: `src/lib/condition-text.ts`
- Test: `__tests__/engine.test.ts`

**Interfaces:**
- Consumes: Task 2 の `SpeciesCondition` / `conditionCheckers`
- Produces:
  - `{ kind: 'diagonalForbidden'; with: Species }`
  - `{ kind: 'surroundForbidden'; with: Species }`
  - `conditionCheckers.diagonalForbidden` / `conditionCheckers.surroundForbidden`

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/engine.test.ts` の `describe('conditionCheckers', ...)` の末尾に追加する。

```ts
  test('diagonalForbidden fails only on a diagonal touch, not an orthogonal one', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 's1', species: 'squirrel' },
        { instanceId: 's2', species: 'squirrel' },
      ],
    });
    const condition = { kind: 'diagonalForbidden', with: 'squirrel' } as const;

    let diagonal = createGameState(stage);
    diagonal = placeAnimal(diagonal, 's1', { r: 0, c: 0 });
    diagonal = placeAnimal(diagonal, 's2', { r: 1, c: 1 });
    expect(conditionCheckers.diagonalForbidden(diagonal, diagonal.placed[0], condition)).toBe(false);

    let orthogonal = createGameState(stage);
    orthogonal = placeAnimal(orthogonal, 's1', { r: 0, c: 0 });
    orthogonal = placeAnimal(orthogonal, 's2', { r: 0, c: 1 });
    expect(conditionCheckers.diagonalForbidden(orthogonal, orthogonal.placed[0], condition)).toBe(true);
  });

  test('surroundForbidden fails on both diagonal and orthogonal touches', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 's1', species: 'squirrel' },
        { instanceId: 's2', species: 'squirrel' },
      ],
    });
    const condition = { kind: 'surroundForbidden', with: 'squirrel' } as const;

    let diagonal = createGameState(stage);
    diagonal = placeAnimal(diagonal, 's1', { r: 0, c: 0 });
    diagonal = placeAnimal(diagonal, 's2', { r: 1, c: 1 });
    expect(conditionCheckers.surroundForbidden(diagonal, diagonal.placed[0], condition)).toBe(false);

    let orthogonal = createGameState(stage);
    orthogonal = placeAnimal(orthogonal, 's1', { r: 0, c: 0 });
    orthogonal = placeAnimal(orthogonal, 's2', { r: 0, c: 1 });
    expect(conditionCheckers.surroundForbidden(orthogonal, orthogonal.placed[0], condition)).toBe(false);

    let apart = createGameState(stage);
    apart = placeAnimal(apart, 's1', { r: 0, c: 0 });
    apart = placeAnimal(apart, 's2', { r: 2, c: 2 });
    expect(conditionCheckers.surroundForbidden(apart, apart.placed[0], condition)).toBe(true);
  });

  test('diagonalForbidden uses every occupied cell of a multi-cell piece', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 'e1', species: 'elephant' },
        { instanceId: 's1', species: 'squirrel' },
      ],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 'e1', { r: 0, c: 0 });
    state = placeAnimal(state, 's1', { r: 2, c: 2 });
    const condition = { kind: 'diagonalForbidden', with: 'squirrel' } as const;
    expect(conditionCheckers.diagonalForbidden(state, state.placed[0], condition)).toBe(false);
  });
```

- [ ] **Step 2: テストを走らせて失敗を確認する**

Run: `npm test -- __tests__/engine.test.ts`
Expected: FAIL。`conditionCheckers.diagonalForbidden` が存在しない。

- [ ] **Step 3: 実装する**

`src/engine/types.ts` の `SpeciesCondition` に2つ足す。

```ts
  | { kind: 'diagonalForbidden'; with: Species }
  | { kind: 'surroundForbidden'; with: Species }
```

`src/engine/conditions.ts` に、既存の `piecesAdjacent` / `neighborsOf` と同じ形でななめ版を足す。

```ts
const piecesDiagonal = (a: PlacedAnimal, b: PlacedAnimal): boolean =>
  a.cells.some((ca) => b.cells.some((cb) => Math.abs(ca.r - cb.r) === 1 && Math.abs(ca.c - cb.c) === 1));

const diagonalNeighborsOf = (state: GameState, piece: PlacedAnimal): PlacedAnimal[] =>
  state.placed.filter((p) => p.instanceId !== piece.instanceId && piecesDiagonal(p, piece));
```

`conditionCheckers` に2つ足す。

```ts
  diagonalForbidden: (state, animal, c) => {
    if (c.kind !== 'diagonalForbidden') return true;
    return !diagonalNeighborsOf(state, animal).some((n) => n.species === c.with);
  },
  /** 上下左右とななめの計8方向。diagonalForbiddenとadjacentForbiddenの両方を満たすのと同義。 */
  surroundForbidden: (state, animal, c) => {
    if (c.kind !== 'surroundForbidden') return true;
    return (
      !neighborsOf(state, animal).some((n) => n.species === c.with) &&
      !diagonalNeighborsOf(state, animal).some((n) => n.species === c.with)
    );
  },
```

`src/lib/condition-text.ts` に文言を足す。

```ts
    case 'diagonalForbidden':
      return `${speciesLabel[condition.with]}のななめのとなりには置けない`;
    case 'surroundForbidden':
      return `${speciesLabel[condition.with]}のまわり8マスには置けない`;
```

- [ ] **Step 4: テストと型チェックを走らせる**

Run: `npm test && npm run typecheck`
Expected: 両方PASS

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
ななめ隣接禁止・まわり8マス禁止の条件を追加

判定は既存のadjacentForbiddenと同じく、駒の占有マス集合どうしで行う。
2x2などの複数マス駒でも、どれか1マスがななめに触れていれば違反になる。

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: ブロック隣接条件を追加する

「ワニは水ブロックのとなりが必要」「ゴリラは木ブロックのとなりが必要」を表現できるようにする。動物同士ではなく**盤面のブロック**を参照する初めての条件。

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/conditions.ts`
- Modify: `src/engine/validate.ts`
- Modify: `src/lib/condition-text.ts`
- Modify: `src/theme.ts`
- Test: `__tests__/engine.test.ts`

**Interfaces:**
- Consumes: Task 1 の `ConditionBlock`、Task 2 の `conditionCheckers`
- Produces:
  - `{ kind: 'blockAdjacentRequired'; block: ConditionBlock }`
  - `{ kind: 'blockAdjacentForbidden'; block: ConditionBlock }`
  - `blockLabel: Record<ConditionBlock, string>`（`src/theme.ts`）

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/engine.test.ts` の `describe('conditionCheckers', ...)` の末尾に追加する。

```ts
  test('blockAdjacentRequired needs an orthogonally touching block cell', () => {
    const stage = makeStage({
      terrain: [
        ['water', 'land', 'land', 'land', 'land'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('land')),
      ],
      animals: [{ instanceId: 'c1', species: 'crocodile' }],
    });
    const condition = { kind: 'blockAdjacentRequired', block: 'water' } as const;

    let touching = createGameState(stage);
    touching = placeAnimal(touching, 'c1', { r: 0, c: 1 });
    expect(conditionCheckers.blockAdjacentRequired(touching, touching.placed[0], condition)).toBe(true);

    let apart = createGameState(stage);
    apart = placeAnimal(apart, 'c1', { r: 2, c: 2 });
    expect(conditionCheckers.blockAdjacentRequired(apart, apart.placed[0], condition)).toBe(false);
  });

  test('blockAdjacentRequired does not count a diagonal block cell', () => {
    const stage = makeStage({
      terrain: [
        ['water', 'land', 'land', 'land', 'land'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('land')),
      ],
      animals: [{ instanceId: 's1', species: 'squirrel' }],
    });
    let state = createGameState(stage);
    state = placeAnimal(state, 's1', { r: 1, c: 1 });
    const condition = { kind: 'blockAdjacentRequired', block: 'water' } as const;
    expect(conditionCheckers.blockAdjacentRequired(state, state.placed[0], condition)).toBe(false);
  });

  test('blockAdjacentForbidden is the inverse', () => {
    const stage = makeStage({
      terrain: [
        ['tree', 'land', 'land', 'land', 'land'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('land')),
      ],
      animals: [{ instanceId: 's1', species: 'squirrel' }],
    });
    const condition = { kind: 'blockAdjacentForbidden', block: 'tree' } as const;

    let touching = createGameState(stage);
    touching = placeAnimal(touching, 's1', { r: 0, c: 1 });
    expect(conditionCheckers.blockAdjacentForbidden(touching, touching.placed[0], condition)).toBe(false);

    let apart = createGameState(stage);
    apart = placeAnimal(apart, 's1', { r: 3, c: 3 });
    expect(conditionCheckers.blockAdjacentForbidden(apart, apart.placed[0], condition)).toBe(true);
  });
```

`describe('validateStage', ...)` の末尾に追加する。

```ts
  test('flags blockAdjacentRequired when the board has no such block', () => {
    const stage: Stage = {
      id: 'no-water',
      name: 'x',
      rows: 5,
      cols: 5,
      terrain: [
        ['land', 'land', 'wall', 'wall', 'wall'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: [{ instanceId: 'c0', species: 'crocodile' }],
    };
    expect(validateStage(stage).some((e) => e.includes('blockAdjacentRequired(water) but no water block'))).toBe(true);
  });
```

このテストは Task 6 でワニの性格を `blockAdjacentRequired` にするまで通らない。**Task 4 の時点ではワニの性格をここで変更する**（Task 6 に先送りしない）。ワニは出荷ステージに一度も登場しないので、既存18ステージには影響しない。

- [ ] **Step 2: テストを走らせて失敗を確認する**

Run: `npm test -- __tests__/engine.test.ts`
Expected: FAIL。`conditionCheckers.blockAdjacentRequired` が存在しない。

- [ ] **Step 3: 実装する**

`src/engine/types.ts` の `SpeciesCondition` に2つ足す。

```ts
  | { kind: 'blockAdjacentRequired'; block: ConditionBlock }
  | { kind: 'blockAdjacentForbidden'; block: ConditionBlock }
```

`src/engine/conditions.ts` の先頭に `import { terrainAt } from './board';` を足す（`board.ts` は `conditions.ts` を import していないので循環にはならない）。ヘルパーとチェッカーを足す。

```ts
const ORTHOGONAL = [
  { r: -1, c: 0 },
  { r: 1, c: 0 },
  { r: 0, c: -1 },
  { r: 0, c: 1 },
] as const;

/** 駒の占有マスのいずれかが、指定ブロックのマスと上下左右で接しているか。 */
const touchesBlock = (state: GameState, piece: PlacedAnimal, block: ConditionBlock): boolean =>
  piece.cells.some((cell) =>
    ORTHOGONAL.some((d) => terrainAt(state.stage, { r: cell.r + d.r, c: cell.c + d.c }) === block)
  );
```

```ts
  blockAdjacentRequired: (state, animal, c) => {
    if (c.kind !== 'blockAdjacentRequired') return true;
    return touchesBlock(state, animal, c.block);
  },
  blockAdjacentForbidden: (state, animal, c) => {
    if (c.kind !== 'blockAdjacentForbidden') return true;
    return !touchesBlock(state, animal, c.block);
  },
```

`src/engine/species.ts` のワニを、水ブロックのとなりが必要な陸の動物にする。

```ts
  crocodile: {
    species: 'crocodile',
    shape: 'domino_h',
    conditions: [{ kind: 'blockAdjacentRequired', block: 'water' }],
  },
```

キリンの `{ kind: 'adjacentForbidden', with: 'crocodile' }` は削除する（ワニが水場に固定されなくなり、この制約の元々の意味「ワニのいる水場にキリンは近づけない」が成り立たなくなるため）。

`src/engine/validate.ts` の種ごとの条件チェックに、ブロックの存在確認を足す。ループの前にブロックの集合を作る。

```ts
  const blocksOnBoard = new Set(stage.terrain.flat());
```

条件ループの中に足す。

```ts
      if (c.kind === 'blockAdjacentRequired' && !blocksOnBoard.has(c.block)) {
        errors.push(`${label} ${species} has blockAdjacentRequired(${c.block}) but no ${c.block} block on the board`);
      }
```

`src/theme.ts` にブロックの日本語名を足す。

```ts
export const blockLabel: Record<ConditionBlock, string> = {
  water: '水べ',
  tree: '木',
};
```

`src/theme.ts` の import に `type ConditionBlock` を足す。

`src/lib/condition-text.ts` に文言を足す（`blockLabel` を import する）。

```ts
    case 'blockAdjacentRequired':
      return `${blockLabel[condition.block]}のとなりが必要`;
    case 'blockAdjacentForbidden':
      return `${blockLabel[condition.block]}のとなりには置けない`;
```

- [ ] **Step 4: テストと型チェックを走らせる**

Run: `npm test && npm run typecheck`
Expected: 両方PASS。`shipped stage content` も引き続きgreen（ワニ・キリンの変更は出荷18ステージの解に影響しない — ワニは未登場、キリンのワニ条件は相手がいないので常に真だった）。

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
ブロック隣接条件を追加し、ワニを水ブロックのとなりの動物にする

動物同士ではなく盤面のブロックを参照する初めての条件。ワニは水地形に乗る
動物ではなく、水ブロックのとなりにいたい陸の動物になった。これに伴い
キリンのワニ隣接禁止は削除した（ワニが水場に固定されなくなり、元々の
「ワニのいる水場に近づけない」という意味が成り立たなくなるため）。

validateStageに、blockAdjacentRequiredを持つ種がいるのに盤面にその
ブロックが無いステージを弾く検証を追加した。

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: ステージ限定ルールを追加する

上下左右・同じ行/列・ちょうど○マスはなす、をステージデータ側に書けるようにする。これらは動物の性格ではなく出題側の仕掛けなので、`SPECIES` ではなく `Stage.rules` に持たせ、個体単位ではなく**種ペア単位**で評価する。

**Files:**
- Modify: `src/engine/types.ts`
- Create: `src/engine/stage-rules.ts`
- Modify: `src/engine/conditions.ts:38-40`
- Modify: `src/engine/solver.ts`
- Modify: `src/engine/index.ts`
- Test: `__tests__/engine.test.ts`

**Interfaces:**
- Consumes: Task 1〜4 の型
- Produces:
  - `type StageRule`（`above` / `leftOf` / `sameRow` / `sameCol` / `differentRow` / `differentCol` / `exactDistance`）
  - `Stage.rules?: StageRule[]`
  - `isStageRuleSatisfied(state: GameState, rule: StageRule): boolean`
  - `unsatisfiedStageRules(state: GameState): StageRule[]`

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/engine.test.ts` の末尾（`describe('shipped stage content', ...)` の直前）に追加する。ファイル冒頭の import に `isStageRuleSatisfied`, `unsatisfiedStageRules` を足す。

```ts
describe('stage rules', () => {
  const twoPieceStage = (rules: Stage['rules']): Stage =>
    makeStage({
      animals: [
        { instanceId: 's1', species: 'squirrel' },
        { instanceId: 'z1', species: 'zebra' },
      ],
      rules,
    });

  test('above requires every A cell to sit strictly above every B cell', () => {
    const stage = twoPieceStage([{ kind: 'above', a: 'squirrel', b: 'zebra' }]);
    let above = createGameState(stage);
    above = placeAnimal(above, 's1', { r: 0, c: 0 });
    above = placeAnimal(above, 'z1', { r: 1, c: 0 });
    expect(isStageRuleSatisfied(above, stage.rules![0])).toBe(true);

    let sameRow = createGameState(stage);
    sameRow = placeAnimal(sameRow, 's1', { r: 1, c: 0 });
    sameRow = placeAnimal(sameRow, 'z1', { r: 1, c: 1 });
    expect(isStageRuleSatisfied(sameRow, stage.rules![0])).toBe(false);
  });

  test('leftOf works on columns the same way', () => {
    const stage = twoPieceStage([{ kind: 'leftOf', a: 'squirrel', b: 'zebra' }]);
    let left = createGameState(stage);
    left = placeAnimal(left, 's1', { r: 0, c: 0 });
    left = placeAnimal(left, 'z1', { r: 0, c: 1 });
    expect(isStageRuleSatisfied(left, stage.rules![0])).toBe(true);

    let right = createGameState(stage);
    right = placeAnimal(right, 's1', { r: 0, c: 4 });
    right = placeAnimal(right, 'z1', { r: 0, c: 0 });
    expect(isStageRuleSatisfied(right, stage.rules![0])).toBe(false);
  });

  test('sameRow is satisfied when the occupied row sets overlap', () => {
    const stage = twoPieceStage([{ kind: 'sameRow', a: 'squirrel', b: 'zebra' }]);
    let same = createGameState(stage);
    same = placeAnimal(same, 's1', { r: 2, c: 0 });
    same = placeAnimal(same, 'z1', { r: 2, c: 2 });
    expect(isStageRuleSatisfied(same, stage.rules![0])).toBe(true);

    let different = createGameState(stage);
    different = placeAnimal(different, 's1', { r: 0, c: 0 });
    different = placeAnimal(different, 'z1', { r: 2, c: 2 });
    expect(isStageRuleSatisfied(different, stage.rules![0])).toBe(false);
  });

  test('differentCol is the inverse of sameCol', () => {
    const stage = twoPieceStage([{ kind: 'differentCol', a: 'squirrel', b: 'zebra' }]);
    // シマウマは横2マス。(2,1)に置くと列1と2を占める。
    let overlapping = createGameState(stage);
    overlapping = placeAnimal(overlapping, 's1', { r: 0, c: 1 });
    overlapping = placeAnimal(overlapping, 'z1', { r: 2, c: 1 });
    expect(isStageRuleSatisfied(overlapping, stage.rules![0])).toBe(false);

    let apart = createGameState(stage);
    apart = placeAnimal(apart, 's1', { r: 0, c: 0 });
    apart = placeAnimal(apart, 'z1', { r: 2, c: 1 });
    expect(isStageRuleSatisfied(apart, stage.rules![0])).toBe(true);
  });

  test('exactDistance requires the minimum distance to match exactly', () => {
    const stage = twoPieceStage([{ kind: 'exactDistance', a: 'squirrel', b: 'zebra', distance: 2 }]);
    let exact = createGameState(stage);
    exact = placeAnimal(exact, 's1', { r: 0, c: 0 });
    exact = placeAnimal(exact, 'z1', { r: 0, c: 2 });
    expect(isStageRuleSatisfied(exact, stage.rules![0])).toBe(true);

    let tooFar = createGameState(stage);
    tooFar = placeAnimal(tooFar, 's1', { r: 0, c: 0 });
    tooFar = placeAnimal(tooFar, 'z1', { r: 0, c: 3 });
    expect(isStageRuleSatisfied(tooFar, stage.rules![0])).toBe(false);
  });

  test('a rule is treated as satisfied while one side is still in the tray', () => {
    const stage = twoPieceStage([{ kind: 'above', a: 'squirrel', b: 'zebra' }]);
    let state = createGameState(stage);
    state = placeAnimal(state, 'z1', { r: 0, c: 0 });
    expect(unsatisfiedStageRules(state)).toEqual([]);
  });

  test('isStageCleared requires stage rules on top of species conditions', () => {
    const stage: Stage = {
      ...makeStage({
        terrain: [
          ['land', 'wall', 'wall', 'wall', 'wall'],
          ['land', 'wall', 'wall', 'wall', 'wall'],
          ...Array.from({ length: 3 }, () => Array<CellTerrain>(5).fill('wall')),
        ],
        animals: [
          { instanceId: 's1', species: 'squirrel' },
          { instanceId: 's2', species: 'squirrel' },
        ],
      }),
      rules: [{ kind: 'differentCol', a: 'squirrel', b: 'squirrel' }],
    };
    let state = createGameState(stage);
    state = placeAnimal(state, 's1', { r: 0, c: 0 });
    state = placeAnimal(state, 's2', { r: 1, c: 0 });
    expect(state.tray).toHaveLength(0);
    expect(isStageCleared(state)).toBe(false);
  });

  test('countSolutions respects stage rules', () => {
    const base = makeStage({
      terrain: [
        ['land', 'wall', 'land', 'wall', 'wall'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: [
        { instanceId: 's1', species: 'squirrel' },
        { instanceId: 'm1', species: 'squirrel' },
      ],
    });
    expect(countSolutions(base, 5)).toBe(1);

    const blocked: Stage = { ...base, rules: [{ kind: 'sameCol', a: 'squirrel', b: 'squirrel' }] };
    expect(countSolutions(blocked, 5)).toBe(0);
  });
});
```

- [ ] **Step 2: テストを走らせて失敗を確認する**

Run: `npm test -- __tests__/engine.test.ts`
Expected: FAIL。`isStageRuleSatisfied` が存在しない。

- [ ] **Step 3: 型を足す**

`src/engine/types.ts` に追加する。

```ts
/**
 * そのステージだけに効く出題側のルール。動物の性格(SpeciesCondition)と違い、
 * 種のペアに対して指定し、種Aの全個体と種Bの全個体の全ペアで成立を要求する。
 * 「下」「右」は above / leftOf の引数を入れ替えたものと同値なので用意しない。
 */
export type StageRule =
  | { kind: 'above'; a: Species; b: Species }
  | { kind: 'leftOf'; a: Species; b: Species }
  | { kind: 'sameRow'; a: Species; b: Species }
  | { kind: 'sameCol'; a: Species; b: Species }
  | { kind: 'differentRow'; a: Species; b: Species }
  | { kind: 'differentCol'; a: Species; b: Species }
  | { kind: 'exactDistance'; a: Species; b: Species; distance: number };
```

`Stage` に `rules?: StageRule[];` を足す。

- [ ] **Step 4: `src/engine/stage-rules.ts` を作る**

```ts
import type { GameState, PlacedAnimal, Species, StageRule } from './types';
import { manhattan } from './types';

const piecesOf = (state: GameState, species: Species): PlacedAnimal[] =>
  state.placed.filter((p) => p.species === species);

const rowsOf = (p: PlacedAnimal): number[] => p.cells.map((c) => c.r);
const colsOf = (p: PlacedAnimal): number[] => p.cells.map((c) => c.c);

const minDistance = (a: PlacedAnimal, b: PlacedAnimal): number =>
  Math.min(...a.cells.flatMap((ca) => b.cells.map((cb) => manhattan(ca, cb))));

const overlaps = (xs: number[], ys: number[]): boolean => xs.some((x) => ys.includes(x));

type PairPredicate = (a: PlacedAnimal, b: PlacedAnimal, rule: StageRule) => boolean;

/** 「AはBより上」は、Aの一番下の行がBの一番上の行より上＝完全に上にあること。左右も同様。 */
const pairPredicates: Record<StageRule['kind'], PairPredicate> = {
  above: (a, b) => Math.max(...rowsOf(a)) < Math.min(...rowsOf(b)),
  leftOf: (a, b) => Math.max(...colsOf(a)) < Math.min(...colsOf(b)),
  sameRow: (a, b) => overlaps(rowsOf(a), rowsOf(b)),
  sameCol: (a, b) => overlaps(colsOf(a), colsOf(b)),
  differentRow: (a, b) => !overlaps(rowsOf(a), rowsOf(b)),
  differentCol: (a, b) => !overlaps(colsOf(a), colsOf(b)),
  exactDistance: (a, b, rule) => (rule.kind === 'exactDistance' ? minDistance(a, b) === rule.distance : true),
};

/**
 * 種Aの全個体×種Bの全個体で成立するか。片方がまだトレイにある間は組が作れず
 * 常にtrueになる＝「まだ違反していない」扱いになる。
 */
export const isStageRuleSatisfied = (state: GameState, rule: StageRule): boolean => {
  const as = piecesOf(state, rule.a);
  const bs = piecesOf(state, rule.b);
  return as.every((a) => bs.every((b) => a.instanceId === b.instanceId || pairPredicates[rule.kind](a, b, rule)));
};

export const unsatisfiedStageRules = (state: GameState): StageRule[] =>
  (state.stage.rules ?? []).filter((r) => !isStageRuleSatisfied(state, r));
```

`a.instanceId === b.instanceId` を飛ばしているのは、`{ a: 'squirrel', b: 'squirrel' }` のように同種を指定したとき、自分自身との組で必ず落ちるのを防ぐため。

`src/engine/index.ts` に `export * from './stage-rules';` を足す（`./conditions` の次の行に置く）。

- [ ] **Step 5: クリア判定と解の数え上げに組み込む**

`src/engine/conditions.ts` の `isStageCleared` を書き換える。`import { unsatisfiedStageRules } from './stage-rules';` を足す。

```ts
export const isStageCleared = (state: GameState): boolean =>
  state.tray.length === 0 && violatingAnimals(state).length === 0 && unsatisfiedStageRules(state).length === 0;
```

`src/engine/solver.ts` の `countSolutions` で、全配置し終えたときの判定を `violatingAnimals(state).length === 0` から `isStageCleared(state)` に差し替える。import も `violatingAnimals` から `isStageCleared` に変える。

```ts
    if (index === instances.length) {
      if (isStageCleared(state)) {
```

`countGeometricPlacements` は条件を無視する定義なので変更しない。

- [ ] **Step 6: テストと型チェックを走らせる**

Run: `npm test && npm run typecheck`
Expected: 両方PASS。出荷18ステージは `rules` を持たないので `unsatisfiedStageRules` は常に空配列を返し、解の数は変わらない。

- [ ] **Step 7: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
ステージ限定ルール（上下左右・同じ行列・特定距離）を追加

上下左右や行・列の関係は動物の性格ではなくそのステージの出題なので、
SPECIESではなくStage.rulesに持たせ、種ペア単位で評価する新しい系統として
stage-rules.tsに分離した。片方がまだトレイにある間は「まだ違反していない」
扱いにして、配置途中で誤ってクリア不能に見えないようにしている。

isStageClearedとcountSolutionsがこのルールも見るようにした。

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 新種4種を追加する

サル・ヒョウ・サイ・ゴリラを追加し、`animals-future/` の画像を実際に使う。**既存5種（リス・シマウマ・ライオン・キリン・ゾウ）の性格は変更しない** — 変更すると出荷18ステージの唯一解が壊れるため、分割3で全ステージ差し替えと同時に行う。

**Files:**
- Modify: `src/engine/types.ts:1-8`
- Modify: `src/engine/species.ts`
- Modify: `src/theme.ts`
- Modify: `src/lib/animal-art.ts`
- Move: `assets/images/animals-future/{crocodile,gorilla,leopard,monkey,rhino}.png` → `assets/images/animals/`
- Test: `__tests__/engine.test.ts`

**Interfaces:**
- Consumes: Task 3 の `diagonalForbidden`、Task 4 の `blockAdjacentRequired`
- Produces: `Species` に `'monkey' | 'leopard' | 'rhino' | 'gorilla'` が加わる

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/engine.test.ts` の `describe('shapes', ...)` の `boundingBox` テストに追記する。

```ts
  test('boundingBox reflects each species shape', () => {
    expect(boundingBox('squirrel')).toEqual({ w: 1, h: 1 });
    expect(boundingBox('zebra')).toEqual({ w: 2, h: 1 });
    expect(boundingBox('lion')).toEqual({ w: 1, h: 2 });
    expect(boundingBox('elephant')).toEqual({ w: 2, h: 2 });
    expect(boundingBox('monkey')).toEqual({ w: 1, h: 1 });
    expect(boundingBox('leopard')).toEqual({ w: 1, h: 2 });
    expect(boundingBox('rhino')).toEqual({ w: 2, h: 2 });
    expect(boundingBox('gorilla')).toEqual({ w: 2, h: 2 });
  });
```

ファイル末尾に、図鑑そのものの不変条件を確かめる describe を足す（`SPECIES` と `speciesLabel`, `speciesEmoji` を import する）。

```ts
describe('species roster', () => {
  const allSpecies = Object.keys(SPECIES) as Species[];

  test('every species has a label and an emoji', () => {
    for (const sp of allSpecies) {
      expect(speciesLabel[sp]).toBeTruthy();
      expect(speciesEmoji[sp]).toBeTruthy();
    }
  });

  test('every condition refers to a species that exists', () => {
    for (const sp of allSpecies) {
      for (const c of SPECIES[sp].conditions) {
        if ('with' in c) expect(SPECIES[c.with]).toBeDefined();
        if ('from' in c) expect(SPECIES[c.from]).toBeDefined();
      }
    }
  });

  test('at least three species share each of the 1x1, vertical-domino and 2x2 shapes', () => {
    const byShape = new Map<string, Species[]>();
    for (const sp of allSpecies) {
      const shape = SPECIES[sp].shape;
      byShape.set(shape, [...(byShape.get(shape) ?? []), sp]);
    }
    expect(byShape.get('single')!.length).toBeGreaterThanOrEqual(3);
    expect(byShape.get('domino_v')!.length).toBeGreaterThanOrEqual(3);
    expect(byShape.get('square2x2')!.length).toBeGreaterThanOrEqual(3);
  });
});
```

最後の1本は「形では見分けがつかない駒を揃える」という設計の要（仕様書 §7）を守るためのテスト。

- [ ] **Step 2: テストを走らせて失敗を確認する**

Run: `npm test -- __tests__/engine.test.ts`
Expected: FAIL。`'monkey'` が `Species` に無い型エラー。

- [ ] **Step 3: 画像を移動する**

```bash
git mv assets/images/animals-future/crocodile.png assets/images/animals/crocodile.png
git mv assets/images/animals-future/gorilla.png assets/images/animals/gorilla.png
git mv assets/images/animals-future/leopard.png assets/images/animals/leopard.png
git mv assets/images/animals-future/monkey.png assets/images/animals/monkey.png
git mv assets/images/animals-future/rhino.png assets/images/animals/rhino.png
```

- [ ] **Step 4: 種を追加する**

`src/engine/types.ts` の `Species` に4種を足す。

```ts
export type Species =
  | 'lion'
  | 'zebra'
  | 'giraffe'
  | 'elephant'
  | 'crocodile'
  | 'oxpecker'
  | 'squirrel'
  | 'monkey'
  | 'leopard'
  | 'rhino'
  | 'gorilla';
```

`src/engine/species.ts` の `SPECIES` に4種を足す。

```ts
  monkey: {
    species: 'monkey',
    shape: 'single',
    conditions: [
      { kind: 'flockRequired' },
      { kind: 'adjacentForbidden', with: 'leopard' },
    ],
  },
  leopard: {
    species: 'leopard',
    shape: 'domino_v',
    conditions: [
      { kind: 'adjacentForbidden', with: 'leopard' },
      { kind: 'adjacentForbidden', with: 'squirrel' },
    ],
  },
  rhino: {
    species: 'rhino',
    shape: 'square2x2',
    conditions: [{ kind: 'minDistance', from: 'rhino', distance: 3 }],
  },
  gorilla: {
    species: 'gorilla',
    shape: 'square2x2',
    conditions: [{ kind: 'blockAdjacentRequired', block: 'tree' }],
  },
```

ヒョウの「同種のとなりに置けない」は `adjacentForbidden` の `with` に自分自身を指定して表現している（`neighborsOf` が自分の個体を除外するので、既存の判定がそのまま使える）。サルとヒョウの相互禁止はサル側にだけ書いてある（種同士の制約は片側だけ、という既存の方針）。

`src/theme.ts` の `speciesEmoji` と `speciesLabel` に4種を足す。

```ts
  monkey: '🐒',
  leopard: '🐆',
  rhino: '🦏',
  gorilla: '🦍',
```

```ts
  monkey: 'サル',
  leopard: 'ヒョウ',
  rhino: 'サイ',
  gorilla: 'ゴリラ',
```

`src/lib/animal-art.ts` に5種（新4種＋ワニ）を登録する。コメントも実態に合わせる。

```ts
/**
 * 実写風イラストを持つ動物のみここに登録する。未登録の種（ウシツツキ）は
 * theme.tsのspeciesEmojiにフォールバックする。
 */
export const speciesArt: Partial<Record<Species, ImageSourcePropType>> = {
  squirrel: require('@/assets/images/animals/squirrel.png'),
  zebra: require('@/assets/images/animals/zebra.png'),
  lion: require('@/assets/images/animals/lion.png'),
  elephant: require('@/assets/images/animals/elephant.png'),
  giraffe: require('@/assets/images/animals/giraffe.png'),
  crocodile: require('@/assets/images/animals/crocodile.png'),
  monkey: require('@/assets/images/animals/monkey.png'),
  leopard: require('@/assets/images/animals/leopard.png'),
  rhino: require('@/assets/images/animals/rhino.png'),
  gorilla: require('@/assets/images/animals/gorilla.png'),
};
```

- [ ] **Step 5: テストと型チェックを走らせる**

Run: `npm test && npm run typecheck`
Expected: 両方PASS。既存5種の性格を変えていないので `shipped stage content` は影響を受けない。

- [ ] **Step 6: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
サル・ヒョウ・サイ・ゴリラを追加し、用意済みの画像を投入する

形では見分けがつかずルールでしか置き場所が決まらない駒を並べるため、
1x1・縦2・2x2にそれぞれ3種がそろうようにした。1x1はリス/サル/ウシツツキ、
縦2はライオン/キリン/ヒョウ、2x2はゾウ/サイ/ゴリラ。

サルは群れ、ヒョウは縄張り（同種隣接禁止）とリス捕食、サイは同種と3マス以上、
ゴリラは木ブロックのとなりが必要。既存5種の性格は変えていない（変えると
出荷18ステージの唯一解が壊れるため、ステージ差し替えと同時に行う）。

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 条件パネルに達成状況を表示する

各条件が今その瞬間に満たされているかを ✓ / ❌ で出す。ステージ限定ルールも一覧に並べる。

**Files:**
- Modify: `src/engine/conditions.ts`
- Modify: `src/lib/condition-text.ts`
- Modify: `src/components/conditions-panel.tsx`
- Modify: `src/components/stage-game-view.tsx:260`
- Test: `__tests__/engine.test.ts`

**Interfaces:**
- Consumes: Task 5 の `isStageRuleSatisfied`
- Produces:
  - `isSpeciesConditionSatisfied(state: GameState, species: Species, condition: SpeciesCondition): boolean`
  - `stageRuleText(rule: StageRule): string`
  - `ConditionsPanel` の props が `{ species: Species[]; state: GameState }` になる

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/engine.test.ts` の `describe('conditionCheckers', ...)` の末尾に追加する（import に `isSpeciesConditionSatisfied` を足す）。

```ts
  test('isSpeciesConditionSatisfied is false when any placed piece of that species violates it', () => {
    const stage = makeStage({
      animals: [
        { instanceId: 'z1', species: 'zebra' },
        { instanceId: 'z2', species: 'zebra' },
        { instanceId: 'l1', species: 'lion' },
      ],
    });
    const condition = { kind: 'adjacentForbidden', with: 'lion' } as const;

    // シマウマは横2マス、ライオンは縦2マス。z1は(0,0)-(0,1)、z2は(4,0)-(4,1)を占める。
    let state = createGameState(stage);
    state = placeAnimal(state, 'z1', { r: 0, c: 0 });
    state = placeAnimal(state, 'z2', { r: 4, c: 0 });
    state = placeAnimal(state, 'l1', { r: 2, c: 4 });
    expect(isSpeciesConditionSatisfied(state, 'zebra', condition)).toBe(true);

    // (1,0)-(2,0)へ動かすと、z1の(0,0)と上下で接する。
    state = moveAnimal(state, 'l1', { r: 1, c: 0 });
    expect(isSpeciesConditionSatisfied(state, 'zebra', condition)).toBe(false);
  });

  test('isSpeciesConditionSatisfied is true when no piece of that species is placed yet', () => {
    const stage = makeStage({ animals: [{ instanceId: 'z1', species: 'zebra' }] });
    const state = createGameState(stage);
    expect(isSpeciesConditionSatisfied(state, 'zebra', { kind: 'adjacentForbidden', with: 'lion' })).toBe(true);
  });
```

- [ ] **Step 2: テストを走らせて失敗を確認する**

Run: `npm test -- __tests__/engine.test.ts`
Expected: FAIL。`isSpeciesConditionSatisfied` が存在しない。

- [ ] **Step 3: 判定関数を足す**

`src/engine/conditions.ts` に追加する。

```ts
/** 盤上にあるその種の駒がすべてこの条件を満たしているか。1体も置いていなければtrue。 */
export const isSpeciesConditionSatisfied = (
  state: GameState,
  species: Species,
  condition: SpeciesCondition
): boolean =>
  state.placed
    .filter((p) => p.species === species)
    .every((p) => conditionCheckers[condition.kind](state, p, condition));
```

`import type { Species } from './types';` を足す。

- [ ] **Step 4: ステージ限定ルールの文言を足す**

`src/lib/condition-text.ts` に追加する。

```ts
/** ステージ限定ルールを短い日本語の説明文にする。 */
export const stageRuleText = (rule: StageRule): string => {
  const a = speciesLabel[rule.a];
  const b = speciesLabel[rule.b];
  switch (rule.kind) {
    case 'above':
      return `${a}は${b}より上にいる`;
    case 'leftOf':
      return `${a}は${b}より左にいる`;
    case 'sameRow':
      return `${a}と${b}は同じ行にいる`;
    case 'sameCol':
      return `${a}と${b}は同じ列にいる`;
    case 'differentRow':
      return `${a}と${b}は同じ行に置けない`;
    case 'differentCol':
      return `${a}と${b}は同じ列に置けない`;
    case 'exactDistance':
      return `${a}と${b}はちょうど${rule.distance}マスはなす`;
  }
};
```

`import type { SpeciesCondition, StageRule } from '@/engine';` に直す。

- [ ] **Step 5: 条件パネルを書き換える**

`src/components/conditions-panel.tsx` を、状態を受け取って ✓ / ❌ を出す形にする。

```tsx
import { Image, StyleSheet, Text, View } from 'react-native';

import { SPECIES, isSpeciesConditionSatisfied, isStageRuleSatisfied, type GameState, type Species } from '@/engine';
import { speciesArt } from '@/lib/animal-art';
import { conditionText, stageRuleText } from '@/lib/condition-text';
import { colors, speciesEmoji, speciesLabel, ui } from '@/theme';

type Props = {
  species: Species[];
  state: GameState;
};

const StatusMark = ({ ok }: { ok: boolean }) => (
  <Text style={[styles.mark, ok ? styles.markOk : styles.markNg]}>{ok ? '✓' : '✗'}</Text>
);

/**
 * このステージに登場する動物の性格と、ステージ限定ルールを一覧表示する。
 * 各行の左端に、今その条件が満たされているかを出す。開閉は呼び出し側が管理する。
 */
export function ConditionsPanel({ species, state }: Props) {
  const rules = state.stage.rules ?? [];
  return (
    <View style={styles.panel}>
      {species.map((sp) => {
        const conditions = SPECIES[sp].conditions;
        const art = speciesArt[sp];
        return (
          <View key={sp} style={styles.row}>
            {art ? (
              <Image source={art} resizeMode="cover" style={styles.art} />
            ) : (
              <Text style={styles.emoji}>{speciesEmoji[sp]}</Text>
            )}
            <View style={styles.textCol}>
              <Text style={styles.name}>{speciesLabel[sp]}</Text>
              {conditions.length === 0 ? (
                <Text style={styles.condition}>とくに条件なし</Text>
              ) : (
                conditions.map((c, i) => (
                  <View key={i} style={styles.conditionRow}>
                    <StatusMark ok={isSpeciesConditionSatisfied(state, sp, c)} />
                    <Text style={styles.condition}>{conditionText(c)}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        );
      })}
      {rules.length > 0 && (
        <View style={styles.row}>
          <Text style={styles.emoji}>📋</Text>
          <View style={styles.textCol}>
            <Text style={styles.name}>このステージのやくそく</Text>
            {rules.map((r, i) => (
              <View key={i} style={styles.conditionRow}>
                <StatusMark ok={isStageRuleSatisfied(state, r)} />
                <Text style={styles.condition}>{stageRuleText(r)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
```

`StyleSheet.create` に2つ足す（既存の `condition` などはそのまま残す）。

```ts
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mark: {
    fontSize: 14,
    fontWeight: '800',
    width: 16,
  },
  markOk: {
    color: colors.success,
  },
  markNg: {
    color: colors.danger,
  },
```

- [ ] **Step 6: 呼び出し側を直す**

`src/components/stage-game-view.tsx` の260行目付近を差し替える。

```tsx
              <ConditionsPanel species={uniqueSpecies} state={state} />
```

- [ ] **Step 7: テストと型チェックを走らせる**

Run: `npm test && npm run typecheck`
Expected: 両方PASS

- [ ] **Step 8: 実際の画面で確認する**

`.claude/launch.json` の設定でプレビューを起動し（無ければ `{"name":"web","runtimeExecutable":"npx","runtimeArgs":["expo","start","--web"],"port":8081}` を追加する）、`/game/stage-3` を開く。条件パネルを開き、シマウマをライオンの隣に置いたときにその行が ✗ になり、離すと ✓ に戻ることを目視する。スクリーンショットを撮る。

- [ ] **Step 9: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
条件パネルに達成状況の✓/✗をリアルタイム表示する

どの条件を今満たせていないのかが分かるようにした。ステージ限定ルールも
「このステージのやくそく」として同じパネルに並べる。ある種の駒を1体も
置いていない間は違反しようがないので✓のままにしている。

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: 水ブロック・木ブロックを描画し、エディタと投稿に対応する

**Files:**
- Modify: `src/components/board-cell.tsx`
- Modify: `src/app/editor.tsx:26-32`
- Modify: `src/lib/stage-submission.ts`
- Test: `__tests__/engine.test.ts`

**Interfaces:**
- Consumes: Task 1 の `BlockKind`、Task 5 の `StageRule`
- Produces: なし（UIとツールのみ）

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/engine.test.ts` の末尾に、投稿スニペットの回帰テストを足す（`buildStageCodeSnippet` を `@/lib/stage-submission` から import する）。

```ts
describe('stage submission snippet', () => {
  test('encodes every block kind and includes stage rules', () => {
    const stage: Stage = {
      id: 'draft',
      name: 'てすと',
      rows: 5,
      cols: 5,
      terrain: [
        ['land', 'water', 'tree', 'wall', 'void'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: [{ instanceId: 's0', species: 'squirrel' }],
      rules: [{ kind: 'above', a: 'squirrel', b: 'zebra' }],
    };
    const snippet = buildStageCodeSnippet(stage);
    expect(snippet).toContain(`'.~T#x'`);
    expect(snippet).toContain(`{ kind: 'above', a: 'squirrel', b: 'zebra' }`);
  });

  test('omits the rules block when a stage has none', () => {
    const stage: Stage = {
      id: 'draft',
      name: 'てすと',
      rows: 5,
      cols: 5,
      terrain: Array.from({ length: 5 }, () => Array<CellTerrain>(5).fill('wall')),
      animals: [{ instanceId: 's0', species: 'squirrel' }],
    };
    expect(buildStageCodeSnippet(stage)).not.toContain('rules:');
  });
});
```

- [ ] **Step 2: テストを走らせて失敗を確認する**

Run: `npm test -- __tests__/engine.test.ts`
Expected: FAIL。スニペットに `rules` が入っていない。

- [ ] **Step 3: 投稿スニペットにルールを含める**

`src/lib/stage-submission.ts` の `buildStageCodeSnippet` を書き換える。

```ts
const ruleSnippet = (rule: StageRule): string => {
  const parts = Object.entries(rule).map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`);
  return `    { ${parts.join(', ')} },`;
};

const rulesSnippet = (stage: Stage): string[] =>
  stage.rules && stage.rules.length > 0 ? ['  rules: [', ...stage.rules.map(ruleSnippet), '  ],'] : [];

/** stages.ts にそのまま貼り付けられる形式のコード片。投稿Issueの本文に埋め込む。 */
export const buildStageCodeSnippet = (stage: Stage): string =>
  [
    '{',
    `  id: 'stage-xx',`,
    `  name: '${stage.name}',`,
    `  rows: ${stage.rows},`,
    `  cols: ${stage.cols},`,
    '  terrain: terrain([',
    terrainSnippet(stage),
    '  ]),',
    '  animals: animals([',
    animalsSnippet(stage),
    '  ]),',
    ...rulesSnippet(stage),
    '},',
  ].join('\n');
```

import を `import type { CellTerrain, Species, Stage, StageRule } from '@/engine';` にする。

- [ ] **Step 4: ブロックの見た目を作る**

`src/components/board-cell.tsx` を書き換える。水は角丸のタイル、木は円形にして、草むらの茂み画像と一目で区別できるようにする。

```tsx
import { Image, StyleSheet, View } from 'react-native';

import type { BlockKind } from '@/engine';
import { terrainColors, ui } from '@/theme';

const bushArt = require('@/assets/images/terrain/bush.png');

type Props = {
  terrain: BlockKind;
  /** 1マスの辺長(px)。茂み画像をパーセント指定にするとreact-native-webで高さ0になることがあるため、実寸で渡す。 */
  size: number;
};

/**
 * 盤面1マス分のブロック。land と void は呼び出し側（board.tsx）で描画しない。
 * wallは切り抜き済みの茂み画像をそのまま置く（枠・背景なし）。水と木は専用の
 * イラストがまだ無いため、形と色で区別できる単色タイルで描いている。
 */
export function BoardCell({ terrain, size }: Props) {
  if (terrain === 'wall') {
    return <Image source={bushArt} resizeMode="contain" style={{ width: size, height: size }} />;
  }
  const palette = terrainColors[terrain];
  return (
    <View style={styles.cell}>
      <View
        style={[
          terrain === 'tree' ? styles.tree : styles.water,
          { backgroundColor: palette.fill, borderColor: palette.dark },
          terrain === 'tree' && { width: size * 0.78, height: size * 0.78, borderRadius: size * 0.39 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  water: {
    width: '100%',
    height: '100%',
    borderRadius: ui.radius / 2,
    borderWidth: 2,
  },
  tree: {
    borderWidth: 3,
  },
});
```

- [ ] **Step 5: エディタでブロックを塗れるようにする**

`src/app/editor.tsx` の `PAINT_OPTIONS` を差し替える。

```ts
const PAINT_OPTIONS: { terrain: CellTerrain; label: string }[] = [
  { terrain: 'land', label: '平地' },
  { terrain: 'wall', label: '壁' },
  { terrain: 'water', label: '水' },
  { terrain: 'tree', label: '木' },
];
```

エディタのマス描画（165行目付近）は `t === 'void'` を分岐したうえで `terrainColors[t].fill` を引いている。`water` / `tree` は Task 1 で `terrainColors` に追加済みなので、この描画コードは変更不要。

- [ ] **Step 6: テストと型チェックを走らせる**

Run: `npm test && npm run typecheck`
Expected: 両方PASS

- [ ] **Step 7: 実際の画面で確認する**

プレビューで `/editor` を開き、水と木を塗って、盤面上で草むら・水・木が見分けられることを目視する。スクリーンショットを撮る。

- [ ] **Step 8: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
水ブロック・木ブロックを描画し、エディタと投稿スニペットを対応させる

水は角丸タイル、木は円形にして、茂み画像の草むらと一目で区別できるように
した。専用イラストができたら差し替える。エディタで水と木を塗れるようにし、
投稿用コード片にステージ限定ルールを含めるようにした。

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: デプロイ

**Files:** なし（ビルドと公開のみ）

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

`.nojekyll` は必須。無いと GitHub Pages の Jekyll が `_expo/` 以下を丸ごと除外し、JSバンドルが404になってサイトが死ぬ（CDNのキャッシュ不具合に見えるが違う）。

- [ ] **Step 5: gh-pages ブランチへ push する**

`AGENTS.md` の手順どおり、使い捨ての `git worktree` を使って `dist/` の中身（`.nojekyll` を含む）を `gh-pages` に push する。`master` の作業ツリーには触らない。

- [ ] **Step 6: デプロイが反映されたか確認する**

`dist/_expo/` 以下の実在するアセットURLに対して `curl -sI` を打ち、200 が返ることを確認する。`index.html` だけを見ても Jekyll の問題は検出できないので、必ず `_expo/...` を叩く。

Live URL: https://masato-masa.github.io/animal-puzzle/

---

## 分割3への申し送り

本計画では**既存5種の性格を変更していない**。仕様書 §7 の最終ロースターにするには、分割3（ステージ生成器と全ステージ作り直し）で以下を行う必要がある。出荷18ステージの唯一解が壊れるため、ステージデータの差し替えと同一コミットで行うこと。

- リス: `adjacentForbidden: lion` を追加（ヒョウとの関係はヒョウ側に実装済み）
- ライオン: `adjacentForbidden: lion`（縄張り）を追加
- ゾウ: `adjacentForbidden: squirrel` と `adjacentForbidden: monkey` を追加

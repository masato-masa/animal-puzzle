# 動物パズル UI 全面刷新 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 動物パズルを Expo から Vite + React に移し、盤面・素材・操作・情報設計を参考アプリ（にゃんどく）の水準に作り直す。

**Architecture:** engine / levels / lib / テスト（約 2,900 行）は react-native 依存が無いのでそのまま移植する。UI 層は全廃して作り直す。盤面はセル長 `--cell` を起点に CSS だけで組み、駒は grid に参加させず絶対配置で重ねる。当たり判定は `.grid` の矩形からその場で計算し、値をキャッシュしない。

**Tech Stack:** Vite 6 / React 19 / TypeScript / Motion 12 / @use-gesture/react 10 / Vitest / WebAudio

**Spec:** `docs/superpowers/specs/2026-09-11-ui-overhaul-design.md`

## Global Constraints

- **日本語で書く。** UI の文言・コードのコメント・コミットメッセージすべて。
- **engine / levels は 1 行も変えない。** `src/engine/**` と `src/levels/stages.ts` は移動のみ。ゲームルールと 40 ステージの内容は不変。
- **既存 223 テストを緑のまま保つ。** どのタスクの終わりでも `npm test` が通ること。
- **配置可否のロジックを UI に持たない。** 置けるかどうかは常に engine の `placeAnimal` / `moveAnimal` が状態を変えるかで判定する。
- **数値の二重定義を作らない。** `GAP` / `PAD` は `src/ui/geometry.ts` が唯一の出どころ。CSS にはインライン変数で流し込む。
- **色は `oklch()` で書く。** 種の面 `oklch(0.70 0.12 H)`、ふち `oklch(0.50 0.085 H)`。色相は `monkey 25 / squirrel 58 / lion 90 / giraffe 123 / crocodile 156 / oxpecker 189 / zebra 221 / gorilla 254 / rhino 287 / elephant 320 / leopard 352`。
- **クロームの実測値**（参考アプリから）: `--bg #F6F5EF` / `--surface #FFFFFF` / `--title #735056` / `--pill-bg #FBF1EB` / `--pill-fg #8A5A5A` / `--ink #3B2E2B` / `--accent #9179D1` / セル角丸 `8px` / カード角丸 `16px` / `--gap 6px` / `--pad 16px` / `--ease cubic-bezier(0.4, 0, 0.2, 1)` / `--shadow-xs 0 1px 2px 0 rgb(0 0 0 / 0.05)`。
- **Windows 環境。** 日本語を含むファイルの作成・編集は Write / Edit ツールを使う。bash heredoc は使わない。PowerShell では `&&` `||` が使えない。
- **各タスクの最後にコミットする。**

---

## ファイル構成

```
src/
  main.tsx                エントリ
  App.tsx                 ルータとレイアウトの外枠
  core/
    router.ts             ハッシュルータ
    sfx.ts                WebAudio 合成と触覚
  ui/
    styles.css            トークンと全画面のスタイル
    geometry.ts           GAP / PAD / cellFromPoint / anchorFromPiecePoint
    Board.tsx             盤面。マスの描画とジェスチャ
    Piece.tsx             駒 1 個
    AnimalCards.tsx       トレイ＝条件カード
    Game.tsx              1 ステージの統括。engine への呼び出しを集約
    StageSelect.tsx       一覧
    ClearOverlay.tsx      クリア演出
    MyStages.tsx
    Editor.tsx
    icons.tsx             UI アイコン
  art/
    palette.ts            種 → 色相 の対応
    species.tsx           11 種のシルエット SVG
    blocks.tsx            水・木のアイコン SVG
  engine/                 移動のみ、変更なし
  levels/                 移動のみ、変更なし
  lib/                    animal-art.ts を削除、他は変更なし
  storage/                localStorage 版に書き換え
__tests__/                既存 3 本 + 新規 3 本
scripts/
  generate-open-stages.ts 変更なし
  deploy.mjs              新規
```

---

## Task 1: Vite の土台を作り、既存テストを Vitest で通す

Expo を外し、Vite + Vitest で既存の 223 テストが緑になるところまで持っていく。
UI はまだ何も作らない。**engine が動くことを先に確定させる**のが目的。

**Files:**
- Modify: `package.json`
- Create: `vite.config.ts`
- Modify: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Delete: `app.json`, `expo-env.d.ts`, `.expo/`, `src/app/+html.tsx`

- [ ] **Step 1: 現状のテストが通ることを記録する**

Run: `npx jest --silent`
Expected: `Tests: 223 passed, 223 total`

この数字が移行後も変わらないことが、このタスクの合格条件。

- [ ] **Step 2: 依存を入れ替える**

`package.json` を丸ごと次の内容にする。

```json
{
  "name": "animal-puzzle",
  "private": true,
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5174 --strictPort",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --port 5174",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "deploy": "npm run build && node scripts/deploy.mjs"
  },
  "dependencies": {
    "@use-gesture/react": "^10.3.1",
    "motion": "^12.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

Run: `rm -rf node_modules package-lock.json && npm install`

- [ ] **Step 3: Vite と Vitest を設定する**

`vite.config.ts` を作る。

```ts
/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages はリポジトリ名のサブパスで配信される。ここを変えるとビルド後の
// アセット参照が全部壊れるので、リポジトリ名と必ず一致させること。
export default defineConfig({
  base: '/animal-puzzle/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5174, strictPort: true },
  test: {
    globals: true,
    // storage と router のテストが localStorage / location を使う。
    environment: 'jsdom',
    include: ['__tests__/**/*.test.ts'],
    // ステージ生成器のテストは乱数探索を回すので 40 秒前後かかる。
    testTimeout: 120000,
    hookTimeout: 120000,
  },
});
```

- [ ] **Step 4: tsconfig を Expo から外す**

`tsconfig.json` を丸ごと次の内容にする。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "types": ["vitest/globals"],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "__tests__/**/*.ts", "scripts/**/*.ts", "vite.config.ts"]
}
```

- [ ] **Step 5: テストを走らせ、engine が動くことを確かめる**

Run: `npm test`
Expected: `Tests  223 passed (223)`

`src/lib/animal-art.ts` は react-native を import しているが、どのテストからも
参照されていないため、この時点ではまだ消さなくてよい（Task 6 で消す）。
もし解決エラーが出る場合は、この時点で `src/lib/animal-art.ts` を削除する。

- [ ] **Step 6: 空のアプリを立ち上げる**

`index.html`:

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#F6F5EF" />
    <title>動物パズル</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './ui/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

`src/App.tsx`:

```tsx
import { STAGES } from '@/levels/stages';

export function App() {
  return <p style={{ padding: 24 }}>ステージ数: {STAGES.length}</p>;
}
```

`src/ui/styles.css` は空ファイルで作る（Task 3 で中身を入れる）。

- [ ] **Step 7: Expo の残骸を消す**

Run: `rm -rf .expo app.json expo-env.d.ts src/app`

- [ ] **Step 8: ブラウザで確認する**

`.claude/launch.json` を作る。

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "animal-puzzle", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5174 }
  ]
}
```

preview_start でこの設定を起動し、`ステージ数: 40` と表示されることを確認する。
コンソールにエラーが出ていないことも read_console_messages で確認する。

- [ ] **Step 9: 型検査とテストを通してコミット**

Run: `npm run typecheck && npm test`
Expected: 型エラー 0、`223 passed`

```bash
git add -A
git commit -m "Expo から Vite + Vitest に移行し、engine のテスト223件を維持する"
```

---

## Task 2: storage を localStorage 版に書き換える

**Files:**
- Modify: `src/storage/progress.ts`
- Modify: `src/storage/custom-stages.ts`
- Create: `src/storage/local.ts`
- Test: `__tests__/storage.test.ts`

**Interfaces:**
- Consumes: `migrateStageTerrain` from `@/storage/migrate-stage`（変更なし）
- Produces: 既存と同じ async シグネチャ。`loadProgress(): Promise<{clearedStageIds: string[]}>`、`hasClearedStage(id): Promise<boolean>`、`recordClear(id): Promise<void>`、`clearProgress(): Promise<void>`、`listCustomStages(): Promise<Stage[]>`、`getCustomStage(id): Promise<Stage | undefined>`、`saveCustomStage(stage): Promise<void>`、`deleteCustomStage(id): Promise<void>`、`generateCustomStageId(): string`

**async のシグネチャは変えない。** localStorage は同期だが、呼び出し側の形を変えずに
差分を storage の内部だけに閉じ込めるため。

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/storage.test.ts`:

```ts
import { beforeEach, describe, expect, test } from 'vitest';

import type { Stage } from '@/engine';
import { deleteCustomStage, listCustomStages, saveCustomStage } from '@/storage/custom-stages';
import { clearProgress, hasClearedStage, loadProgress, recordClear } from '@/storage/progress';

const stage = (id: string): Stage => ({
  id,
  name: id,
  rows: 2,
  cols: 2,
  terrain: [
    ['land', 'land'],
    ['land', 'land'],
  ],
  animals: [{ instanceId: 's1', species: 'squirrel' }],
});

beforeEach(() => {
  localStorage.clear();
});

describe('progress', () => {
  test('何も保存していなければ空で返る', async () => {
    expect(await loadProgress()).toEqual({ clearedStageIds: [] });
  });

  test('クリアを記録して読み戻せる', async () => {
    await recordClear('stage-1');
    expect(await hasClearedStage('stage-1')).toBe(true);
    expect(await hasClearedStage('stage-2')).toBe(false);
  });

  test('同じステージを二重に記録しない', async () => {
    await recordClear('stage-1');
    await recordClear('stage-1');
    expect((await loadProgress()).clearedStageIds).toEqual(['stage-1']);
  });

  test('消せる', async () => {
    await recordClear('stage-1');
    await clearProgress();
    expect((await loadProgress()).clearedStageIds).toEqual([]);
  });

  test('壊れた JSON が入っていても落ちない', async () => {
    localStorage.setItem('animal-puzzle:progress:v2', '{ではない');
    expect(await loadProgress()).toEqual({ clearedStageIds: [] });
  });

  test('clearedStageIds が配列でなくても落ちない', async () => {
    localStorage.setItem('animal-puzzle:progress:v2', '{"clearedStageIds":"stage-1"}');
    expect(await loadProgress()).toEqual({ clearedStageIds: [] });
  });
});

describe('custom stages', () => {
  test('保存して一覧に出る', async () => {
    await saveCustomStage(stage('custom-1'));
    expect((await listCustomStages()).map((s) => s.id)).toEqual(['custom-1']);
  });

  test('同じ ID は上書きされ、重複しない', async () => {
    await saveCustomStage(stage('custom-1'));
    await saveCustomStage({ ...stage('custom-1'), name: '書き換え後' });
    const list = await listCustomStages();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('書き換え後');
  });

  test('消せる', async () => {
    await saveCustomStage(stage('custom-1'));
    await deleteCustomStage('custom-1');
    expect(await listCustomStages()).toEqual([]);
  });

  test('壊れた JSON が入っていても落ちない', async () => {
    localStorage.setItem('animal-puzzle:custom-stages:v1', 'null');
    expect(await listCustomStages()).toEqual([]);
  });
});
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `npx vitest run __tests__/storage.test.ts`
Expected: FAIL（`@react-native-async-storage/async-storage` が解決できない）

- [ ] **Step 3: localStorage の薄いラッパーを作る**

`src/storage/local.ts`:

```ts
/**
 * localStorage の読み書き。プライベートブラウジングや容量超過では例外が飛ぶため、
 * 呼び出し側が毎回 try/catch を書かずに済むようここで吸収する。
 * 読めなかった場合は「保存されていない」と同じ扱いにする。
 */
export const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return parsed === null || parsed === undefined ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
};

/** 書けたら true。容量超過などで書けなくても例外は投げない。 */
export const writeJson = (key: string, value: unknown): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const removeKey = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* 消せなくても続行する */
  }
};
```

- [ ] **Step 4: progress.ts を書き換える**

`src/storage/progress.ts`:

```ts
import { readJson, removeKey, writeJson } from './local';

/** v2: 出荷ステージを全面差し替えた際に stage-N の ID が旧内容と衝突したため、
 * 進捗を確実にリセットする目的でキーを上げてある。 */
const KEY = 'animal-puzzle:progress:v2';

type ProgressData = { clearedStageIds: string[] };

/** localStorage は同期だが、呼び出し側の形を変えないため async のまま保つ。 */
const load = async (): Promise<ProgressData> => {
  const data = readJson<Partial<ProgressData>>(KEY, {});
  return { clearedStageIds: Array.isArray(data.clearedStageIds) ? data.clearedStageIds : [] };
};

export const loadProgress = load;

export const hasClearedStage = async (stageId: string): Promise<boolean> =>
  (await load()).clearedStageIds.includes(stageId);

export const recordClear = async (stageId: string): Promise<void> => {
  const data = await load();
  if (data.clearedStageIds.includes(stageId)) return;
  writeJson(KEY, { clearedStageIds: [...data.clearedStageIds, stageId] });
};

export const clearProgress = async (): Promise<void> => {
  removeKey(KEY);
};
```

- [ ] **Step 5: custom-stages.ts を書き換える**

`src/storage/custom-stages.ts`:

```ts
import type { Stage } from '@/engine';

import { readJson, writeJson } from './local';
import { migrateStageTerrain } from './migrate-stage';

const KEY = 'animal-puzzle:custom-stages:v1';

const load = async (): Promise<Stage[]> => {
  const raw = readJson<unknown>(KEY, []);
  return Array.isArray(raw) ? (raw as Stage[]).map(migrateStageTerrain) : [];
};

export const listCustomStages = load;

export const getCustomStage = async (id: string): Promise<Stage | undefined> =>
  (await load()).find((s) => s.id === id);

export const saveCustomStage = async (stage: Stage): Promise<void> => {
  const stages = await load();
  writeJson(KEY, [...stages.filter((s) => s.id !== stage.id), stage]);
};

export const deleteCustomStage = async (id: string): Promise<void> => {
  const stages = await load();
  writeJson(KEY, stages.filter((s) => s.id !== id));
};

export const generateCustomStageId = (): string =>
  `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
```

- [ ] **Step 6: テストが通ることを確かめる**

Run: `npm test`
Expected: 既存 223 + 新規 10 = `233 passed`

- [ ] **Step 7: コミット**

```bash
git add -A
git commit -m "storage を AsyncStorage から localStorage に書き換える"
```

---

## Task 3: デザイントークンと種のパレット

**Files:**
- Modify: `src/ui/styles.css`
- Create: `src/art/palette.ts`
- Delete: `src/theme.ts`（`speciesLabel` / `blockLabel` は `src/art/palette.ts` へ移す）

**Interfaces:**
- Produces: `speciesHue: Record<Species, number>`、`speciesLabel: Record<Species, string>`、`blockLabel: Record<ConditionBlock, string>`、`speciesVars(species): { '--face': string; '--edge': string }`

- [ ] **Step 1: パレットを作る**

`src/art/palette.ts`:

```tsx
import type { ConditionBlock, Species } from '@/engine';

/**
 * 種の色相（OKLCH の H）。明度 0.70 と彩度 0.12 は全種で固定し、色相だけを
 * 32.7 度ずつずらして 11 等分してある。
 *
 * 色は「種のラベル」であって写実ではない。ステージ内容を集計したところ 1 面に
 * 最大 8 種が同時に出て、55 ペア中 54 ペアが実際に同居するため、11 色すべてが
 * 相互に見分けられる必要がある。写実的な色（ライオン=黄、キリン=黄、ヒョウ=黄、
 * ゾウ=灰、サイ=灰、ゴリラ=黒…）では必ず衝突するのでこの方式を採った。
 *
 * 明度と彩度を固定するのが要点で、これをやらないと「どれか1色だけ浮く」盤面になる。
 * 全 22 色が sRGB 域内、最も近い2色（リス vs ライオン）でも弁別閾の 3.3 倍離れている。
 */
export const speciesHue: Record<Species, number> = {
  monkey: 25,
  squirrel: 58,
  lion: 90,
  giraffe: 123,
  crocodile: 156,
  oxpecker: 189,
  zebra: 221,
  gorilla: 254,
  rhino: 287,
  elephant: 320,
  leopard: 352,
};

const FACE_L = 0.7;
const FACE_C = 0.12;
const EDGE_L = 0.5;
const EDGE_C = 0.085;

/** 駒やチップに流し込むインラインの CSS 変数。色相ひとつから面とふちを導く。 */
export const speciesVars = (species: Species): Record<string, string> => {
  const h = speciesHue[species];
  return {
    '--face': `oklch(${FACE_L} ${FACE_C} ${h})`,
    '--edge': `oklch(${EDGE_L} ${EDGE_C} ${h})`,
  };
};

export const speciesLabel: Record<Species, string> = {
  lion: 'ライオン',
  zebra: 'シマウマ',
  giraffe: 'キリン',
  elephant: 'ゾウ',
  crocodile: 'ワニ',
  oxpecker: 'ウシツツキ',
  squirrel: 'リス',
  monkey: 'サル',
  leopard: 'ヒョウ',
  rhino: 'サイ',
  gorilla: 'ゴリラ',
};

export const blockLabel: Record<ConditionBlock, string> = {
  water: '水辺',
  tree: '木',
};
```

- [ ] **Step 2: トークンを styles.css に入れる**

`src/ui/styles.css` の先頭に置く。

```css
/* 配色・寸法・余白は参考アプリ（にゃんどく）の実測値。目分量の数字は入れていない。
   種の色は src/art/palette.ts が持ち、駒にインライン変数として流し込む。 */
:root {
  --bg: #f6f5ef;
  --surface: #ffffff;
  --title: #735056;
  --pill-bg: #fbf1eb;
  --pill-fg: #8a5a5a;
  --ink: #3b2e2b;
  --accent: #9179d1;

  --cell-radius: 8px;
  --card-radius: 16px;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);

  /* 置けるマス。置けないブロックは暗いニュートラルに寄せ、種類はアイコンで
     区別する。こうすると種の 11 色とマスの色が競合しない。 */
  --land: #ebe4dc;
  --land-valid: #f5efe6;
  --wall: oklch(0.42 0.02 60);
  --water: oklch(0.45 0.05 230);
  --tree: oklch(0.45 0.05 145);

  --ok: #3fa845;
  --ng: #d9453c;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  background: var(--bg);
  color: var(--title);
  font-family: 'Open Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}

.app {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px 16px 28px;
}
```

- [ ] **Step 3: 旧テーマを消す**

Run: `rm src/theme.ts`

`src/theme.ts` を import しているのは削除済みの `src/app/` と `src/components/` だけなので、
参照は残らない。

- [ ] **Step 4: 型検査とテストを通す**

Run: `npm run typecheck && npm test`
Expected: 型エラー 0、`233 passed`

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "デザイントークンと種のパレット（OKLCH で色相を11等分）を追加する"
```

---

## Task 4: 動物のシルエット 11 種とブロックのアイコン

写実素材を全廃し、単色シルエットに置き換える。**このタスクの成果物は絵そのもの**なので、
必ずブラウザで並べて見て確認する。

**Files:**
- Create: `src/art/species.tsx`
- Create: `src/art/blocks.tsx`
- Modify: `src/App.tsx`（確認用の一時的な表示）

**Interfaces:**
- Consumes: `speciesHue`, `speciesLabel` from `@/art/palette`
- Produces: `SpeciesSilhouette({ species }: { species: Species }): JSX.Element`、`WaterIcon()`, `TreeIcon()`

- [ ] **Step 1: シルエットを描く**

`src/art/species.tsx` を作る。11 種すべてを `viewBox="0 0 24 24"`、`fill="currentColor"`
の単色シルエットで描く。制約:

- パスは 1 種につき 3〜6 本まで。目・鼻・模様などの細部は描かない
- 実寸 34px（8 列の盤面をモバイル幅で表示したときのセル）で輪郭が潰れないこと
- `domino_h`（シマウマ・ワニ）は横長の構図、`domino_v`（ライオン・キリン・ヒョウ）は
  縦長の構図、`square2x2`（ゾウ・サイ・ゴリラ）は正方の構図にして、駒の外形と向きを揃える
- **色に頼らず輪郭だけで区別できること。** 特に紛らわしいのは
  ライオン / ヒョウ（たてがみの有無）、サル / ゴリラ（体格と腕の長さ）、
  サイ / ゾウ（角と鼻）の 3 組

形は `SPECIES[species].shape` に対応する。参照:

```
single:    squirrel, oxpecker, monkey
domino_h:  zebra, crocodile
domino_v:  lion, giraffe, leopard
square2x2: elephant, rhino, gorilla
```

複雑な 1 本のパスより、**円・楕円・短い曲線を重ねる**ほうが破綻しにくく、直しやすい。

```tsx
import type { Species } from '@/engine';

/**
 * 種のシルエット。色は親から currentColor で受ける（駒の上では #3B2E2B）。
 * 形（1x1 / 2x1 / 1x2 / 2x2）は駒の外形が担うので、ここは「何の動物か」だけを伝える。
 * 細部を描くと小さいマスで潰れるため、種ごとに 3〜6 個の図形に抑える。
 */
type Shape =
  | { k: 'path'; d: string }
  | { k: 'circle'; cx: number; cy: number; r: number }
  | { k: 'ellipse'; cx: number; cy: number; rx: number; ry: number };

const SHAPES: Record<Species, Shape[]> = {
  // リス（1x1）: 大きな尻尾が後ろで巻き上がる輪郭で識別する。
  squirrel: [
    { k: 'path', d: 'M18.5 20.6 c3.8 -1.3 4.4 -6.3 1.6 -8.9 c-2.3 -2.2 -6.1 -1.6 -7.1 1.2 l2.6 1 c0.5 -1.3 2.2 -1.5 3.2 -0.5 c1.4 1.3 1.1 4.1 -1.2 4.9 Z' },
    { k: 'ellipse', cx: 10, cy: 16, rx: 5, ry: 5.6 },
    { k: 'circle', cx: 8.4, cy: 8.2, r: 4.4 },
    { k: 'path', d: 'M5.6 4.6 c-0.6 -1.8 0.4 -3.2 1.9 -2.6 c1 0.4 1.5 1.6 1.4 2.8 Z' },
  ],
  // 残り 10 種も同じ密度で描く。
  // ...
};

export function SpeciesSilhouette({ species }: { species: Species }) {
  return (
    <svg className="silhouette" viewBox="0 0 24 24" aria-hidden="true">
      {SHAPES[species].map((s, i) =>
        s.k === 'path' ? (
          <path key={i} d={s.d} fill="currentColor" />
        ) : s.k === 'circle' ? (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="currentColor" />
        ) : (
          <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill="currentColor" />
        )
      )}
    </svg>
  );
}
```

上のリスは**出発点であって完成品ではない。** Step 4 の目視確認を通るまで座標を調整する。
残り 10 種も同じ方針（図形を重ねる・3〜6 個・細部なし）で描き、同じ基準で確認する。

- [ ] **Step 2: ブロックのアイコンを描く**

`src/art/blocks.tsx`:

```tsx
/** 水ブロック。ワニの条件から参照されるので、無地の壁と区別できる必要がある。 */
export function WaterIcon() {
  return (
    <svg className="block-icon" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.85">
        <path d="M4 10 q3 -2.6 6 0 t6 0 t4 0" />
        <path d="M4 15.5 q3 -2.6 6 0 t6 0 t4 0" />
      </g>
    </svg>
  );
}

/** 木ブロック。ゴリラの条件から参照される。 */
export function TreeIcon() {
  return (
    <svg className="block-icon" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="#fff" opacity="0.85">
        <path d="M12 3.5 c3.6 0 6.4 2.9 6.4 6.2 c0 3.6 -3 6.1 -6.4 6.1 s-6.4 -2.5 -6.4 -6.1 c0 -3.3 2.8 -6.2 6.4 -6.2 Z" />
        <rect x="10.9" y="14" width="2.2" height="6.6" rx="1.1" />
      </g>
    </svg>
  );
}
```

- [ ] **Step 3: 確認用の一覧を出す**

`src/App.tsx` を一時的に次の内容にする。

```tsx
import { SPECIES } from '@/engine';
import type { Species } from '@/engine';
import { speciesLabel, speciesVars } from '@/art/palette';
import { SpeciesSilhouette } from '@/art/species';
import { TreeIcon, WaterIcon } from '@/art/blocks';

const ALL = Object.keys(SPECIES) as Species[];

export function App() {
  return (
    <div className="app">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 96px)', gap: 12 }}>
        {ALL.map((s) => (
          <div key={s} style={{ textAlign: 'center' }}>
            <div
              style={{
                ...speciesVars(s),
                background: 'var(--face)',
                borderBottom: '4px solid var(--edge)',
                borderRadius: 10,
                color: 'var(--ink)',
                height: 96,
                display: 'grid',
                placeItems: 'center',
              } as React.CSSProperties}>
              <SpeciesSilhouette species={s} />
            </div>
            <small>{speciesLabel[s]}</small>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ background: 'var(--water)', width: 64, height: 64, borderRadius: 8, display: 'grid', placeItems: 'center' }}>
          <WaterIcon />
        </div>
        <div style={{ background: 'var(--tree)', width: 64, height: 64, borderRadius: 8, display: 'grid', placeItems: 'center' }}>
          <TreeIcon />
        </div>
        <div style={{ background: 'var(--wall)', width: 64, height: 64, borderRadius: 8 }} />
      </div>
    </div>
  );
}
```

`styles.css` に追記:

```css
.silhouette {
  width: 62%;
  height: 62%;
  display: block;
  pointer-events: none;
}

.block-icon {
  width: 52%;
  height: 52%;
  display: block;
  pointer-events: none;
}
```

- [ ] **Step 4: ブラウザで見て確認する（このタスクの合格判定）**

preview_start でアプリを開き、computer の screenshot を撮る。次を確認する。

1. 11 種が並んで**どれも輪郭で何の動物か分かる**
2. 隣り合う色が近すぎないこと（特にリス / ライオン、キリン / ワニ）
3. javascript_tool で `document.body.style.filter = 'grayscale(1)'` を実行し、
   **グレースケールでも 11 種が区別できる**こと。区別できない組があればシルエットを直す
4. 水・木・壁の 3 ブロックが互いに区別でき、アイコンが読めること

満たさないものがあれば、満たすまでパスを直してから次へ進む。

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "動物11種のシルエットと水・木のアイコンを自作SVGで追加する"
```

---

## Task 5: 盤面の幾何と当たり判定

盤面の座標計算をひとつのモジュールに閉じ込め、テストで固める。
**現行の「反応しない」不具合の根を断つ中心のタスク。**

**Files:**
- Create: `src/ui/geometry.ts`
- Test: `__tests__/geometry.test.ts`

**Interfaces:**
- Consumes: `type Pos` from `@/engine`
- Produces: `GAP: 6`、`PAD: 16`、`type Rect`、`cellSize(rect, cols): number`、`cellFromPoint(rect, rows, cols, x, y): Pos | null`、`anchorFromPiecePoint(rect, left, top, cols): Pos`、`pieceSpan(n, cell): number`

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/geometry.test.ts`:

```ts
import { describe, expect, test } from 'vitest';

import { anchorFromPiecePoint, cellFromPoint, cellSize, GAP, pieceSpan } from '@/ui/geometry';

// 4列2行、セル40px、gap 6px の盤面。
// 幅 = 4*40 + 3*6 = 178、高さ = 2*40 + 1*6 = 86
const rect = { left: 100, top: 200, width: 178, height: 86 };

describe('cellSize', () => {
  test('gap は cols-1 本ぶんしかない', () => {
    expect(cellSize(rect, 4)).toBe(40);
  });
});

describe('cellFromPoint', () => {
  test('左上のマス', () => {
    expect(cellFromPoint(rect, 2, 4, 100, 200)).toEqual({ r: 0, c: 0 });
  });

  test('右下のマス', () => {
    expect(cellFromPoint(rect, 2, 4, 277, 285)).toEqual({ r: 1, c: 3 });
  });

  test('セルの内側の端はそのセル', () => {
    // 列0は 0..39、gap は 40..45、列1は 46 から
    expect(cellFromPoint(rect, 2, 4, 100 + 39, 200)).toEqual({ r: 0, c: 0 });
    expect(cellFromPoint(rect, 2, 4, 100 + 46, 200)).toEqual({ r: 0, c: 1 });
  });

  test('gap の上は手前のセルに寄せる', () => {
    expect(cellFromPoint(rect, 2, 4, 100 + 42, 200)).toEqual({ r: 0, c: 0 });
  });

  test('矩形の外は null', () => {
    expect(cellFromPoint(rect, 2, 4, 99, 200)).toBeNull();
    expect(cellFromPoint(rect, 2, 4, 279, 200)).toBeNull();
    expect(cellFromPoint(rect, 2, 4, 100, 199)).toBeNull();
    expect(cellFromPoint(rect, 2, 4, 100, 287)).toBeNull();
  });

  test('右端・下端ちょうどでも範囲外の番号を返さない', () => {
    expect(cellFromPoint(rect, 2, 4, 278, 286)).toEqual({ r: 1, c: 3 });
  });

  test('1列1行でも動く（gap が 0 本になる割り算）', () => {
    const one = { left: 0, top: 0, width: 40, height: 40 };
    expect(cellSize(one, 1)).toBe(40);
    expect(cellFromPoint(one, 1, 1, 20, 20)).toEqual({ r: 0, c: 0 });
  });
});

describe('anchorFromPiecePoint', () => {
  test('ぴったり重なっていればそのマス', () => {
    expect(anchorFromPiecePoint(rect, 100 + 46, 200 + 46, 4)).toEqual({ r: 1, c: 1 });
  });

  test('半マス未満のずれは近いマスに寄せる', () => {
    expect(anchorFromPiecePoint(rect, 100 + 46 + 15, 200 + 5, 4)).toEqual({ r: 0, c: 1 });
  });

  test('半マスを超えるずれは隣のマスになる', () => {
    expect(anchorFromPiecePoint(rect, 100 + 46 + 30, 200, 4)).toEqual({ r: 0, c: 2 });
  });

  test('盤の外にはみ出す位置も返す（置けるかの判断は engine に任せる）', () => {
    expect(anchorFromPiecePoint(rect, 100 - 46, 200 - 46, 4)).toEqual({ r: -1, c: -1 });
  });
});

describe('pieceSpan', () => {
  test('1マスの駒はセルそのまま', () => {
    expect(pieceSpan(1, 40)).toBe(40);
  });

  test('2マスの駒は gap を1本またぐ', () => {
    expect(pieceSpan(2, 40)).toBe(86);
    expect(pieceSpan(2, 40)).toBe(2 * 40 + GAP);
  });

  test('盤の全幅は cols マス分の駒と同じ長さになる', () => {
    expect(pieceSpan(4, cellSize(rect, 4))).toBeCloseTo(rect.width, 6);
  });
});

test('GAP は CSS に流し込む唯一の出どころ', () => {
  expect(GAP).toBe(6);
});
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `npx vitest run __tests__/geometry.test.ts`
Expected: FAIL（`@/ui/geometry` が解決できない）

- [ ] **Step 3: 実装する**

`src/ui/geometry.ts`:

```ts
import type { Pos } from '@/engine';

/**
 * セル間隔とカードの内側余白。**CSS に同じ数字を書かない。**
 * ここを唯一の出どころにして、盤面にインラインの CSS 変数として流し込む。
 * 二重に持つと、片方だけ変えたときに当たり判定と見た目がずれる。
 */
export const GAP = 6;
export const PAD = 16;

/** getBoundingClientRect() の必要な部分だけ。テストから作れるようにしてある。 */
export type Rect = { left: number; top: number; width: number; height: number };

/** 1マスの辺長。gap は cols-1 本しかないことに注意（cols 本ではない）。 */
export const cellSize = (rect: Rect, cols: number): number => (rect.width - GAP * (cols - 1)) / cols;

const clamp = (v: number, max: number): number => Math.min(max, Math.max(0, v));

/**
 * 画面座標を盤面のマスに変える。矩形の外なら null。
 *
 * **値を一切キャッシュしない。** 呼ぶたびに rect を渡してもらう前提なので、
 * スクロール・回転・リサイズ・フォント読み込みのどれが起きてもずれない。
 * 旧実装が measureInWindow の非同期結果を保持していたのが「反応しない」の原因だった。
 */
export const cellFromPoint = (
  rect: Rect,
  rows: number,
  cols: number,
  x: number,
  y: number
): Pos | null => {
  if (x < rect.left || x > rect.left + rect.width) return null;
  if (y < rect.top || y > rect.top + rect.height) return null;
  const step = cellSize(rect, cols) + GAP;
  return {
    r: clamp(Math.floor((y - rect.top) / step), rows - 1),
    c: clamp(Math.floor((x - rect.left) / step), cols - 1),
  };
};

/**
 * 駒の左上の画面座標から、置こうとしているアンカーのマスを出す。
 * つまんだ場所ではなく駒の左上を基準にするので、2x2 の駒でも狙いがずれない。
 * 盤の外にはみ出す座標もそのまま返す（置けるかどうかは engine が決める）。
 */
export const anchorFromPiecePoint = (rect: Rect, left: number, top: number, cols: number): Pos => {
  const step = cellSize(rect, cols) + GAP;
  return {
    r: Math.round((top - rect.top) / step),
    c: Math.round((left - rect.left) / step),
  };
};

/**
 * n マス分の駒の辺長。gap を n-1 本またぐぶん、セル n 個ぶんより長い。
 * CSS 側の `calc(var(--w) * var(--cell) + (var(--w) - 1) * var(--gap))` と同じ式で、
 * ドラッグ中に指へ追従させる複製の大きさを出すのに使う。
 */
export const pieceSpan = (n: number, cell: number): number => n * cell + (n - 1) * GAP;
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npm test`
Expected: `249 passed`（223 + 10 + 16）

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "盤面の座標計算を geometry.ts に閉じ込め、境界値をテストで固める"
```

---

## Task 6: 盤面と駒の描画

まだ操作は付けない。**駒を置いても盤面が 1px も動かないこと**を確定させるのが目的。

**Files:**
- Create: `src/ui/Board.tsx`
- Create: `src/ui/Piece.tsx`
- Modify: `src/ui/styles.css`
- Modify: `src/App.tsx`（確認用）
- Delete: `src/lib/animal-art.ts`, `assets/images/animals/`, `assets/images/terrain/`, `assets/images/fence/`

**Interfaces:**
- Consumes: `GAP`, `PAD` from `@/ui/geometry`、`boundingBox`, `terrainAt`, `type GameState`, `type PlacedAnimal`, `type Pos`, `type Species` from `@/engine`、`speciesVars` from `@/art/palette`、`SpeciesSilhouette` from `@/art/species`
- Produces:
  - `Piece({ species, w, h, violating, dimmed }): JSX.Element` — 盤面にもカードにも使う駒 1 個
  - `Board({ state, validAnchors, selectedId, violatingIds, gridRef, onCellPress, onPiecePress }): JSX.Element`
  - `type BoardProps` を export する（Task 7 以降が使う）

- [ ] **Step 1: 駒を作る**

`src/ui/Piece.tsx`:

```tsx
import type { Species } from '@/engine';
import { speciesVars } from '@/art/palette';
import { SpeciesSilhouette } from '@/art/species';

type Props = {
  species: Species;
  /** 何マス分か。gap をまたいで 1 枚の角丸ブロックとして描くために使う。 */
  w: number;
  h: number;
  violating?: boolean;
  /** 残数 0 のカードなど、存在は見せるが主張を下げたいとき。 */
  dimmed?: boolean;
};

/**
 * 駒 1 個。盤面でもカードでも同じ見た目にすることで、つまんだ瞬間に姿が変わらない。
 * 大きさは親（--cell を持つ側）が決めるので、ここでは幅・高さを指定しない。
 */
export function Piece({ species, w, h, violating, dimmed }: Props) {
  return (
    <div
      className="piece"
      style={{ ...speciesVars(species), '--w': w, '--h': h } as React.CSSProperties}
      data-violating={violating ? 'true' : undefined}
      data-dimmed={dimmed ? 'true' : undefined}>
      <SpeciesSilhouette species={species} />
    </div>
  );
}
```

- [ ] **Step 2: 盤面を作る**

`src/ui/Board.tsx`:

```tsx
import type { RefObject } from 'react';

import { boundingBox, posKey, terrainAt, type GameState, type Pos } from '@/engine';
import { TreeIcon, WaterIcon } from '@/art/blocks';
import { GAP, PAD } from './geometry';
import { Piece } from './Piece';

export type BoardProps = {
  state: GameState;
  /** 選択中の駒が置けるアンカー。ここだけ光らせる。 */
  validAnchors: Set<string>;
  selectedId: string | null;
  violatingIds: Set<string>;
  /** 当たり判定に使う .grid の実体。値は保持せず、イベントのたびに測り直す。 */
  gridRef: RefObject<HTMLDivElement | null>;
  /** 却下のときに盤全体を振るためのトークン。値が変わるたびに 1 回振る。 */
  rejectToken: number;
};

export function Board({ state, validAnchors, selectedId, violatingIds, gridRef, rejectToken }: BoardProps) {
  const { stage, placed } = state;
  const cells: Pos[] = [];
  for (let r = 0; r < stage.rows; r++) {
    for (let c = 0; c < stage.cols; c++) cells.push({ r, c });
  }

  return (
    <div className="board">
      <div
        ref={gridRef}
        className="grid"
        style={{
          // GAP / PAD は geometry.ts が唯一の出どころ。CSS には書かず、ここから流す。
          '--cols': stage.cols,
          '--rows': stage.rows,
          '--gap': `${GAP}px`,
          '--pad': `${PAD}px`,
        } as React.CSSProperties}
        role="grid"
        aria-label={`${stage.cols}×${stage.rows} の盤面`}>
        {cells.map((pos) => {
          const terrain = terrainAt(stage, pos);
          return (
            <div
              key={posKey(pos)}
              className="cell"
              data-terrain={terrain}
              data-valid={validAnchors.has(posKey(pos)) ? 'true' : undefined}
              role="gridcell">
              {terrain === 'water' && <WaterIcon />}
              {terrain === 'tree' && <TreeIcon />}
            </div>
          );
        })}

        {/* 駒は grid に一切参加させない。絶対配置で重ねることで、置いても消しても
            grid の計算結果が変わらない＝盤面が 1px も動かない。 */}
        {placed.map((animal) => {
          const { w, h } = boundingBox(animal.species);
          return (
            <div
              key={animal.instanceId}
              className="piece-slot"
              data-selected={animal.instanceId === selectedId ? 'true' : undefined}
              style={{ '--r': animal.anchor.r, '--c': animal.anchor.c } as React.CSSProperties}>
              <Piece
                species={animal.species}
                w={w}
                h={h}
                violating={violatingIds.has(animal.instanceId)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

Motion による却下の揺れは Task 8 で足す。ここでは `rejectToken` を受け取るだけにしておく。

- [ ] **Step 3: 盤面の CSS を書く**

`src/ui/styles.css` に追記。**`aspect-ratio: cols / rows` を使ってはいけない**
（余白と gap の本数が縦横で違うため、セルが正方形にならない。8 列 2 行・幅 460px で
48.25px × 38.5px と 20% ずれる）。セル長を起点に組む。

```css
/* ---- 盤面 ---- */
.board {
  width: fit-content;
  padding: var(--pad, 16px);
  background: var(--surface);
  border-radius: var(--card-radius);
  box-shadow: var(--shadow-xs);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.grid {
  /* セルの一辺を先に決め、盤の大きさはその結果とする。横幅と高さのどちらが
     厳しくても収まり、セルは常に完全な正方形になる。 */
  --cell: min(
    calc((min(92vw, 460px) - var(--pad) * 2 - var(--gap) * (var(--cols) - 1)) / var(--cols)),
    calc((52dvh - var(--gap) * (var(--rows) - 1)) / var(--rows))
  );
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--cols), var(--cell));
  grid-template-rows: repeat(var(--rows), var(--cell));
  gap: var(--gap);
}

.cell {
  /* grid から受け取った大きさを内容に押し広げられないようにする。 */
  min-width: 0;
  min-height: 0;
  display: grid;
  place-items: center;
  border-radius: var(--cell-radius);
  transition: background-color 0.18s var(--ease);
}

.cell[data-terrain='land'] { background: var(--land); }
.cell[data-terrain='wall'] { background: var(--wall); }
.cell[data-terrain='water'] { background: var(--water); }
.cell[data-terrain='tree'] { background: var(--tree); }
.cell[data-terrain='void'] { background: transparent; }

/* 置けるマスの合図は「色」ではなく「形」にする。種の 11 色がすでに全色相を
   使っているため、黄色などで光らせると種の色と競合するため。 */
.cell[data-valid='true'] {
  background: var(--land-valid);
}

.cell[data-valid='true']::after {
  content: '';
  width: 22%;
  height: 22%;
  border-radius: 999px;
  background: rgb(59 46 43 / 0.2);
}

/* ---- 駒 ---- */
.piece-slot {
  position: absolute;
  left: calc(var(--c) * (var(--cell) + var(--gap)));
  top: calc(var(--r) * (var(--cell) + var(--gap)));
  z-index: 2;
}

.piece {
  width: calc(var(--w) * var(--cell) + (var(--w) - 1) * var(--gap));
  height: calc(var(--h) * var(--cell) + (var(--h) - 1) * var(--gap));
  display: grid;
  place-items: center;
  border-radius: var(--cell-radius);
  background: var(--face);
  /* 下辺だけ濃くして厚みを出す。影を落とすより盤面が締まる。 */
  box-shadow: inset 0 -4px 0 0 var(--edge);
  color: var(--ink);
}

.piece[data-violating='true'] {
  outline: 3px solid var(--ng);
  outline-offset: -1px;
}

.piece[data-dimmed='true'] {
  opacity: 0.4;
}

.piece-slot[data-selected='true'] .piece {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
```

- [ ] **Step 4: 確認用に 3 形状の盤面を出す**

`src/App.tsx` を一時的に次にする。`stage-1`（2×4）、縦長・正方形の 3 つを並べる。

```tsx
import { useRef } from 'react';

import { createGameState, placeAnimal, type Stage } from '@/engine';
import { getStage, STAGES } from '@/levels/stages';
import { Board } from '@/ui/Board';

const show = (stage: Stage) => {
  // 駒を 1 つ置いた状態も見る（置いても盤面がずれないことの確認）
  let s = createGameState(stage);
  const first = s.tray[0];
  if (first) s = placeAnimal(s, first.instanceId, { r: 0, c: 0 });
  return s;
};

export function App() {
  const ref = useRef<HTMLDivElement>(null);
  const wide = getStage('stage-1')!;
  const tall = STAGES.find((s) => s.rows > s.cols)!;
  const square = STAGES.find((s) => s.rows === s.cols && s.rows >= 6)!;
  return (
    <div className="app">
      {[wide, tall, square].map((stage) => (
        <Board
          key={stage.id}
          state={show(stage)}
          validAnchors={new Set(['1,1'])}
          selectedId={null}
          violatingIds={new Set()}
          gridRef={ref}
          rejectToken={0}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: ブラウザで盤面が動かないことを確かめる（合格判定）**

preview_start でアプリを開き、javascript_tool で次を実行する。

```js
const g = document.querySelector('.grid');
const cells = [...g.querySelectorAll('.cell')].slice(0, 4).map(c => {
  const r = c.getBoundingClientRect();
  return [Math.round(r.width * 100) / 100, Math.round(r.height * 100) / 100];
});
JSON.stringify({ cells, square: cells.every(([w, h]) => Math.abs(w - h) < 0.5) });
```

Expected: `square: true`（セルが正方形であること。§5.2 の罠を踏んでいないことの検査）

次に screenshot を撮り、3 形状すべてが画面に収まり、駒を置いた行だけ高さが変わって
いないことを目で確認する。

- [ ] **Step 6: 旧素材を消す**

Run: `rm -rf src/lib/animal-art.ts assets/images/animals assets/images/terrain assets/images/fence`

- [ ] **Step 7: 型検査とテストを通してコミット**

Run: `npm run typecheck && npm test`
Expected: 型エラー 0、`249 passed`

```bash
git add -A
git commit -m "盤面と駒を CSS グリッドで描き直し、写実素材2.7MBを削除する"
```

---

## Task 7: ハッシュルータ

**Files:**
- Create: `src/core/router.ts`
- Test: `__tests__/router.test.ts`

**Interfaces:**
- Produces: `type Route`、`parseRoute(hash: string): Route`、`hashFor(route: Route): string`、`navigate(route: Route): void`、`useRoute(): Route`

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/router.test.ts`:

```ts
import { describe, expect, test } from 'vitest';

import { hashFor, parseRoute } from '@/core/router';

describe('parseRoute', () => {
  test('空・ルートは一覧', () => {
    expect(parseRoute('')).toEqual({ name: 'stages' });
    expect(parseRoute('#')).toEqual({ name: 'stages' });
    expect(parseRoute('#/')).toEqual({ name: 'stages' });
  });

  test('ゲーム', () => {
    expect(parseRoute('#/game/stage-1')).toEqual({ name: 'game', stageId: 'stage-1' });
  });

  test('ID に使える文字をそのまま通す', () => {
    expect(parseRoute('#/game/custom-1757000000000-ab12cd')).toEqual({
      name: 'game',
      stageId: 'custom-1757000000000-ab12cd',
    });
  });

  test('URL エンコードを戻す', () => {
    expect(parseRoute('#/game/a%20b')).toEqual({ name: 'game', stageId: 'a b' });
  });

  test('stageId が無い game は一覧に落とす', () => {
    expect(parseRoute('#/game')).toEqual({ name: 'stages' });
    expect(parseRoute('#/game/')).toEqual({ name: 'stages' });
  });

  test('マイステージとエディタ', () => {
    expect(parseRoute('#/my-stages')).toEqual({ name: 'my-stages' });
    expect(parseRoute('#/editor')).toEqual({ name: 'editor' });
  });

  test('知らないハッシュは一覧に落とす', () => {
    expect(parseRoute('#/nope/nope')).toEqual({ name: 'stages' });
  });

  test('クエリが付いていても読める', () => {
    expect(parseRoute('#/game/stage-2?x=1')).toEqual({ name: 'game', stageId: 'stage-2' });
  });
});

describe('hashFor', () => {
  test('往復して同じになる', () => {
    const routes = [
      { name: 'stages' },
      { name: 'game', stageId: 'stage-7' },
      { name: 'my-stages' },
      { name: 'editor' },
    ] as const;
    for (const r of routes) expect(parseRoute(hashFor(r))).toEqual(r);
  });

  test('ID をエスケープする', () => {
    expect(hashFor({ name: 'game', stageId: 'a b' })).toBe('#/game/a%20b');
  });
});
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `npx vitest run __tests__/router.test.ts`
Expected: FAIL（`@/core/router` が解決できない）

- [ ] **Step 3: 実装する**

`src/core/router.ts`:

```ts
import { useSyncExternalStore } from 'react';

/**
 * ハッシュルーティング。GitHub Pages のサブパス配信では、通常のパスルーティングだと
 * 直リンクのたびに 404.html のフォールバックが必要になり、base パスとの二重管理も
 * 生む。ハッシュならサーバ設定が一切要らない。
 */
export type Route =
  | { name: 'stages' }
  | { name: 'game'; stageId: string }
  | { name: 'my-stages' }
  | { name: 'editor' };

export const parseRoute = (hash: string): Route => {
  const path = hash.replace(/^#/, '').split('?')[0];
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
  if (seg[0] === 'game' && seg[1]) return { name: 'game', stageId: seg[1] };
  if (seg[0] === 'my-stages') return { name: 'my-stages' };
  if (seg[0] === 'editor') return { name: 'editor' };
  return { name: 'stages' };
};

export const hashFor = (route: Route): string => {
  switch (route.name) {
    case 'game':
      return `#/game/${encodeURIComponent(route.stageId)}`;
    case 'my-stages':
      return '#/my-stages';
    case 'editor':
      return '#/editor';
    default:
      return '#/';
  }
};

export const navigate = (route: Route): void => {
  window.location.hash = hashFor(route);
};

export const goBack = (): void => {
  window.history.back();
};

const subscribe = (onChange: () => void): (() => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};

export const useRoute = (): Route =>
  parseRoute(useSyncExternalStore(subscribe, () => window.location.hash, () => ''));
```

`useSyncExternalStore` の getSnapshot は文字列を返すので、参照の同一性で無限ループに
ならない（`parseRoute` を snapshot の中で呼ぶとオブジェクトが毎回変わって落ちるため、
外で呼んでいる）。

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npm test`
Expected: `259 passed`（249 + 10）

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "ハッシュルータを追加する（expo-router の置き換え）"
```

---

## Task 8: ゲーム画面 — タップで選んでタップで置く

engine への呼び出しをこの 1 ファイルに集約する。ドラッグは Task 9 で足す。

**Files:**
- Create: `src/ui/Game.tsx`
- Modify: `src/ui/Board.tsx`（押下のコールバックと却下の揺れを足す）
- Modify: `src/ui/styles.css`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `createGameState`, `placeAnimal`, `moveAnimal`, `returnToTray`, `isStageCleared`, `violatingAnimals`, `boundingBox`, `posKey`, `type GameState`, `type Pos` from `@/engine`、`cellFromPoint`, `type Rect` from `@/ui/geometry`、`Board` from `@/ui/Board`
- Produces: `Game({ stage, hasNext, onBack, onNext, onList }: GameProps): JSX.Element`

```ts
export type GameProps = {
  stage: Stage;
  /** 次のステージがあるか。クリア画面のボタンの出し分けに使う。 */
  hasNext: boolean;
  onBack: () => void;
  onNext: () => void;
  onList: () => void;
};
```

- [ ] **Step 1: Board に押下のコールバックと却下の揺れを足す**

`BoardProps` に次を追加する。

```ts
  onCellPress: (pos: Pos) => void;
  onPiecePress: (instanceId: string) => void;
  onBackdropPress: () => void;
```

`.grid` を Motion の `motion.div` にして、`rejectToken` が変わったら 1 回振る。

```tsx
const controls = useAnimationControls();

// 置けない場所に置こうとした。左右に短く振って弾かれたことを伝える。
useEffect(() => {
  if (rejectToken === 0) return;
  void controls.start({
    x: [0, -5, 5, -3.5, 3.5, 0],
    transition: { duration: 0.34, ease: 'easeInOut' },
  });
}, [rejectToken, controls]);
```

駒には `initial={{ scale: 0, rotate: -22 }}` / `animate={{ scale: 1, rotate: 0 }}` /
`exit={{ scale: 0, opacity: 0, transition: { duration: 0.12 } }}` /
`transition={{ type: 'spring', stiffness: 620, damping: 20, mass: 0.7 }}` を
`AnimatePresence`（`initial={false}`）で付ける。

- [ ] **Step 2: Game を作る**

`src/ui/Game.tsx`。要点:

```tsx
/**
 * 1ステージの統括。engine への呼び出しはこのファイルに集約し、Board は座標と
 * 描画だけを持つ。「置けるかどうか」を UI 側で判定しない — placeAnimal /
 * moveAnimal が状態を変えたかどうかだけで判断する（engine と二重管理しない）。
 */
export function Game({ stage, hasNext, onBack, onNext, onList }: Props) {
  const [state, setState] = useState(() => createGameState(stage));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectToken, setRejectToken] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const violatingIds = new Set(violatingAnimals(state).map((a) => a.instanceId));
  const cleared = isStageCleared(state);

  /** 選択中の駒が実際に置けるアンカーを engine に総当たりで聞く。 */
  const validAnchors = useMemo(() => {
    const set = new Set<string>();
    if (!selectedId) return set;
    const onBoard = state.placed.some((p) => p.instanceId === selectedId);
    const put = onBoard ? moveAnimal : placeAnimal;
    for (let r = 0; r < stage.rows; r++) {
      for (let c = 0; c < stage.cols; c++) {
        if (put(state, selectedId, { r, c }) !== state) set.add(posKey({ r, c }));
      }
    }
    return set;
  }, [selectedId, state, stage.rows, stage.cols]);

  const tryPlace = (anchor: Pos) => {
    if (!selectedId) return;
    const onBoard = state.placed.some((p) => p.instanceId === selectedId);
    const next = (onBoard ? moveAnimal : placeAnimal)(state, selectedId, anchor);
    if (next === state) {
      setRejectToken((t) => t + 1);
      sfx.reject();
      vibrate([12, 40, 12]);
      return;
    }
    setState(next);
    setSelectedId(null);
    sfx.place();
    vibrate(8);
  };
  // ...
}
```

盤面のサイズは `stage.rows * stage.cols` に対して総当たりするが、最大 8×8 = 64 回の
`placeAnimal` 呼び出しで済むため、`useMemo` があれば十分に速い。

画面構成:

```
<div className="app">
  <header className="header">   ← / ステージ名 / 進捗 n/m / やり直し・音
  <Board ... />
  <AnimalCards ... />           ← Task 10
  {cleared && <ClearOverlay ... />}  ← Task 12
</div>
```

- [ ] **Step 3: App からゲーム画面を出す**

`src/App.tsx` をルータに繋ぐ。

```tsx
export function App() {
  const route = useRoute();
  if (route.name === 'game') {
    const stage = getStage(route.stageId);
    if (!stage) return <NotFound />;
    return <Game stage={stage} ... />;
  }
  // 他のルートは Task 13-15 で埋める。それまでは仮の一覧を出す。
}
```

カスタムステージ（`custom-` で始まる ID）は `getCustomStage` から非同期に読むため、
`useState` + `useEffect` で読み込み中の表示を挟む。

- [ ] **Step 4: ブラウザで通しで遊べることを確かめる（合格判定）**

preview_start でアプリを開き、`#/game/stage-1` に移動して次を確認する。

1. 動物カードをタップすると、置けるマスにドットが出る
2. ドットの出たマスをタップすると駒が置かれ、バネで pop する
3. ドットの無いマスをタップすると盤が左右に振れる
4. 置いた駒をタップすると選択され、別のマスに置き直せる
5. **配置した直後（アニメーション中）に駒をタップしても掴める** — 旧実装の不具合の再現確認
6. 駒を置いた前後で `.cell` の矩形が変わらない（Task 6 の javascript_tool を再実行）
7. read_console_messages でエラーが 0 件

- [ ] **Step 5: 型検査とテストを通してコミット**

Run: `npm run typecheck && npm test`
Expected: 型エラー 0、`259 passed`

```bash
git add -A
git commit -m "ゲーム画面をタップ選択→タップ配置で作り直す"
```

---

## Task 9: ドラッグ操作

タップと共存させる。閾値 7px でタップとドラッグを分け、盤の矩形から毎回セルを計算する。

**Files:**
- Modify: `src/ui/Board.tsx`
- Modify: `src/ui/Game.tsx`
- Modify: `src/ui/AnimalCards.tsx`（Task 10 の後に着手する場合はそちらで対応）
- Modify: `src/ui/styles.css`

- [ ] **Step 1: 盤面に useDrag を付ける**

`@use-gesture/react` の `useDrag` を **`.grid` に 1 つだけ**付ける。駒ごとに付けない
（駒ごとだと入れ子のイベント奪い合いが起き、これが旧実装で掴めなくなる一因だった）。

```tsx
/** この距離を超えて指が動いたらタップではなくドラッグとみなす。
 *  小さすぎると普通のタップが誤ってドラッグになり、大きすぎると掴み始めが鈍る。 */
const DRAG_THRESHOLD = 7;

/** つかんだ駒と、つかんだ瞬間のその駒の左上（画面座標）。 */
const grabbed = useRef<{ instanceId: string; left: number; top: number } | null>(null);
const originCell = useRef<Pos | null>(null);
const dragging = useRef(false);

const bind = useDrag(
  ({ xy: [x, y], movement: [mx, my], first, last }) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (first) {
      const pos = cellFromPoint(rect, rows, cols, x, y);
      originCell.current = pos;
      const piece = pos ? pieceCovering(placed, pos) : null;
      grabbed.current = piece
        ? {
            instanceId: piece.instanceId,
            // 駒の左上は、つまんだ場所ではなくアンカーのマスから出す。
            // こうすると 2x2 の駒をどこでつまんでも狙いがずれない。
            left: rect.left + piece.anchor.c * (cellSize(rect, cols) + GAP),
            top: rect.top + piece.anchor.r * (cellSize(rect, cols) + GAP),
          }
        : null;
      dragging.current = false;
      return;
    }

    if (!dragging.current && Math.hypot(mx, my) > DRAG_THRESHOLD) {
      dragging.current = true;
      if (grabbed.current) onDragStart(grabbed.current.instanceId);
    }

    if (dragging.current && grabbed.current) {
      // 動かすのは transform だけ。left/top には触らないのでレイアウトが走らない。
      onDragMove(mx, my);
    }

    if (last) {
      if (!dragging.current) {
        // 指が動かなかった＝タップ。Task 8 の経路に流す。
        if (grabbed.current) onPiecePress(grabbed.current.instanceId);
        else if (originCell.current) onCellPress(originCell.current);
      } else if (grabbed.current) {
        const anchor = anchorFromPiecePoint(
          rect,
          grabbed.current.left + mx,
          grabbed.current.top + my,
          cols
        );
        onDragEnd(grabbed.current.instanceId, anchor);
      }
      dragging.current = false;
      grabbed.current = null;
      originCell.current = null;
    }
  },
  { pointer: { touch: true }, filterTaps: false }
);
```

`pieceCovering(placed, pos)` は「そのマスを覆っている駒」を返す小さなヘルパー。
アンカーのマスだけでなく `animal.cells` を見る（2x2 の駒はどのマスをつかんでも掴める）。

`onDragEnd(instanceId, anchor)` は Task 8 の `tryPlace` にそのまま渡す。置けなければ
`tryPlace` が却下の揺れを出し、`transform` は 0 に戻ってバネで元位置へ帰る。

- [ ] **Step 2: 動物カードからのドラッグ**

カード側の駒にも `useDrag` を付け、ドラッグ中は画面全体を覆う固定レイヤーに
駒の複製を描いて指に追従させる。離した座標が盤の矩形内なら `anchorFromPiecePoint`、
外ならトレイに戻す。

追従レイヤーは `position: fixed; pointer-events: none; z-index: 50` にする。

- [ ] **Step 3: ブラウザで確認する（合格判定）**

1. カードから盤面へドラッグして置ける
2. 盤面の駒をドラッグして動かせる
3. **7px 未満の指の揺れではタップとして扱われる**（カードを軽く叩いて選択できる）
4. 置けない場所で離すと駒が元に戻り、盤が振れる
5. 盤の外で離すとトレイに戻る
6. **ページをスクロールさせてからドラッグしてもずれない** — window.scrollBy で
   200px スクロールしてからドラッグして確認する。旧実装が壊れていた条件
7. resize_window で mobile / tablet / desktop に切り替えても 1〜6 が成立する

- [ ] **Step 4: コミット**

```bash
git add -A
git commit -m "ドラッグ操作を追加する（7px閾値・盤の矩形から毎回スナップ）"
```

---

## Task 10: 動物カード列（トレイ＝条件）

**Files:**
- Create: `src/ui/AnimalCards.tsx`
- Modify: `src/ui/styles.css`
- Modify: `src/ui/Game.tsx`

**Interfaces:**
- Consumes: `conditionsFor`, `isSpeciesConditionSatisfied`, `isStageRuleSatisfied`, `type GameState`, `type Species` from `@/engine`、`conditionText`, `stageRuleText` from `@/lib/condition-text`、`speciesLabel` from `@/art/palette`、`Piece` from `@/ui/Piece`
- Produces: `AnimalCards({ state, selectedId, onSelectSpecies }): JSX.Element`

1 枚のカードに、種の情報をすべて入れる。

```
[駒] ライオン ×2   ○ リスのとなりに置けない
[駒] リス    ×1   ✗ ライオンのとなりに置けない
```

- [ ] **Step 1: カードを作る**

- 残数 = `state.tray.filter(a => a.species === sp).length`
- 残数 0 のカードは `data-dimmed`。**消さない**（条件は最後まで見え続ける必要がある）
- 条件の文言は `conditionText` をそのまま使う
- 達成状況は `isSpeciesConditionSatisfied(state, sp, c)` を ○ / ✗ で
- 違反中の種はカードを赤くする。**盤上の赤い駒とカードの赤が対応**する
- カードをタップ = その種の未配置の駒を 1 つ選択（無ければ何もしない）
- `stage.rules` があれば末尾に「このステージのやくそく」カードを 1 枚足す

- [ ] **Step 2: CSS**

```css
.cards {
  width: min(92vw, 460px);
  display: grid;
  gap: 6px;
}

.card {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 0;
  border-radius: 12px;
  background: var(--pill-bg);
  color: var(--pill-fg);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 0.14s var(--ease), background-color 0.14s var(--ease);
}

.card:active { transform: scale(0.98); }
.card[data-selected='true'] { outline: 2px solid var(--accent); outline-offset: -2px; }
.card[data-violating='true'] { background: #fbe9e7; color: #a2352d; }
.card[data-dimmed='true'] { opacity: 0.55; }

/* カードの中の駒は盤面のセルと同じ見た目にする（つまんだ瞬間に姿が変わらない） */
.card .piece { --cell: 30px; --gap: 3px; }
```

- [ ] **Step 3: ブラウザで確認する（合格判定）**

1. `stage-1`〜`stage-40` のうち 6 種・8 種のステージで、カード列が縦スクロールなしに
   収まる（モバイル 375px 幅）
2. 駒を置くと ○ / ✗ がその場で切り替わる
3. 条件違反の駒を置くと、盤上の駒とカードが**同じ赤**になる
4. 残数が 0 になってもカードが消えず、条件が読める

- [ ] **Step 4: コミット**

```bash
git add -A
git commit -m "トレイと条件パネルを1つの動物カード列に統合する"
```

---

## Task 11: 効果音と触覚

**Files:**
- Create: `src/core/sfx.ts`
- Create: `src/ui/icons.tsx`
- Modify: `src/ui/Game.tsx`, `src/ui/styles.css`

**Interfaces:**
- Produces: `sfx: { select(): void; place(): void; reject(): void; clear(): void }`、`vibrate(pattern: number | number[]): void`、`isMuted(): boolean`、`setMuted(v: boolean): void`、`SoundIcon({ muted })`, `BackIcon()`, `ResetIcon()`

- [ ] **Step 1: sfx.ts を作る**

```ts
/**
 * 効果音は WebAudio で合成する。音声ファイルは持たない
 * （読み込みゼロ・容量ゼロ・遅延ゼロ）。
 */
const MUTE_KEY = 'animal-puzzle:muted';

let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  /* 読めなくても既定の「鳴らす」で続行する */
}

export const isMuted = (): boolean => muted;

export const setMuted = (v: boolean): void => {
  muted = v;
  try {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0');
  } catch {
    /* 保存できなくてもこのセッションでは効く */
  }
};

/** AudioContext は最初のユーザー操作まで作らない（自動再生ポリシー対策）。 */
const audio = (): AudioContext | null => {
  if (muted) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

type Tone = {
  freq: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  /** 指定すると freq からここへ滑らせる。 */
  to?: number;
};

const play = (tones: Tone[]): void => {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  for (const t of tones) {
    const at = now + (t.delay ?? 0);
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = t.type ?? 'sine';
    osc.frequency.setValueAtTime(t.freq, at);
    if (t.to !== undefined) osc.frequency.exponentialRampToValueAtTime(t.to, at + t.dur);
    // 立ち上がりを 8ms 入れないとプチッというクリックノイズが乗る
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(t.gain ?? 0.16, at + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + t.dur);
    osc.connect(amp).connect(ac.destination);
    osc.start(at);
    osc.stop(at + t.dur + 0.02);
  }
};

export const sfx = {
  /** 選択。軽く短いクリック。 */
  select: () => play([{ freq: 880, dur: 0.05, type: 'triangle', gain: 0.09 }]),
  /** 配置。木質のポン。 */
  place: () => play([{ freq: 320, to: 180, dur: 0.13, type: 'triangle', gain: 0.2 }]),
  /** 却下。低い2音。 */
  reject: () =>
    play([
      { freq: 200, dur: 0.09, type: 'square', gain: 0.09 },
      { freq: 150, dur: 0.12, type: 'square', gain: 0.09, delay: 0.1 },
    ]),
  /** クリア。上行アルペジオ。 */
  clear: () =>
    play([523.25, 659.25, 783.99, 1046.5].map((freq, i) => ({
      freq,
      dur: 0.26,
      type: 'triangle' as OscillatorType,
      gain: 0.14,
      delay: i * 0.09,
    }))),
};

/** モバイルでの手応え。対応していない環境では何も起きない。 */
export const vibrate = (pattern: number | number[]): void => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* 環境によっては例外が飛ぶ */
  }
};
```

- [ ] **Step 2: ヘッダのアイコンを作る**

`src/ui/icons.tsx` に `SoundIcon({ muted })` / `BackIcon()` / `ResetIcon()` /
`HelpIcon()` を SVG で描く。参考アプリの `icons.tsx` と同じ方針
（PNG を持ってこず、同じ色調・同じ線の太さで自前の SVG に描き起こす）。
丸ボタンの地は `var(--accent)`、線は白。

- [ ] **Step 3: 繋いで確認する**

Game のヘッダにミュートボタンを置き、選択・配置・却下・クリアで音が鳴ること、
ミュートすると鳴らず、再読み込みしてもミュートが保たれることを確認する。

- [ ] **Step 4: コミット**

```bash
git add -A
git commit -m "効果音をWebAudioで合成し、触覚とミュートを追加する"
```

---

## Task 12: クリア演出

**Files:**
- Create: `src/ui/ClearOverlay.tsx`
- Modify: `src/ui/Board.tsx`（クリア時に駒が跳ねる）
- Modify: `src/ui/Game.tsx`, `src/ui/styles.css`
- Delete: `src/components/confetti.tsx` は Task 1 で削除済み

- [ ] **Step 1: 駒が順に跳ねるようにする**

`Board` が `won` を受け取り、置いた順に遅延して跳ねる。

```tsx
useEffect(() => {
  if (!won) return;
  void controls.start({
    y: [0, -13, 0],
    transition: { delay: order * 0.08, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
  });
}, [won, order, controls]);
```

`order` は `state.placed` の並び順（＝置いた順）をそのまま使う。

- [ ] **Step 2: オーバーレイを作る**

参考アプリと同じ形。

```css
.overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(246 245 239 / 0.66);
  backdrop-filter: blur(3px);
  z-index: 10;
}

.overlay-card {
  background: var(--surface);
  border-radius: 22px;
  padding: 28px 34px 30px;
  text-align: center;
  box-shadow: 0 18px 50px rgb(115 80 86 / 0.16);
  display: grid;
  gap: 6px;
  justify-items: center;
  min-width: 258px;
}

.overlay-btn {
  border: 0;
  border-radius: 999px;
  padding: 11px 30px;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: var(--accent);
  cursor: pointer;
  transition: transform 0.15s var(--ease), background-color 0.15s var(--ease);
}

.overlay-btn:active { transform: scale(0.94); }
```

ボタンは「つぎのステージ」「もういちど」「一覧へ」。

**閉じるアニメーション中にクリックを吸わせない。**

```tsx
exit={{ opacity: 0, pointerEvents: 'none' }}
```

オーバーレイが出るのは駒の跳ねが終わってからにする（`delay: placed.length * 0.08 + 0.4`）。
`recordClear(stage.id)` はクリアを検知した時点で 1 回だけ呼ぶ。

- [ ] **Step 3: reduced motion に対応する**

```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

Motion 側は `useReducedMotion()` で遅延と跳ねを 0 にする。

- [ ] **Step 4: ブラウザで確認する（合格判定）**

1. `stage-1` を解いて、駒が順に跳ねてからオーバーレイが出る
2. 「つぎのステージ」で stage-2 に進む
3. 「もういちど」で盤面が初期状態に戻る
4. 一覧に戻ると stage-1 がクリア済みになっている
5. **オーバーレイが消える最中に下のカードを押しても反応しない**

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "クリア演出を作り直す（駒が順に跳ねてからオーバーレイ）"
```

---

## Task 13: ステージ一覧

**Files:**
- Create: `src/ui/StageSelect.tsx`
- Modify: `src/App.tsx`, `src/ui/styles.css`

**Interfaces:**
- Consumes: `CHAPTERS`, `getStage`, `STAGES` from `@/levels/stages`、`loadProgress` from `@/storage/progress`、`navigate` from `@/core/router`
- Produces: `StageSelect(): JSX.Element`

- [ ] **Step 1: 番号タイルのグリッドで組む**

- ヘッダ: タイトル「動物パズル」／進捗ピル（`12 / 40`）／音のオンオフ
- 章ごとに見出し＋**4 列の番号タイル**
- クリア済みは塗りつぶし＋✓、未クリアは白抜き
- 末尾に「マイステージ / ステージを作る」

```css
.tiles {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.tile {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow-xs);
  color: var(--pill-fg);
  font: inherit;
  font-size: 17px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: transform 0.14s var(--ease);
}

.tile:active { transform: scale(0.94); }

.tile[data-cleared='true'] {
  background: var(--accent);
  color: #fff;
}
```

- [ ] **Step 2: ブラウザで確認する**

1. 40 面が 4 章に分かれて並び、モバイル幅でスクロールが 2 画面以内に収まる
2. タイルを押すとそのステージが開く
3. クリア済みのタイルが塗られている
4. 進捗ピルの数がクリア数と一致する

- [ ] **Step 3: コミット**

```bash
git add -A
git commit -m "ステージ一覧を番号タイルのグリッドに作り直す"
```

---

## Task 14: マイステージ

**Files:**
- Create: `src/ui/MyStages.tsx`
- Modify: `src/App.tsx`, `src/ui/styles.css`
- Reference: 旧 `src/app/my-stages.tsx`。Task 1 で削除済みなので `git show d22a4d0:src/app/my-stages.tsx` で中身を取り出す

機能は現状のまま維持する。

- カスタムステージの一覧・削除（確認ダイアログ付き）
- 「エディタで作る」への導線
- GitHub Issue への投稿（`buildSubmissionIssueUrl` + `window.open`）

`Linking.openURL` は `window.open(url, '_blank', 'noopener')` に置き換える。

- [ ] **Step 1: 画面を作る**
- [ ] **Step 2: ブラウザで確認する** — 保存 → 一覧に出る → 遊べる → 消せる、の一周
- [ ] **Step 3: コミット**

```bash
git add -A
git commit -m "マイステージ画面を新しいトークンで作り直す"
```

---

## Task 15: エディタ

**Files:**
- Create: `src/ui/Editor.tsx`
- Modify: `src/App.tsx`, `src/ui/styles.css`
- Reference: 旧 `src/app/editor.tsx`。Task 1 で削除済みなので `git show d22a4d0:src/app/editor.tsx` で中身を取り出す

機能は現状のまま維持し、見た目と操作だけ差し替える。

- 盤面サイズ（5〜8）の増減
- 地形のペイント（平地 / 壁 / 水 / 木）— **ドラッグで塗れるようにする**
- 種ごとの駒数の増減（上限 `MAX_ANIMALS_PER_STAGE`）
- `validateStage` / `countSolutions` / `countGeometricPlacements` / `findDesignWarnings` による検査
- 保存（`saveCustomStage`）と Issue への投稿

`TextInput` は `<input>` に置き換える。

- [ ] **Step 1: 画面を作る**
- [ ] **Step 2: ブラウザで確認する** — 5×5 の盤面を作り、唯一解チェックが通り、保存でき、マイステージから遊べること
- [ ] **Step 3: コミット**

```bash
git add -A
git commit -m "エディタ画面を新しいトークンで作り直す"
```

---

## Task 16: 後始末とデプロイ

**Files:**
- Create: `scripts/deploy.mjs`
- Modify: `AGENTS.md`
- Modify: `README.md`
- Create: `public/favicon.svg`
- Delete: `assets/`, `src/components/`（残っていれば）

- [ ] **Step 1: deploy スクリプトを作る**

参考アプリの `scripts/deploy.mjs` をそのまま持ってくる。`dist/` を使い捨ての
リポジトリにして `gh-pages` へ orphan commit を 1 つ force push する。

**`.nojekyll` を必ず書き出す。** GitHub Pages は Jekyll を既定で走らせ、`_` で
始まるファイル・ディレクトリを黙って除外する。これが無いと JS バンドルが 404 になり、
CDN のキャッシュ不具合とそっくりの症状（「ファイルはあるのに 404」）に見える。
2026-09-03 にキャッシュだと誤診してビルドマーカーのハッシュをいじり、
何も直らなかった前例がある。

- [ ] **Step 2: アイコンを差し替える**

`public/favicon.svg` を、新しいシルエットを使ったフラットなアイコンとして作る。
`index.html` から参照する。旧 `assets/` は削除する。

Run: `rm -rf assets src/components`

- [ ] **Step 3: AGENTS.md を書き換える**

Expo 前提の手順（`npx expo export -p web`、`dist/404.html` のコピー）を
Vite + ハッシュルーティングの手順に置き換える。

```markdown
# Deploy

コードを直したら（テスト・型検査が緑になったら）、言われる前にコミットして反映する。

1. 変更をコミットして `master` に push する（公開ビルドの元）
2. `npm run deploy`（= `tsc --noEmit && vite build && node scripts/deploy.mjs`）
3. 反映されたことを確かめる: `curl -sI` で実際の `assets/*.js` を叩いて 200 を確認する
   （`index.html` は Jekyll が触らないので、それだけでは判定にならない）

ハッシュルーティング（`#/game/stage-1`）なので、404.html のフォールバックは不要。

Live URL: https://masato-masa.github.io/animal-puzzle/
```

`# Expo HAS CHANGED` の節は削除する。

- [ ] **Step 4: README を書き換える**

create-expo-app の定型文を、この構成の説明に置き換える。

- [ ] **Step 5: 全部通す**

Run: `npm run typecheck && npm test && npm run build`
Expected: 型エラー 0、`259 passed`、ビルド成功

- [ ] **Step 6: デプロイして実物を確かめる**

Run: `npm run deploy`

その後、preview_start で `https://masato-masa.github.io/animal-puzzle/` を開き、
**設計書 §14 の検証項目 7 つをすべて実行する。**

1. 盤面が動かない（駒の出し入れ 20 回でセルの矩形が不変）
2. 11 種のシルエットがグレースケールで区別できる
3. 8 種が同時に出るステージで色が混乱しない
4. 置いた駒を必ず動かせる（アニメーション中に掴んでも掴める）
5. スクロール後にドラッグしてもずれない
6. 縦長・横長・正方形の 3 形状が画面に収まる
7. モバイル幅 375px で盤面とカード列が縦スクロールなしに収まる

`curl -sI` で `assets/*.js` が 200 を返すことも確認する。

- [ ] **Step 7: コミット**

```bash
git add -A
git commit -m "デプロイ手順をVite構成に更新し、Expoの残骸を片付ける"
git push origin master
```

---

## 完了の判定

- `npm test` が `259 passed`（既存 223 + storage 10 + geometry 16 + router 10）
- `npm run typecheck` が型エラー 0
- 公開版で設計書 §14 の検証項目 7 つがすべて成立
- `assets/images/{animals,terrain,fence}`（21 ファイル・2.7MB）が消えている
- `src/theme.ts` / `src/lib/animal-art.ts` / `src/app/` / `src/components/` が消えている
- react-native / expo への依存が `package.json` に残っていない

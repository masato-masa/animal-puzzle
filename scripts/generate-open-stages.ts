/**
 * 「開けた盤面 + animalRules（動物1種につきルール1つ）」方式の新しいステージ生成器。
 * 壁で1本道を作って正解を強制する旧方式(scripts/generate-stages.ts)とは異なり、
 * 壁をほとんど使わない開けた土地(幾何学的な置き方が多数存在する)を用意し、
 * 唯一解への絞り込みを完全に動物ごとのルール(SpeciesCondition、旧StageRuleの
 * 語彙も含む)だけで行う。2026-09-04のセッションでstage-11/12/13を手作業で
 * 組んだ際に確立した設計原則をランダム探索で自動化したもの。
 */
import {
  SPECIES,
  SHAPES,
  validateStage,
  countGeometricPlacements,
  countSolutions,
  solverLevel,
  countRuleMoves,
  MAX_ANIMALS_PER_STAGE,
} from '@/engine';
import type { AnimalInstance, CellTerrain, Species, ShapeKey, SpeciesCondition, SolverLevel, Stage } from '@/engine';
import { findDesignWarnings } from '@/lib/stage-design-checks';

const rand = (n: number): number => Math.floor(Math.random() * n);
const choice = <T,>(arr: readonly T[]): T => arr[rand(arr.length)];
const shuffle = <T,>(arr: T[]): T[] => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const ALL_SPECIES = Object.keys(SPECIES) as Species[];
/** 自己参照系ルール(自分自身の種を対象にできる)。2体以上いないと意味が無いので、
 * これらを候補にするのは同種を2体以上使う場合のみ。 */
const SELF_REFERENTIAL_KINDS = ['adjacentForbidden', 'diagonalForbidden', 'surroundForbidden', 'flockRequired'] as const;

// --- 開けた地形の生成 -------------------------------------------------

type Grid = CellTerrain[][];

const neighbors4 = (r: number, c: number): Array<[number, number]> => [
  [r - 1, c],
  [r + 1, c],
  [r, c - 1],
  [r, c + 1],
];

const isConnected = (grid: Grid, rows: number, cols: number): boolean => {
  const land: Array<[number, number]> = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c] === 'land') land.push([r, c]);
  if (land.length === 0) return true;
  const seen = new Set<string>();
  const stack = [land[0]];
  seen.add(`${land[0][0]},${land[0][1]}`);
  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    for (const [nr, nc] of neighbors4(r, c)) {
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (grid[nr][nc] !== 'land') continue;
      const key = `${nr},${nc}`;
      if (seen.has(key)) continue;
      seen.add(key);
      stack.push([nr, nc]);
    }
  }
  return seen.size === land.length;
};

/**
 * rows x colsの全面land状態から、connectivityを保ったままtargetLand枚まで
 * ランダムに間引く。境界(壁/盤外に接するマス)を優先して削るので、
 * 通路が1本道になるような削り方は連結性チェックで自然に弾かれる。
 */
const carveOpenTerrain = (rows: number, cols: number, targetLand: number): Grid => {
  const grid: Grid = Array.from({ length: rows }, () => Array<CellTerrain>(cols).fill('land'));
  let landCount = rows * cols;
  let guard = 0;
  while (landCount > targetLand && guard < 2000) {
    guard++;
    const r = rand(rows);
    const c = rand(cols);
    if (grid[r][c] !== 'land') continue;
    grid[r][c] = 'wall';
    if (!isConnected(grid, rows, cols)) {
      grid[r][c] = 'land';
      continue;
    }
    landCount--;
  }
  return grid;
};

/**
 * [start,end]の範囲(0-indexed)をsize未満にならないよう、originalSizeの範囲内で
 * 外側に広げる。駒数の少ない入門ステージでは外接矩形が5未満に潰れがちだが、
 * 5x5盤面は壁ふちがあってもstage-design-checks.tsの対象外(rows/cols>5のときだけ
 * 判定する仕様)なので、5まで広げ戻せば安全に使える。
 */
const clampRange = (start: number, end: number, size: number, originalSize: number): [number, number] => {
  let s = start;
  let e = end;
  while (e - s + 1 < size) {
    if (s > 0) s--;
    else if (e < originalSize - 1) e++;
    else break;
  }
  return [s, e];
};

/**
 * 全マスが壁(land/water/tree以外)の行・列を盤の端から取り除き、盤面をぴったりの
 * サイズに詰める(stage-design-checks.tsの「全て壁の行/列」警告を生成時点で避けるため)。
 * 詰めた結果が5未満になる軸は、5x5盤面が壁ふちを許容する仕様を利用して5まで
 * 広げ戻す(駒数の少ない入門ステージで外接矩形が小さくなりすぎて全滅していた
 * 問題の対策)。8を超える場合のみnullを返す(5x5〜8x8の範囲外)。
 */
const cropToBoundingBox = (grid: Grid): { grid: Grid; rows: number; cols: number } | null => {
  const rows = grid.length;
  const cols = grid[0].length;
  const isOccupied = (r: number, c: number) => grid[r][c] !== 'wall';
  let top = 0;
  while (top < rows && !Array.from({ length: cols }, (_, c) => isOccupied(top, c)).some(Boolean)) top++;
  let bottom = rows - 1;
  while (bottom >= top && !Array.from({ length: cols }, (_, c) => isOccupied(bottom, c)).some(Boolean)) bottom--;
  let left = 0;
  while (left < cols && !Array.from({ length: rows }, (_, r) => isOccupied(r, left)).some(Boolean)) left++;
  let right = cols - 1;
  while (right >= left && !Array.from({ length: rows }, (_, r) => isOccupied(r, right)).some(Boolean)) right--;
  if (bottom < top || right < left) return null;
  if (bottom - top + 1 < 5) [top, bottom] = clampRange(top, bottom, 5, rows);
  if (right - left + 1 < 5) [left, right] = clampRange(left, right, 5, cols);
  const newRows = bottom - top + 1;
  const newCols = right - left + 1;
  if (newRows < 5 || newRows > 8 || newCols < 5 || newCols > 8) return null;
  const cropped: Grid = [];
  for (let r = top; r <= bottom; r++) cropped.push(grid[r].slice(left, right + 1));
  return { grid: cropped, rows: newRows, cols: newCols };
};

/** 開けた土地に隣接する壁マスを1つ選んでwater/treeに変える(ブロック種条件用)。 */
const addAdjacentBlock = (grid: Grid, rows: number, cols: number, block: 'water' | 'tree'): boolean => {
  const candidates: Array<[number, number]> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 'wall') continue;
      const touchesLand = neighbors4(r, c).some(
        ([nr, nc]) => nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 'land'
      );
      if (touchesLand) candidates.push([r, c]);
    }
  }
  if (candidates.length === 0) return false;
  const [r, c] = choice(candidates);
  grid[r][c] = block;
  return true;
};

// --- 動物構成の選択 -----------------------------------------------------

type PieceSpec = { species: Species; count: number };

export type GenerateOptions = {
  /** ステージに登場させる種の数の範囲(両端含む)。既定は4〜6種類。 */
  minSpecies?: number;
  maxSpecies?: number;
  /** ステージ全体の駒数の上限。既定はMAX_ANIMALS_PER_STAGE(8)。入門ステージ用に2〜3に絞れる。 */
  maxPieces?: number;
  /** 自己参照系(lion/leopardの自己回避、rhinoの自己距離、monkeyの群れ)を持てる種を
   * count=2で選ぶ確率を上げる。通常はcount=2になりにくいため、対称駒ならではの
   * 背理法パズルを狙って作りたいときに使う。 */
  selfReferentialBoost?: boolean;
  /** 盤面サイズを必要マス数ぎりぎりではなく、範囲内でより大きい方に寄せる
   * (見た目の変化・盤面サイズのバリエーションを出すため)。 */
  preferLargeBoard?: boolean;
  /** ルールを付ける前に要求する幾何学的な置き方の下限。既定5。駒数2〜3の
   * 入門ステージは土地が小さく必然的にこの数が少なくなるため下げられるようにする。 */
  minGeometricPlacements?: number;
};

const SELF_REFERENTIAL_CAPABLE = new Set<Species>(['lion', 'leopard', 'rhino', 'monkey']);

const pickRoster = (opts: GenerateOptions): PieceSpec[] => {
  const speciesPool = shuffle(ALL_SPECIES);
  const roster: PieceSpec[] = [];
  let totalPieces = 0;
  const minSpecies = opts.minSpecies ?? 4;
  const maxSpecies = opts.maxSpecies ?? 6;
  const pieceBudget = opts.maxPieces ?? MAX_ANIMALS_PER_STAGE;
  const targetSpeciesCount = minSpecies + rand(Math.max(maxSpecies - minSpecies + 1, 1));
  for (const species of speciesPool) {
    if (roster.length >= targetSpeciesCount) break;
    if (totalPieces >= pieceBudget) break;
    const canDouble = totalPieces + 2 <= pieceBudget;
    let count = 1;
    if (canDouble) {
      // flockRequiredを使う予定が無くても、種の多様性のためにcount=1か2をランダムに選ぶ。
      // selfReferentialBoostが立っていれば、自己参照ルールを持てる種(lion/leopard/rhino/monkey)を
      // 積極的に2体にして、対称駒どうしの背理法パズルを狙う。
      if (opts.selfReferentialBoost && SELF_REFERENTIAL_CAPABLE.has(species) && rand(3) > 0) count = 2;
      else count = 1 + rand(2);
    }
    roster.push({ species, count });
    totalPieces += count;
  }
  return roster;
};

const totalCells = (roster: PieceSpec[]): number =>
  roster.reduce((sum, p) => sum + SHAPES[SPECIES[p.species].shape as ShapeKey].length, 0);

let uid = 0;
const buildAnimals = (roster: PieceSpec[]): AnimalInstance[] => {
  const list: AnimalInstance[] = [];
  for (const { species, count } of roster) {
    for (let i = 0; i < count; i++) list.push({ instanceId: `${species}-${uid++}`, species });
  }
  return list;
};

// --- ルール候補の生成 -----------------------------------------------------

const RELATIONAL_KINDS = [
  'adjacentForbidden',
  'adjacentRequired',
  'diagonalForbidden',
  'surroundForbidden',
  'sameRow',
  'sameCol',
  'differentRow',
  'differentCol',
  'above',
  'below',
  'leftOf',
  'rightOf',
] as const;

const candidateRulesFor = (
  species: Species,
  count: number,
  otherSpeciesInStage: Species[],
  blocksAvailable: Array<'water' | 'tree'>
): SpeciesCondition[] => {
  const out: SpeciesCondition[] = [];
  for (const target of otherSpeciesInStage) {
    for (const kind of RELATIONAL_KINDS) {
      out.push({ kind, with: target } as SpeciesCondition);
    }
    out.push({ kind: 'exactDistance', with: target, distance: 1 });
    out.push({ kind: 'exactDistance', with: target, distance: 2 });
    out.push({ kind: 'exactDistance', with: target, distance: 3 });
    out.push({ kind: 'minDistance', from: target, distance: 2 });
    out.push({ kind: 'minDistance', from: target, distance: 3 });
  }
  if (count >= 2) {
    for (const kind of SELF_REFERENTIAL_KINDS) {
      out.push(kind === 'flockRequired' ? { kind: 'flockRequired' } : ({ kind, with: species } as SpeciesCondition));
    }
    out.push({ kind: 'minDistance', from: species, distance: 2 });
  }
  for (const block of blocksAvailable) {
    out.push({ kind: 'blockAdjacentRequired', block });
  }
  return shuffle(out);
};

// --- ステージ1つの探索 -----------------------------------------------------

export type GeneratedStage = { stage: Stage; level: SolverLevel; ruleMoves: number; geometricPlacements: number };

/**
 * 必要マス数(cells)に対して、削りすぎても外接矩形が5未満に潰れない程度の
 * rows/colsをランダムに選ぶ。盤全体(rows*cols)が必要マス数よりずっと大きいと、
 * carveOpenTerrainで間引いた後の外接矩形が5x5〜8x8の範囲外に潰れてしまう
 * (実測: 対策前は成功率が244件→8件まで落ち込んだ)ため、面積が必要マス数の
 * 1.6倍以内に収まる5〜8角形の組み合わせだけを候補にする。
 */
/**
 * preferLargeを試した結果、盤面はcropToBoundingBoxで必ず外接矩形に詰められるため、
 * 「大きい入れ物を選ぶ」だけでは最終盤面は大きくならない(むしろ間引きすぎて5x5に
 * 戻るだけで成功率だけ落ちる)ことが判明した。最終盤面の広さはMAX_ANIMALS_PER_STAGE(8)
 * が課す必要マス数の上限で本質的に頭打ちなので、preferLargeは「同じ必要マス数の中で
 * 比較的面積に余裕のある候補」を弱く優先する程度にとどめる。
 */
const pickBoardSize = (cells: number, preferLarge = false): { rows: number; cols: number } | null => {
  const candidates: Array<{ rows: number; cols: number }> = [];
  const ratio = preferLarge ? 2.2 : 1.6;
  for (let r = 5; r <= 8; r++) {
    for (let c = 5; c <= 8; c++) {
      const area = r * c;
      // 最小盤面(5x5=25)より必要マス数が多い場合、面積は必要マス数以上である必要がある。
      // 上限は「必要マス数のratio倍」または「最小盤面の面積」の大きい方(5x5自体は
      // 常に候補に残す。5x5は壁ふちがあっても仕様上デザイン警告の対象外なので安全)。
      if (area < cells) continue;
      if (area > Math.max(cells * ratio, 25)) continue;
      candidates.push({ rows: r, cols: c });
    }
  }
  if (candidates.length === 0) return null;
  if (preferLarge) {
    const sorted = [...candidates].sort((a, b) => b.rows * b.cols - a.rows * a.cols);
    return choice(sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2))));
  }
  return choice(candidates);
};

const DEBUG = process.env.GEN_DEBUG === '1';
const dbg = (reason: string) => {
  if (DEBUG) console.log('reject:', reason);
};

const buildStageAttempt = (opts: GenerateOptions): GeneratedStage | null => {
  const roster = pickRoster(opts);
  const cells = totalCells(roster);
  const size = pickBoardSize(cells, opts.preferLargeBoard);
  if (!size) {
    dbg('no board size for cells=' + cells);
    return null;
  }
  const { rows, cols } = size;

  const grid = carveOpenTerrain(rows, cols, cells);

  const species = roster.map((p) => p.species);
  const blocksAvailable: Array<'water' | 'tree'> = [];
  if (species.includes('crocodile') && addAdjacentBlock(grid, rows, cols, 'water')) blocksAvailable.push('water');
  if (species.includes('gorilla') && addAdjacentBlock(grid, rows, cols, 'tree')) blocksAvailable.push('tree');
  // クロコダイル/ゴリラがいるのにブロックを置けなかった場合はこの試行を諦める。
  if (species.includes('crocodile') && !blocksAvailable.includes('water')) {
    dbg('crocodile no water');
    return null;
  }
  if (species.includes('gorilla') && !blocksAvailable.includes('tree')) {
    dbg('gorilla no tree');
    return null;
  }

  const cropped = cropToBoundingBox(grid);
  if (!cropped) {
    dbg('crop failed');
    return null;
  }

  const animals = buildAnimals(roster);
  const draft: Stage = {
    id: 'draft',
    name: 'draft',
    rows: cropped.rows,
    cols: cropped.cols,
    terrain: cropped.grid,
    animals,
    animalRules: {},
  };

  if (validateStage(draft).length > 0) {
    dbg('validateStage: ' + JSON.stringify(validateStage(draft)));
    return null;
  }
  if (findDesignWarnings(draft).length > 0) {
    dbg('designWarnings');
    return null;
  }
  // 「壁が正解を決めている」パズルにならないよう、ルールを付ける前の時点で幾何学的な
  // 置き方が十分に多いことを要求する(壁で1本道にした失敗作を弾くための品質ゲート)。
  // 駒数2〜3の入門ステージは土地そのものが小さく幾何学的な組み合わせが少ないのが
  // 自然なので、minGeometricPlacementsで下限を下げられるようにする(既定5)。
  const geometricPlacements = countGeometricPlacements(draft, 12);
  if (geometricPlacements < (opts.minGeometricPlacements ?? 5)) {
    dbg('geometricPlacements=' + geometricPlacements);
    return null;
  }

  // 動物(種)ごとに順番にルールを1つ割り当てる。割り当てた時点で「解が0になっていないか」
  // だけを見て枝刈りする(0でなければ、残りの種で絞り込める余地がまだある)。
  const order = shuffle(roster);
  const animalRules: Partial<Record<Species, SpeciesCondition>> = {};
  for (const { species: sp, count } of order) {
    const others = species.filter((s) => s !== sp);
    const candidates = candidateRulesFor(sp, count, others, blocksAvailable);
    let assigned: SpeciesCondition | null = null;
    for (const cand of candidates.slice(0, 40)) {
      const trial: Stage = { ...draft, animalRules: { ...animalRules, [sp]: cand } };
      if (countSolutions(trial, 1) >= 1) {
        assigned = cand;
        break;
      }
    }
    if (!assigned) {
      dbg('no rule found for ' + sp);
      return null;
    }
    animalRules[sp] = assigned;
  }

  const finalStage: Stage = { ...draft, animalRules };
  const solutions = countSolutions(finalStage, 2);
  if (solutions !== 1) {
    dbg('final solutions=' + solutions);
    return null;
  }

  const level = solverLevel(finalStage);
  const ruleMoves = countRuleMoves(finalStage);
  return { stage: finalStage, level, ruleMoves, geometricPlacements };
};

/** terrain(land/wall/water/treeのみ、正規化用)+種の多重集合で重複を判定する署名。 */
export const puzzleSignature = (stage: Stage): string => {
  const mirrorH = (rows: CellTerrain[][]) => rows.map((row) => [...row].reverse());
  const mirrorV = (rows: CellTerrain[][]) => [...rows].reverse();
  const toKey = (rows: CellTerrain[][]) => rows.map((row) => row.join(',')).join('|');
  const variants = [stage.terrain, mirrorH(stage.terrain), mirrorV(stage.terrain), mirrorH(mirrorV(stage.terrain))];
  const canonicalTerrain = variants.map(toKey).sort()[0];
  const speciesMultiset = [...stage.animals].map((a) => a.species).sort().join(',');
  return `${canonicalTerrain}::${speciesMultiset}`;
};

export const generateOpenStages = (
  maxAttempts: number,
  maxMillis: number,
  seen: Set<string> = new Set(),
  opts: GenerateOptions = {}
): GeneratedStage[] => {
  const found: GeneratedStage[] = [];
  const start = Date.now();
  let attempts = 0;
  while (attempts < maxAttempts && Date.now() - start < maxMillis) {
    attempts++;
    const result = buildStageAttempt(opts);
    if (!result) continue;
    const sig = puzzleSignature(result.stage);
    if (seen.has(sig)) continue;
    seen.add(sig);
    found.push(result);
  }
  return found;
};

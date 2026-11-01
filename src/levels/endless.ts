/**
 * 「むげん」モードの面を、面の番号から決定的に作る生成器。
 *
 * 方式は scripts/generate-open-stages.ts と同じ（開けた土地を作り、動物1種につき
 * ルール1つで唯一解に絞る）。違いは次の4つ。
 *
 * - 乱数は Math.random ではなく、面の番号から決めたシードの mulberry32。
 *   同じ番号からは必ず同じ盤が出る（保存・再現・キャッシュがすべて成り立つ）。
 * - 試行の予算は「時間」ではなく「回数」で持つ。時間で打ち切ると端末の速さで結果が変わる。
 * - 番号が進むほど難しくする。ただし条件で縛らず、目標値（駒の数・思考レベル・
 *   ルールの数）との距離を重みつきで採点し、いちばん近い候補を採る。
 * - 外しても唯一解が崩れないルールは消す（置いたルールには必ず役割がある）。
 *
 * 段を緩めても出ないときに備えて梯子を持ち、最終段は手作りの面を1つ返すので必ず成功する。
 */
import {
  SHAPES,
  SPECIES,
  createGameState,
  isSpeciesConditionSatisfied,
  placeAnimal,
  reasoningLevel,
  solverLevel,
  validateStage,
} from '@/engine';
import type { AnimalInstance, CellTerrain, GameState, ShapeKey, SolverLevel, Species, SpeciesCondition, Stage } from '@/engine';
import { findDesignWarnings } from '@/lib/stage-design-checks';

import { STAGES } from './stages';

// --- 乱数 -----------------------------------------------------------------

export type Rng = () => number;

/** mulberry32。32bit の状態だけで速く、分布も十分。 */
export const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** 文字列 → 32bit（FNV-1a）。面の番号と段の番号からシードを作るのに使う。 */
const hash32 = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

export const endlessSeed = (n: number, rung: number): number => hash32(`animal-puzzle:endless:${n}:${rung}`);

const tools = (rng: Rng) => {
  const rand = (k: number): number => Math.floor(rng() * k);
  const choice = <T,>(arr: readonly T[]): T => arr[rand(arr.length)];
  const shuffle = <T,>(arr: readonly T[]): T[] => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  /** 重みに比例して1つ選ぶ。 */
  const weighted = <T,>(arr: readonly T[], weight: (x: T) => number): T => {
    const total = arr.reduce((sum, x) => sum + weight(x), 0);
    let r = rng() * total;
    for (const x of arr) {
      r -= weight(x);
      if (r < 0) return x;
    }
    return arr[arr.length - 1];
  };
  return { rand, choice, shuffle, weighted };
};
type Tools = ReturnType<typeof tools>;

// --- 難しさの目標値 ---------------------------------------------------------

/** 盤の上限。スマホ幅で1マスが小さくなりすぎないよう、手作りの面（最大 7x6）より少し絞る。 */
export const MAX_ROWS = 6;
export const MAX_COLS = 6;
/** 詰めた後の盤の面積の下限（手作りの面の最小は 2x3）。 */
const MIN_AREA = 6;

export type EndlessTarget = {
  /** 駒の数の目標（3〜8）。 */
  pieces: number;
  /** 思考レベルの目標（1=L1 〜 4=L4）。 */
  level: number;
  /** 効いているルールの数の目標。 */
  rules: number;
};

/**
 * 面の番号 → 目標値。どれも 1 面目でいちばん易しく、番号とともに滑らかに上がって
 * 頭打ちになる。値は監査（scripts/audit-endless.ts）で分布を見て決めた。
 */
export const targetFor = (n: number): EndlessTarget => {
  const k = Math.max(0, n - 1);
  const pieces = 3 + 5 * (1 - Math.exp(-Math.pow(k / 30, 1.3)));
  // 序盤は L1 に長く留まり、20 面あたりから上がり始める S 字（崖を作らない）。
  const level = 4 - 3 * Math.exp(-Math.pow(k / 40, 1.6));
  const rules = 1.5 + 3 * (1 - Math.exp(-k / 40));
  return { pieces, level, rules };
};

/**
 * 序盤の手当ての強さ。1 面目で 1、10 面目で約 0.61、30 面目で約 0.2。
 * 盤の広さ・ルールの選び方・ルールを消す基準を、これで滑らかに切り替える。
 */
export const easeFor = (n: number): number => Math.exp(-Math.max(0, n - 1) / 18);


/**
 * その面が節目なら、入る思考レベル（2〜4）を返す。節目でなければ null。
 * 目標値の曲線から決まるので、生成器を回さずに分かる。
 */
export const milestoneAt = (n: number): number | null => {
  if (n < 2) return null;
  const step = stepFor(n);
  return step > stepFor(n - 1) ? step : null;
};

/** 採点の重み。思考レベルの差を最も重く見る（遊んだ手応えに直結するため）。 */
const WEIGHTS = { level: 2, pieces: 1, rules: 1 };

const LEVEL_INDEX: Record<SolverLevel, number> = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4, unsolvable: 5 };

export const levelIndex = (level: SolverLevel): number => LEVEL_INDEX[level];

// --- 地形 -------------------------------------------------------------------

type Grid = CellTerrain[][];

const neighbors4 = (r: number, c: number): Array<[number, number]> => [
  [r - 1, c],
  [r + 1, c],
  [r, c - 1],
  [r, c + 1],
];

const isConnected = (grid: Grid, rows: number, cols: number): boolean => {
  let start: [number, number] | null = null;
  let land = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (grid[r][c] === 'land') {
        land++;
        start ??= [r, c];
      }
  if (!start) return true;
  const seen = new Set<number>([start[0] * 16 + start[1]]);
  const stack = [start];
  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    for (const [nr, nc] of neighbors4(r, c)) {
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] !== 'land') continue;
      const key = nr * 16 + nc;
      if (seen.has(key)) continue;
      seen.add(key);
      stack.push([nr, nc]);
    }
  }
  return seen.size === land;
};

/** 全面の平地から、つながりを保ったまま targetLand マスまで間引く。 */
const carve = (t: Tools, rows: number, cols: number, targetLand: number): Grid | null => {
  const grid: Grid = Array.from({ length: rows }, () => Array<CellTerrain>(cols).fill('land'));
  let land = rows * cols;
  let guard = 0;
  while (land > targetLand && guard < 400) {
    guard++;
    const r = t.rand(rows);
    const c = t.rand(cols);
    if (grid[r][c] !== 'land') continue;
    grid[r][c] = 'wall';
    if (!isConnected(grid, rows, cols)) {
      grid[r][c] = 'land';
      continue;
    }
    land--;
  }
  return land === targetLand ? grid : null;
};

/** 平地に接する壁を1つ選び、水か木にする（ワニ・ゴリラのルール用）。 */
const addBlock = (t: Tools, grid: Grid, rows: number, cols: number, block: 'water' | 'tree'): boolean => {
  const candidates: Array<[number, number]> = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 'wall') continue;
      const touches = neighbors4(r, c).some(
        ([nr, nc]) => nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 'land'
      );
      if (touches) candidates.push([r, c]);
    }
  if (candidates.length === 0) return false;
  const [r, c] = t.choice(candidates);
  grid[r][c] = block;
  return true;
};

/** 壁しか無い外周の行・列を落として、外接矩形にぴったり詰める。 */
const cropTight = (grid: Grid): Grid => {
  const rows = grid.length;
  const cols = grid[0].length;
  const used = (r: number, c: number) => grid[r][c] !== 'wall';
  const rowUsed = (r: number) => grid[r].some((_, c) => used(r, c));
  const colUsed = (c: number) => grid.some((_, r) => used(r, c));
  let top = 0;
  while (top < rows - 1 && !rowUsed(top)) top++;
  let bottom = rows - 1;
  while (bottom > top && !rowUsed(bottom)) bottom--;
  let left = 0;
  while (left < cols - 1 && !colUsed(left)) left++;
  let right = cols - 1;
  while (right > left && !colUsed(right)) right--;
  return grid.slice(top, bottom + 1).map((row) => row.slice(left, right + 1));
};

// --- 動物とルール -------------------------------------------------------------

const ALL_SPECIES = Object.keys(SPECIES) as Species[];
const SELF_CAPABLE = new Set<Species>(['lion', 'leopard', 'rhino', 'monkey']);
const SELF_KINDS = ['adjacentForbidden', 'diagonalForbidden', 'surroundForbidden', 'flockRequired'] as const;
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

type PieceSpec = { species: Species; count: number };

const cellsOf = (roster: PieceSpec[]): number =>
  roster.reduce((sum, p) => sum + SHAPES[SPECIES[p.species].shape as ShapeKey].length * p.count, 0);

/** pieces 体ちょうどになる構成を作る。種の数は駒の数の 6〜8 割。 */
const pickRoster = (t: Tools, pieces: number): PieceSpec[] => {
  const minSpecies = Math.ceil(pieces / 2);
  const maxSpecies = Math.min(pieces, 6);
  const wanted = Math.round(pieces * (0.6 + 0.25 * t.rand(1000) / 1000));
  const speciesCount = Math.max(minSpecies, Math.min(maxSpecies, wanted));
  const chosen = t.shuffle(ALL_SPECIES).slice(0, speciesCount);
  const roster = chosen.map((species) => ({ species, count: 1 }));
  // 余った駒を2体目として配る。自己参照ルールを持てる種を先に（同種どうしの背理法が生まれる）。
  let extra = pieces - speciesCount;
  const order = t.shuffle(roster).sort((a, b) => Number(SELF_CAPABLE.has(b.species)) - Number(SELF_CAPABLE.has(a.species)));
  for (const p of order) {
    if (extra === 0) break;
    p.count = 2;
    extra--;
  }
  return roster;
};

const buildAnimals = (roster: PieceSpec[]): AnimalInstance[] =>
  roster.flatMap(({ species, count }) =>
    Array.from({ length: count }, (_, i) => ({ instanceId: `${species}-${i + 1}`, species }))
  );

const candidateRules = (
  t: Tools,
  species: Species,
  count: number,
  others: Species[],
  blocks: Array<'water' | 'tree'>
): SpeciesCondition[] => {
  const out: SpeciesCondition[] = [];
  for (const target of others) {
    for (const kind of RELATIONAL_KINDS) out.push({ kind, with: target } as SpeciesCondition);
    for (const distance of [1, 2, 3]) out.push({ kind: 'exactDistance', with: target, distance });
    for (const distance of [2, 3]) out.push({ kind: 'minDistance', from: target, distance });
  }
  if (count >= 2) {
    for (const kind of SELF_KINDS)
      out.push(kind === 'flockRequired' ? { kind } : ({ kind, with: species } as SpeciesCondition));
    out.push({ kind: 'minDistance', from: species, distance: 2 });
  }
  for (const block of blocks) out.push({ kind: 'blockAdjacentRequired', block });
  return t.shuffle(out);
};

// --- 詰め方の列挙 ----------------------------------------------------------------

/** これより多く詰め方がある盤は捨てる（ルールで絞り切れず、列挙も重い）。 */
const TILING_CAP = 1500;
/** 1種あたり見比べるルールの数。全部を比べると盤が広いときに重い。 */
const RULE_SAMPLE = 12;

/**
 * 平地をちょうど埋め尽くす置き方をすべて返す（同じ種どうしの入れ替えは1通りと数える）。
 * 行優先でいちばん最初の空きマスを必ず埋める形で探すので、重複が出ず速い。
 * 全形状でアンカー（左上）が行優先の最初のマスなので、空きマス＝アンカーになる。
 * cap を超えたら null。
 */
export const enumerateTilings = (stage: Stage, cap: number): GameState[] | null => {
  const out: GameState[] = [];
  const land: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < stage.rows; r++) for (let c = 0; c < stage.cols; c++) if (stage.terrain[r][c] === 'land') land.push({ r, c });
  let over = false;
  const rec = (state: GameState, from: number, filled: Set<number>): void => {
    if (over) return;
    let i = from;
    while (i < land.length && filled.has(land[i].r * 16 + land[i].c)) i++;
    if (i === land.length) {
      if (state.tray.length === 0) {
        if (out.length >= cap) over = true;
        else out.push(state);
      }
      return;
    }
    const tried = new Set<Species>();
    for (const a of state.tray) {
      if (tried.has(a.species)) continue;
      tried.add(a.species);
      const next = placeAnimal(state, a.instanceId, land[i]);
      if (next === state) continue;
      const cells = next.placed[next.placed.length - 1].cells;
      const nf = new Set(filled);
      for (const p of cells) nf.add(p.r * 16 + p.c);
      rec(next, i + 1, nf);
    }
  };
  rec(createGameState(stage), 0, new Set());
  return over ? null : out;
};

// --- 1回の試行 -----------------------------------------------------------------

export type RungParams = {
  /** 駒の数の範囲（両端含む）。目標値のまわりで揺らす。 */
  minPieces: number;
  maxPieces: number;
  /** ルールを付ける前に要る、幾何的な詰め方の下限（壁で1本道にした面を弾く）。 */
  minGeometric: number;
  /** この段で試す回数。 */
  attempts: number;
};

type Candidate = { stage: Stage; level: SolverLevel; rules: number; score: number };

/**
 * 思考レベルを測る目標は「段」（目標を四捨五入した整数）。段は節目（milestoneAt）でだけ
 * 上がるので、「ここから むずかしく」と出した面から実際に難しくなる。面ごとの揺らぎは
 * 駒とルールの数が受け持つ。
 */
export const stepFor = (n: number): number => Math.round(targetFor(n).level);

/** 序盤（ease が大きい面）ほど思考レベルの差を重く見る。駒やルールの数が多少ずれても、序盤は L1 を優先する。 */
const scoreOf = (target: EndlessTarget, pieces: number, level: SolverLevel, rules: number, ease: number): number =>
  (WEIGHTS.level + 8 * ease) * Math.abs(levelIndex(level) - Math.round(target.level)) +
  WEIGHTS.pieces * Math.abs(pieces - target.pieces) +
  WEIGHTS.rules * Math.abs(rules - target.rules);

const attempt = (t: Tools, n: number, params: RungParams, target: EndlessTarget): Candidate | null => {
  const ease = easeFor(n);
  const span = params.maxPieces - params.minPieces + 1;
  const pieces = params.minPieces + t.rand(span);
  const roster = pickRoster(t, pieces);
  const cells = cellsOf(roster);

  const sizes: Array<{ rows: number; cols: number }> = [];
  for (let r = 2; r <= MAX_ROWS; r++)
    for (let c = 2; c <= MAX_COLS; c++) {
      const area = r * c;
      if (area >= Math.max(cells + 1, 6) && area <= cells * (1.6 - 0.4 * ease) + 2) sizes.push({ rows: r, cols: c });
    }
  if (sizes.length === 0) return null;
  const { rows, cols } = t.choice(sizes);

  const grid = carve(t, rows, cols, cells);
  if (!grid) return null;

  const species = roster.map((p) => p.species);
  const blocks: Array<'water' | 'tree'> = [];
  if (species.includes('crocodile')) {
    if (!addBlock(t, grid, rows, cols, 'water')) return null;
    blocks.push('water');
  }
  if (species.includes('gorilla')) {
    if (!addBlock(t, grid, rows, cols, 'tree')) return null;
    blocks.push('tree');
  }

  const terrain = cropTight(grid);
  // 詰めた結果が 2x2 のような小さすぎる盤は、見た瞬間に答えが見えてしまうので捨てる。
  if (terrain.length * terrain[0].length < MIN_AREA || terrain.length < 2 || terrain[0].length < 2) return null;
  const draft: Stage = {
    id: `endless-${n}`,
    name: `むげん ${n}`,
    rows: terrain.length,
    cols: terrain[0].length,
    terrain,
    animals: buildAnimals(roster),
    animalRules: {},
  };
  if (validateStage(draft).length > 0) return null;
  if (findDesignWarnings(draft).length > 0) return null;

  // ルールを付ける前の詰め方を全部並べる。多すぎる盤は、ルール1種1つでは絞り切れないので捨てる。
  const tilings = enumerateTilings(draft, TILING_CAP);
  if (!tilings || tilings.length < params.minGeometric) return null;

  // 正解を先に1つ決め、それを満たすルールだけを付けていく（解が0になる心配が無い）。
  const planted = t.choice(tilings);
  const uniqueSpecies = t.shuffle([...new Set(species)]);
  const countOf = (sp: Species) => roster.find((p) => p.species === sp)!.count;
  const rules: Partial<Record<Species, SpeciesCondition>> = {};
  let alive = tilings;
  for (const sp of uniqueSpecies) {
    if (alive.length === 1) break;
    const others = uniqueSpecies.filter((s) => s !== sp);
    const cuts: Array<{ rule: SpeciesCondition; left: GameState[] }> = [];
    for (const rule of candidateRules(t, sp, countOf(sp), others, blocks)) {
      if (!isSpeciesConditionSatisfied(planted, sp, rule)) continue;
      const left = alive.filter((s) => isSpeciesConditionSatisfied(s, sp, rule));
      if (left.length < alive.length) cuts.push({ rule, left });
      if (cuts.length >= RULE_SAMPLE) break;
    }
    if (cuts.length === 0) continue;
    // 重みは「残る詰め方の数」の (1 - 2*ease) 乗。後半は弱く絞るルールほど選ばれやすく
    // （強いルール1つで決まる面は単調）、序盤は逆に強い手がかりほど選ばれやすい（1 手ずつ決まる）。
    const power = 1 - 2 * ease;
    const pick = t.weighted(cuts, (x) => Math.pow(x.left.length, power));
    rules[sp] = pick.rule;
    alive = pick.left;
  }
  if (alive.length !== 1) return null;

  // 外しても唯一解のままのルールは、何の役にも立っていないので消す。
  // （外すと推論が難しくなるルールを序盤だけ残す案も試したが、L1 の数は変わらず
  //  生成が 5 倍遅くなったのでやめた。2026-11-01 AP-6）
  const survivors = (rs: Partial<Record<Species, SpeciesCondition>>) =>
    tilings.filter((s) => (Object.keys(rs) as Species[]).every((sp) => isSpeciesConditionSatisfied(s, sp, rs[sp]!)));
  for (const sp of t.shuffle(Object.keys(rules) as Species[])) {
    const without = { ...rules };
    delete without[sp];
    if (survivors(without).length === 1) delete rules[sp];
  }
  // どのルールも参照しない水・木は、ただの草むらに戻す（役割の無い物を置かない）。
  const used = new Set(Object.values(rules).flatMap((r) => (r && 'block' in r ? [r.block] : [])));
  const plain = cropTight(
    draft.terrain.map((row) => row.map((cell) => ((cell === 'water' || cell === 'tree') && !used.has(cell) ? 'wall' : cell)))
  );
  if (plain.length * plain[0].length < MIN_AREA || plain.length < 2 || plain[0].length < 2) return null;
  const stage: Stage = { ...draft, rows: plain.length, cols: plain[0].length, terrain: plain, animalRules: rules };
  if (findDesignWarnings(stage).length > 0) return null;

  const level = reasoningLevel(stage);
  const ruleCount = Object.keys(stage.animalRules ?? {}).length;
  return { stage, level, rules: ruleCount, score: scoreOf(target, pieces, level, ruleCount, ease) };
};

// --- 梯子 ---------------------------------------------------------------------

/**
 * 候補がこれだけ集まったら、その中の最良で打ち切る。序盤は L1 になる候補が少ない
 * （伝播は置いた駒からしか絞れず、最初の1手を盤の形か水・木が決める必要がある）ので、
 * 盤が小さく1候補が数 ms で済む序盤ほど多く見比べる。1 面目で 30、30 面目で約 11。
 */
const enoughCandidates = (n: number): number => 6 + Math.round(24 * easeFor(n));
/** これ以下の点なら目標に十分近いので、その場で採る。 */
const GOOD_SCORE = 0.9;

/** 面の番号 → 段ごとの条件。後ろの段ほど易しく、試行も成功しやすい。 */
export const rungsFor = (n: number, budgetScale = 1): RungParams[] => {
  const target = targetFor(n);
  const center = Math.round(target.pieces);
  const scaled = (a: number) => Math.round(a * budgetScale);
  return [
    { minPieces: Math.max(3, center - 1), maxPieces: Math.min(8, center + 1), minGeometric: center >= 5 ? 5 : 3, attempts: scaled(300) },
    { minPieces: Math.max(3, center - 2), maxPieces: Math.min(8, center), minGeometric: 2, attempts: scaled(300) },
    { minPieces: 3, maxPieces: 4, minGeometric: 2, attempts: scaled(300) },
  ];
};

export type EndlessResult = {
  stage: Stage;
  /** どの段で出たか。rungsFor の長さと同じなら最終段（手作りの面）。 */
  rung: number;
  level: SolverLevel;
  rules: number;
  /** 使った試行の回数。 */
  attempts: number;
};

export type EndlessOptions = {
  /** 試行回数の倍率。0 にすると最終段まで落ちる（テスト用）。 */
  budgetScale?: number;
};

/** 最終段: 手作りの面を1つ、むげんの番号に付け替えて返す。必ず成功する。 */
const fallback = (n: number, rung: number, attempts: number): EndlessResult => {
  const base = STAGES[(n - 1) % STAGES.length];
  const stage: Stage = { ...base, id: `endless-${n}`, name: `むげん ${n}` };
  const rules = Object.keys(base.animalRules ?? {}).length;
  return { stage, rung, level: solverLevel(stage), rules, attempts };
};

export const generateEndless = (n: number, opts: EndlessOptions = {}): EndlessResult => {
  const target = targetFor(n);
  const rungs = rungsFor(n, opts.budgetScale ?? 1);
  let used = 0;
  for (let i = 0; i < rungs.length; i++) {
    const t = tools(mulberry32(endlessSeed(n, i)));
    let best: Candidate | null = null;
    let found = 0;
    for (let a = 0; a < rungs[i].attempts; a++) {
      used++;
      const cand = attempt(t, n, rungs[i], target);
      if (!cand) continue;
      found++;
      if (!best || cand.score < best.score) best = cand;
      if (best.score <= GOOD_SCORE || found >= enoughCandidates(n)) break;
    }
    if (best) return { stage: best.stage, rung: i, level: best.level, rules: best.rules, attempts: used };
  }
  return fallback(n, rungs.length, used);
};

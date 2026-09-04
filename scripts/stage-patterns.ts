import type { CellTerrain, ShapeKey } from '@/engine';

/**
 * familyは「元になった系統」を表す番号。BASE_PATTERNSの各要素は自分自身の
 * 配列indexをfamilyとして持ち、その反転バリエーション(MIRRORED_PATTERNS)は
 * 元にしたBASE_PATTERNSの要素と同じfamilyを持つ。動物の形はすべて左右・上下
 * 対称なので、反転しても幾何的には「同じパズルを裏返しただけ」であり、
 * 同じ種構成を反転パターンに割り当てると実質同じパズルが2度出荷されてしまう
 * （分割3のTask 4完了後の再レビューで実際に発生した：見取り図の文字列は違うが
 * 反転しただけの関係にある2ステージが同じ種構成で複数生成された）。
 * generateForChapterの重複除去は配列indexではなくfamilyで行い、同じ系統×
 * 同じ種構成の組み合わせを1回しか採用しないようにする。
 */
export type PatternTemplate = { rows: number; cols: number; rowsStr: string[]; slotShapes: ShapeKey[]; family: number };

const TERRAIN_CHARS: Record<string, CellTerrain> = { '.': 'land', '~': 'water', T: 'tree', '#': 'wall', x: 'void' };

/** 1文字1マスの見取り図から地形グリッドを作る。src/levels/stages.tsのterrain()と同じ規約。 */
export const terrainFromRows = (rowsStr: string[]): CellTerrain[][] =>
  rowsStr.map((row) => row.split('').map((ch) => TERRAIN_CHARS[ch] ?? 'wall'));

/**
 * 行内の文字順を左右反転する。動物の形(single/domino_h/domino_v/square2x2)は
 * すべて左右対称なので、タイル張り可能性は反転しても保たれる。
 * これにより盤面のバリエーション(=生成器が拾える(パターン,種構成)の組み合わせ数)を
 * 増やせる。分割3のTask 4完了後のレビューで、8スロットの大規模パターンが
 * 少なすぎて2〜6章間で唯一解の組み合わせが枯渇し、章をまたいで内容が丸ごと
 * 重複するステージが大量に発生したことが判明したため追加した。
 */
const mirrorHorizontal = (pattern: PatternTemplate): PatternTemplate => ({
  ...pattern,
  rowsStr: pattern.rowsStr.map((row) => row.split('').reverse().join('')),
});

/** 行の並び順を上下反転する。mirrorHorizontalと同じ理由でバリエーションを増やす。familyは引き継ぐ。 */
const mirrorVertical = (pattern: PatternTemplate): PatternTemplate => ({
  ...pattern,
  rowsStr: [...pattern.rowsStr].reverse(),
});

type BasePattern = Omit<PatternTemplate, 'family'>;

/**
 * 既存の出荷ステージの見取り図をそのまま流用した、幾何的にタイル張り可能と
 * 実証済みの地形テンプレート集。ランダムなブロック配置は幾何的に成立する確率が
 * 数%以下(スパイク実測)だったため、証明済みの形を再利用する方針にした。
 * slotShapesは、そのステージが元々要求していた駒の形の多重集合。
 */
const BASE_PATTERNS_RAW: BasePattern[] = [
  // 小規模(1章向け)
  { rows: 5, cols: 5, rowsStr: ['#####', '##.##', '#...#', '##.##', '#####'], slotShapes: ['single', 'single', 'single', 'single', 'single'] },
  { rows: 5, cols: 5, rowsStr: ['..#.#', '.##.#', '.####', '#####', '###..'], slotShapes: ['domino_h', 'domino_h', 'domino_v', 'single', 'single'] },
  { rows: 5, cols: 5, rowsStr: ['..###', '####.', '####.', '#.###', '#...#'], slotShapes: ['domino_h', 'domino_h', 'domino_v', 'domino_v'] },
  { rows: 5, cols: 5, rowsStr: ['..###', '..###', '#####', '###.#', '###.#'], slotShapes: ['domino_v', 'domino_v', 'domino_v'] },
  { rows: 5, cols: 5, rowsStr: ['...#.', '##.#.', '###.#', '###.#', '..###'], slotShapes: ['domino_h', 'domino_h', 'domino_v', 'domino_v', 'domino_v'] },
  // 中規模(2〜4章向け、2x2を含む)
  { rows: 6, cols: 5, rowsStr: ['..#..', '.##..', '.####', '#####', '.##..', '.##..'], slotShapes: ['domino_h', 'domino_v', 'domino_v', 'square2x2', 'square2x2'] },
  { rows: 7, cols: 5, rowsStr: ['..#..', '.##..', '.####', '###..', '.##..', '.####', '###..'], slotShapes: ['domino_h', 'domino_h', 'domino_v', 'domino_v', 'square2x2', 'square2x2'] },
  { rows: 7, cols: 5, rowsStr: ['..#..', '..##.', '####.', '..###', '..##.', '####.', '..###'], slotShapes: ['domino_h', 'domino_h', 'domino_v', 'single', 'single', 'square2x2', 'square2x2'] },
  // 大規模(2〜6章向け、駒数多め)
  { rows: 6, cols: 7, rowsStr: ['.....#.', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.'], slotShapes: ['domino_v', 'domino_v', 'domino_v', 'domino_v', 'domino_v', 'domino_v', 'domino_h', 'domino_h'] },
  { rows: 7, cols: 5, rowsStr: ['..#.#', '..#.#', '###..', '#####', '..#.#', '..#.#', '###..'], slotShapes: ['domino_v', 'domino_v', 'domino_v', 'domino_v', 'domino_v', 'domino_v', 'domino_h', 'domino_h'] },
  { rows: 6, cols: 7, rowsStr: ['..#..#.', '.##.##.', '.##.###', '#######', '.##.##.', '.##.##.'], slotShapes: ['domino_h', 'domino_h', 'domino_v', 'domino_v', 'domino_v', 'domino_v', 'domino_v', 'domino_v'] },
  { rows: 5, cols: 7, rowsStr: ['..###..', '##.#.##', '##.#.##', '.#####.', '...#...'], slotShapes: ['domino_h', 'domino_h', 'domino_h', 'domino_h', 'domino_v', 'domino_v', 'domino_v', 'domino_v'] },
];

/** BASE_PATTERNS_RAWの各要素に、自分自身の配列indexをfamilyとして持たせる。 */
const BASE_PATTERNS: PatternTemplate[] = BASE_PATTERNS_RAW.map((p, family) => ({ ...p, family }));

/**
 * 大規模パターン(8スロット、末尾4つ)の鏡像を追加し、盤面バリエーションを増やす。
 * 反転バリエーションは元にしたBASE_PATTERNSと同じfamilyを持つ(=同じ系統として
 * 重複除去される。動物の形はすべて左右・上下対称なので、反転は「見た目が違う
 * だけの同じパズル」を作ってしまうため、同じ種構成を元パターンとその反転版の
 * 両方に割り当てて別々のステージとして出荷してはいけない。generateForChapterの
 * 重複除去はfamily単位で行う)。
 *
 * また、左右対称・上下対称な地形は反転しても見取り図が元と一致してしまう。
 * 見取り図(rowsStr)の内容が既存と重複する反転版は追加しない。
 */
const rowsKey = (pattern: PatternTemplate): string => pattern.rowsStr.join('|');

const LARGE_PATTERNS = BASE_PATTERNS.slice(-4);
const existingKeys = new Set(BASE_PATTERNS.map(rowsKey));
const MIRRORED_PATTERNS: PatternTemplate[] = [];
for (const mirrored of [...LARGE_PATTERNS.map(mirrorHorizontal), ...LARGE_PATTERNS.map(mirrorVertical)]) {
  const key = rowsKey(mirrored);
  if (existingKeys.has(key)) continue;
  existingKeys.add(key);
  MIRRORED_PATTERNS.push(mirrored);
}

export const PATTERNS: PatternTemplate[] = [...BASE_PATTERNS, ...MIRRORED_PATTERNS];

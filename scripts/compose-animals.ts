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
 * の2つの失敗モードのどちらかに陥ることが分かった。1ステージあたりの上限を設ける。
 *
 * 上限値は当初2だったが、分割3のTask 4実行時、L3以上（2〜4章）に到達する
 * (地形パターン, 種構成)の組み合わせが上限2では実質2通りしかなく、3つの章
 * (2〜4章)が同じプールを奪い合って必要な面数ぶんの多様性を確保できないことが
 * 判明した。上限を4→6と段階的に緩和したところ、2〜4章は5通り以上に増えて
 * 各5面を確保できたが、L4を要する5〜6章はそれでも4通り程度が実測上の上限
 * だったため、5〜6章は必要面数を4に調整した(scripts/generate-stages.tsの
 * CHAPTER_DEFS参照)。L3以上を要すること自体が対称な種による背理法を必要と
 * するため、上限を引き上げても唯一解が壊れるリスクは(a)の理由により本質的には
 * 変わらない（壊れる場合はcountSolutions!==1でその場で捨てられる）。
 */
const SYMMETRIC_SPECIES: ReadonlySet<Species> = new Set(['lion', 'leopard', 'rhino']);
const MAX_SYMMETRIC_INSTANCES = 6;

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

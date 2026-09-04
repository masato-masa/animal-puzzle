import { validateStage, countGeometricPlacements, countSolutions, type Stage } from '@/engine';
import { gradeStage, meetsChapterBar } from '@/lib/stage-difficulty';
import { PATTERNS, terrainFromRows } from './stage-patterns';
import { composeAnimals } from './compose-animals';

const rand = (n: number): number => Math.floor(Math.random() * n);

export type ChapterTarget = { chapterNumber: number; needed: number };

/**
 * 同じ地形×同じ動物構成(種の多重集合)の重複を避けるための署名。
 * パターンの配列indexではなくfamily(反転バリエーションどうしで共有する系統番号)を
 * 使う。動物の形はすべて左右・上下対称なので、あるパターンとその反転版は
 * 「見た目が違うだけの同じパズル」であり、同じ種構成を両方に割り当てると
 * 実質同じパズルを2枚出荷してしまう(分割3のTask 4完了後の再々レビューで
 * 実際に発覚した)。familyでまとめることで、同じ系統×同じ種構成の組み合わせは
 * 反転の有無によらず1回しか採用されない。
 */
const compositionSignature = (patternFamily: number, stage: Stage): string =>
  `${patternFamily}:${[...stage.animals].map((a) => a.species).sort().join(',')}`;

/**
 * 指定した章の合格ラインを満たすステージを、必要数集まるまでランダムに探索する。
 * 幾何的に不成立・唯一解でない・合格ラインを満たさない候補は即座に捨てる。
 * maxAttempts/maxMillisのどちらかに達したら、集まった分だけを返して打ち切る
 * (必要数に届かない場合もある。呼び出し側で件数を確認すること)。
 *
 * sharedSeenを渡すと、複数回のgenerateForChapter呼び出し(章をまたぐ場合を含む)で
 * 同じ(パターン,種構成)の組み合わせを再利用しない。省略時はこの呼び出し内だけの
 * 重複除去になる。同じ合格ラインを共有する章が複数ある構成で
 * sharedSeenを渡さずに個別のSetのまま呼ぶと、各章が独立に同じ小さな組み合わせの
 * プールを探索することになり、章をまたいで内容が丸ごと重複するステージが
 * 生成されうる(実際に分割3のTask 4完了後のレビューでこの重複が発覚した)。
 * 章の合格ラインを1つ実行するあいだ(このファイルの生成ランナー全体)は、
 * 必ず同じsharedSeenを使い回すこと。
 */
export const generateForChapter = (
  target: ChapterTarget,
  maxAttempts: number,
  maxMillis: number,
  sharedSeen?: Set<string>
): Stage[] => {
  const found: Stage[] = [];
  const seen = sharedSeen ?? new Set<string>();
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

    const sig = compositionSignature(pattern.family, stage);
    if (seen.has(sig)) continue;
    seen.add(sig);
    found.push(stage);
  }
  return found;
};

export type ChapterDef = { chapterNumber: number; id: string; name: string };

/**
 * 当初は6章構成だったが、鏡像パターンの重複を正しく除外すると、L3以上の面は
 * 実質3種類・L4の面は実質2種類しか作れないことが判明した(現行の地形・動物の
 * 語彙での実測上の天井)。5〜6章分の面数を確保できないため、章数そのものを
 * 「1章(導入)・2章(L3)・3章(L4)」の3章に統合した(ユーザー承認済み)。
 */
export const CHAPTER_DEFS: ChapterDef[] = [
  { chapterNumber: 1, id: 'savanna-basics', name: '1章 サバンナのきほん' },
  { chapterNumber: 2, id: 'savanna-thinking', name: '2章 かんがえるサバンナ' },
  { chapterNumber: 3, id: 'final-challenge', name: '3章 さいごのちょうせん' },
];

/**
 * 同じ合格ラインを共有する章はまとめて1プールとして生成し、後から均等に分配する。
 * 章ごとに逐次generateForChapterを呼ぶと、先に実行される章が共有プールを
 * (自分の必要数だけ)先取りしてしまい、後続の章が足りなくなる(分割3のTask 4完了後の
 * 再生成で実際に発生した)。3章構成では各章がそれぞれ独立した合格ラインを持つため、
 * ティアは章と1:1に対応する。
 */
export const CHAPTER_TIERS: { chapterNumbers: number[] }[] = [
  { chapterNumbers: [1] },
  { chapterNumbers: [2] },
  { chapterNumbers: [3] },
];

/** poolを章の数でできるだけ均等に分配する(余りは前の章から1つずつ多く割り当てる)。 */
export const splitPoolAcrossChapters = <T,>(pool: T[], chapterCount: number): T[][] => {
  const base = Math.floor(pool.length / chapterCount);
  const remainder = pool.length % chapterCount;
  const result: T[][] = [];
  let index = 0;
  for (let i = 0; i < chapterCount; i++) {
    const size = base + (i < remainder ? 1 : 0);
    result.push(pool.slice(index, index + size));
    index += size;
  }
  return result;
};

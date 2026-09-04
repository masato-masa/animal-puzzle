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
 *
 * sharedSeenを渡すと、複数回のgenerateForChapter呼び出し(章をまたぐ場合を含む)で
 * 同じ(パターン,種構成)の組み合わせを再利用しない。省略時はこの呼び出し内だけの
 * 重複除去になる。同じ合格ラインを共有する章(例: 2〜4章はL3以上、5〜6章はL4)で
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

    const sig = compositionSignature(patternIndex, stage);
    if (seen.has(sig)) continue;
    seen.add(sig);
    found.push(stage);
  }
  return found;
};

export type ChapterDef = { chapterNumber: number; id: string; name: string };

export const CHAPTER_DEFS: ChapterDef[] = [
  { chapterNumber: 1, id: 'savanna-basics', name: '1章 サバンナのきほん' },
  { chapterNumber: 2, id: 'savanna-thinking', name: '2章 かんがえるサバンナ' },
  { chapterNumber: 3, id: 'elephant-secret', name: '3章 ゾウのひみつ' },
  { chapterNumber: 4, id: 'wisdom-challenge', name: '4章 ちえくらべ' },
  { chapterNumber: 5, id: 'maze-savanna', name: '5章 めいろのさばんな' },
  { chapterNumber: 6, id: 'final-challenge', name: '6章 さいごのちょうせん' },
];

/**
 * 同じ合格ラインを共有する章はまとめて1プールとして生成し、後から均等に分配する。
 * 章ごとに逐次generateForChapterを呼ぶと、先に実行される章が共有プールを
 * (自分の必要数だけ)先取りしてしまい、後続の章が足りなくなる(分割3のTask 4完了後の
 * 再生成で、2〜4章の合計消費によって5〜6章向けのL4プールが枯渇する事例が実際に
 * 発生した)。プール単位でまとめて集めてから章に割り振ることで、同じ合格ラインの
 * 章どうしで面数を公平に分配できる。
 */
export const CHAPTER_TIERS: { chapterNumbers: number[] }[] = [
  { chapterNumbers: [1] },
  { chapterNumbers: [2, 3, 4] },
  { chapterNumbers: [5, 6] },
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

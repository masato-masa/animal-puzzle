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

/**
 * needed(必要面数)は章ごとに個別指定する。5〜6章(L4)は、対称な種の上限を
 * MAX_ANIMALS_PER_STAGE(8)に近づけない範囲で緩和しても、唯一解を保ったまま
 * 到達できる(パターン,種構成)の組み合わせが4通り程度が実測上の上限だった
 * （実測: cap=6で各8試行中4件）。5面を要求すると重複を許すか永久に
 * 見つからないかの二択になるため、章ごとに現実的な面数を割り当てる。
 * 合計は30(5+5+5+5+4+4=29ではなく5×4+4×2=28)ではなく設計書の「6章30面前後」の
 * 「前後」の範囲に収める。
 */
export const CHAPTER_DEFS: { chapterNumber: number; id: string; name: string; needed: number }[] = [
  { chapterNumber: 1, id: 'savanna-basics', name: '1章 サバンナのきほん', needed: 5 },
  { chapterNumber: 2, id: 'savanna-thinking', name: '2章 かんがえるサバンナ', needed: 5 },
  { chapterNumber: 3, id: 'elephant-secret', name: '3章 ゾウのひみつ', needed: 5 },
  { chapterNumber: 4, id: 'wisdom-challenge', name: '4章 ちえくらべ', needed: 5 },
  { chapterNumber: 5, id: 'maze-savanna', name: '5章 めいろのさばんな', needed: 4 },
  { chapterNumber: 6, id: 'final-challenge', name: '6章 さいごのちょうせん', needed: 4 },
];

import type { ShapeKey, SolverLevel, Species, Stage } from '@/engine';
import { SPECIES, countGeometricPlacements, countRuleMoves, countSolutions, solverLevel } from '@/engine';
import { describeWarning, findDesignWarnings, type DesignWarning } from './stage-design-checks';

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

type ChapterBar = {
  minLevel: SolverLevel;
  maxLevel?: SolverLevel;
  minRuleMoves?: number;
  maxRuleMoves?: number;
};

/** L0 < L1 < L2 < L3 < L4。unsolvableはどのバーも満たさない別枠として扱う。 */
const LEVEL_ORDER: SolverLevel[] = ['L0', 'L1', 'L2', 'L3', 'L4'];

const levelAtLeast = (level: SolverLevel, min: SolverLevel): boolean => {
  if (level === 'unsolvable') return false;
  return LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(min);
};

const levelAtMost = (level: SolverLevel, max: SolverLevel): boolean =>
  level !== 'unsolvable' && LEVEL_ORDER.indexOf(level) <= LEVEL_ORDER.indexOf(max);

/**
 * 設計書8.4節の表そのもの。当初は「1章・2〜4章・5〜6章」の6章構成だったが、
 * 分割3のTask 4完了後の再々レビューで、鏡像パターンによる見かけ上の重複
 * （反転しただけの同一パズル）を正しく除外すると、L3以上の面は実質3種類、
 * L4の面は実質2種類しか作れないことが判明した（現行12種の地形テンプレート・
 * 11種の動物という語彙の下での実測上の天井）。5〜6章分の面数を確保できない
 * ため、章数そのものを「1章(導入)・2章(L3)・3章(L4)」の3章に統合した
 * （ユーザー承認済み）。CHAPTER_BARSは3要素になり、barForChapterは
 * 章番号にそのまま対応する。
 * 2〜4章→L3のみ(2章)にmaxLevel:'L3'を設定しているのは、L4面が「L3以上」の
 * 合格ラインも技術的に満たしてしまい、上限が無いとL4面が2章の探索に混入して
 * 3章(L4)向けの希少なプールを枯渇させるため（分割3のTask 4完了後の再生成で
 * 実際に発生した）。
 * 条件数(effectiveConditions)は章の合否には使わない。2026-09-04の分割3実装中の
 * スパイクで、生成器が作る「ぴったり敷き詰めるステージ」は構造的に実質1つしか
 * 独立した決定点を持たず、countEffectiveConditionsは種・条件の定義単位でしか
 * 数えない（同じ条件を複数個体が共有していても1としか数えない）ため、幾何解2通り
 * 以上・唯一解という他の絶対条件を満たすステージは軒並みeffectiveConditions=1に
 * なることが判明した（12パターン全種・227件超の唯一解サンプルで例外なし）。
 * 章をまたいで差が出ないため、識別軸としては使わずgradeStageの参考値のみとする。
 * ルール手数Rは2〜4章・5〜6章では合否に使わない（minRuleMoves未設定）。
 * 当初案(2〜4章R≧4、5〜6章R≧5)は分割2完了後のスパイクでR≧4が事実上到達不能と
 * 判明しR≧2/R≧3に引き下げ、続いてR≧1に引き下げたが、分割3のTask 4実行時、
 * 「レベル(L3以上)とR(≧1)を同時に満たす」こと自体が構造的に不可能と判明した
 * （唯一解サンプル597件の実測で、L3以上のステージはR=0が100%、R≧1のステージは
 * L1〜L2が100%という完全な排反関係）。理由は、対称な駒（縄張り等）を並べて
 * 背理法（レベルを上げる）で解決する構成と、非対称な条件で明快に絞り込んで
 * （Rを稼ぐ）解決する構成が、この生成器の仕組み上そもそも両立しないため。
 * このためRを2〜6章の合否条件から完全に外し、章間の差別化はレベルのみで行う。
 * 1章はL3以上を要求しないためRとの衝突が起きず、当初のR0〜3の範囲指定をそのまま
 * 維持できる。設計書8.4節参照。
 */
const CHAPTER_BARS: ChapterBar[] = [
  { minLevel: 'L1', maxLevel: 'L2', minRuleMoves: 0, maxRuleMoves: 3 },
  { minLevel: 'L3', maxLevel: 'L3' },
  { minLevel: 'L4' },
];

/** 3章構成(1章=導入, 2章=L3, 3章=L4)に対応する。章番号がCHAPTER_BARSのindex+1に直接対応する。 */
const barForChapter = (chapterNumber: number): ChapterBar => {
  if (chapterNumber <= 1) return CHAPTER_BARS[0];
  if (chapterNumber === 2) return CHAPTER_BARS[1];
  return CHAPTER_BARS[2];
};

/** そのステージの動物の中に、同じ形(shape)を持つ種が2種以上含まれるか。
 * 幾何的に見分けのつかない駒が無ければ、ルールで絞り込む場面(ルール手数R)が生まれない。 */
const hasSharedShapeAcrossSpecies = (stage: Stage): boolean => {
  const speciesByShape = new Map<ShapeKey, Set<Species>>();
  for (const a of stage.animals) {
    const shape = SPECIES[a.species].shape;
    const set = speciesByShape.get(shape) ?? new Set<Species>();
    set.add(a.species);
    speciesByShape.set(shape, set);
  }
  return [...speciesByShape.values()].some((set) => set.size >= 2);
};

/** 章番号(1始まり)ごとの合格ラインと突き合わせ、違反理由の一覧を返す。空配列なら合格。 */
export const meetsChapterBar = (grade: StageGrade, chapterNumber: number, stage: Stage): string[] => {
  const reasons: string[] = [];
  if (grade.solutions !== 1) reasons.push(`唯一解ではない（解の数: ${grade.solutions}）`);
  if (grade.geometricPackings <= 1) reasons.push('幾何的な詰め方が1通りしかない（L0）');
  if (grade.warnings.length > 0) reasons.push(...grade.warnings.map(describeWarning));
  if (chapterNumber >= 2 && !hasSharedShapeAcrossSpecies(stage)) {
    reasons.push('同じ形の駒が2種以上登場していない（幾何的に見分けがつかない駒が無いとルール手数が増えない）');
  }

  const bar = barForChapter(chapterNumber);
  if (!levelAtLeast(grade.level, bar.minLevel)) {
    reasons.push(`必要レベル${bar.minLevel}に届いていない（実際: ${grade.level}）`);
  }
  if (bar.maxLevel && !levelAtMost(grade.level, bar.maxLevel)) {
    reasons.push(`レベルが高すぎる（上限${bar.maxLevel}、実際: ${grade.level}）`);
  }
  if (bar.minRuleMoves !== undefined && grade.ruleMoves < bar.minRuleMoves) {
    reasons.push(`ルール手数が足りない（必要${bar.minRuleMoves}以上、実際${grade.ruleMoves}）`);
  }
  if (bar.maxRuleMoves !== undefined && grade.ruleMoves > bar.maxRuleMoves) {
    reasons.push(`ルール手数が多すぎる（上限${bar.maxRuleMoves}、実際${grade.ruleMoves}）`);
  }
  return reasons;
};

import type { ShapeKey, SolverLevel, Species, Stage } from '@/engine';
import { SPECIES, conditionsFor, countGeometricPlacements, countRuleMoves, countSolutions, solverLevel } from '@/engine';
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
    conditionsFor(stage, species).forEach((_, index) => {
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
 * 2026-09-04、分割3完了後にステージ生成の方針そのものを刷新した
 * （壁で1本道を作る旧方式→開けた土地+animalRulesで唯一解に絞る新方式。
 * docs/superpowers/specs/2026-09-03-rules-and-difficulty-design.md参照）。
 * 新方式は旧方式よりはるかに高い確率でL1〜L4いずれの面も作れるため
 * （scripts/generate-open-stages.tsで数百面規模の実測済み）、章数を
 * 4章(各章1レベルに対応)に戻せた。CHAPTER_BARSは4要素になり、
 * barForChapterは章番号にそのまま対応する。
 * ルール手数Rは章の合否には使わない(旧方式時代にL3以上とR≧1が構造的に
 * 排反すると判明した経緯があり、新方式でも安定した相関は確認できていない
 * ため、識別軸としては採用せずgradeStageの参考値のみとする)。
 * 条件数(effectiveConditions)も同様の理由で章の合否には使わない。
 */
const CHAPTER_BARS: ChapterBar[] = [
  { minLevel: 'L1', maxLevel: 'L1' },
  { minLevel: 'L2', maxLevel: 'L2' },
  { minLevel: 'L3', maxLevel: 'L3' },
  { minLevel: 'L4' },
];

/** 4章構成(1章=L1, 2章=L2, 3章=L3, 4章=L4)に対応する。章番号がCHAPTER_BARSのindex+1に直接対応する。 */
const barForChapter = (chapterNumber: number): ChapterBar => {
  const index = Math.min(chapterNumber, CHAPTER_BARS.length) - 1;
  return CHAPTER_BARS[Math.max(index, 0)];
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

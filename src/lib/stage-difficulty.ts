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
  minRuleMoves: number;
  maxRuleMoves?: number;
  conditionRange: [number, number];
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
 * 設計書8.4節の表そのもの。1章・2〜4章・5〜6章の3段階。1章だけは「L1〜L2」
 * 「0〜3」という範囲指定（表の値そのまま）なので上限も持つ。2〜4章・5〜6章は
 * 「L3以上」「2以上」のような下限のみの指定（表に上限の記載が無い）なので、
 * maxLevel/maxRuleMovesは設定しない。
 * ルール手数Rの下限値(2〜4章:2、5〜6章:3)は、当初案(4/5)がスパイク検証で
 * 事実上到達不能と判明したため2026-09-04に引き下げた経緯が設計書8.4節にある。
 */
const CHAPTER_BARS: ChapterBar[] = [
  { minLevel: 'L1', maxLevel: 'L2', minRuleMoves: 0, maxRuleMoves: 3, conditionRange: [2, 3] },
  { minLevel: 'L3', minRuleMoves: 2, conditionRange: [3, 6] },
  { minLevel: 'L4', minRuleMoves: 3, conditionRange: [5, 8] },
];

const barForChapter = (chapterNumber: number): ChapterBar => {
  if (chapterNumber <= 1) return CHAPTER_BARS[0];
  if (chapterNumber <= 4) return CHAPTER_BARS[1];
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
  if (grade.ruleMoves < bar.minRuleMoves) {
    reasons.push(`ルール手数が足りない（必要${bar.minRuleMoves}以上、実際${grade.ruleMoves}）`);
  }
  if (bar.maxRuleMoves !== undefined && grade.ruleMoves > bar.maxRuleMoves) {
    reasons.push(`ルール手数が多すぎる（上限${bar.maxRuleMoves}、実際${grade.ruleMoves}）`);
  }
  if (grade.effectiveConditions < bar.conditionRange[0] || grade.effectiveConditions > bar.conditionRange[1]) {
    reasons.push(
      `条件数が範囲外（${bar.conditionRange[0]}〜${bar.conditionRange[1]}が必要、実際${grade.effectiveConditions}）`
    );
  }
  return reasons;
};

import type { GameState, PlacedAnimal, Species, StageRule } from './types';

const piecesOf = (state: GameState, species: Species): PlacedAnimal[] =>
  state.placed.filter((p) => p.species === species);

const rowsOf = (p: PlacedAnimal): number[] => p.cells.map((c) => c.r);
const colsOf = (p: PlacedAnimal): number[] => p.cells.map((c) => c.c);

/** conditions.tsのgapDistanceと同じ数え方(上下左右に並ぶ組だけを見て、間の空きマス数)。 */
const gapDistance = (a: PlacedAnimal, b: PlacedAnimal): number => {
  let best = Infinity;
  for (const ca of a.cells) {
    for (const cb of b.cells) {
      if (ca.r === cb.r) best = Math.min(best, Math.abs(ca.c - cb.c) - 1);
      else if (ca.c === cb.c) best = Math.min(best, Math.abs(ca.r - cb.r) - 1);
    }
  }
  return best;
};

const overlaps = (xs: number[], ys: number[]): boolean => xs.some((x) => ys.includes(x));

type PairPredicate = (a: PlacedAnimal, b: PlacedAnimal, rule: StageRule) => boolean;

/** 「AはBより上」は、Aの一番下の行がBの一番上の行より上＝完全に上にあること。左右も同様。 */
const pairPredicates: Record<StageRule['kind'], PairPredicate> = {
  above: (a, b) => Math.max(...rowsOf(a)) < Math.min(...rowsOf(b)),
  leftOf: (a, b) => Math.max(...colsOf(a)) < Math.min(...colsOf(b)),
  sameRow: (a, b) => overlaps(rowsOf(a), rowsOf(b)),
  sameCol: (a, b) => overlaps(colsOf(a), colsOf(b)),
  differentRow: (a, b) => !overlaps(rowsOf(a), rowsOf(b)),
  differentCol: (a, b) => !overlaps(colsOf(a), colsOf(b)),
  exactDistance: (a, b, rule) => (rule.kind === 'exactDistance' ? gapDistance(a, b) === rule.distance : true),
};

/**
 * 種Aの全個体×種Bの全個体で成立するか。片方がまだトレイにある間は組が作れず
 * 常にtrueになる＝「まだ違反していない」扱いになる。
 */
export const isStageRuleSatisfied = (state: GameState, rule: StageRule): boolean => {
  const as = piecesOf(state, rule.a);
  const bs = piecesOf(state, rule.b);
  return as.every((a) => bs.every((b) => a.instanceId === b.instanceId || pairPredicates[rule.kind](a, b, rule)));
};

export const unsatisfiedStageRules = (state: GameState, skipRuleIndex?: number): StageRule[] =>
  (state.stage.rules ?? []).filter((r, i) => i !== skipRuleIndex && !isStageRuleSatisfied(state, r));

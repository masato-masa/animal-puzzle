import { propagateToFixation, ruleFilteredCandidateAnchors } from './propagation';
import { countGeometricPlacements } from './solver';
import { createGameState, placeAnimal } from './board';
import type { GameState, Pos, Stage } from './types';

export type SolverLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'unsolvable';

/**
 * 深さdepthまでの「候補を1つ仮置きして伝播し、矛盾すれば消す」を許した上で解けるか。
 * depth=0は伝播のみ(L1相当)。伝播が詰まった時点で深さが尽きていれば失敗。
 * 詰まっていなければ、候補数が最小のインスタンス(MRV)を選び、その候補それぞれを
 * 深さを1消費して再帰的に試す。
 */
const solvableWithinDepth = (state: GameState, depth: number): boolean => {
  const { state: propagated, fullySolved, contradiction } = propagateToFixation(state);
  if (fullySolved) return true;
  if (contradiction) return false;
  if (depth === 0) return false;

  let best: { instanceId: string; anchors: Pos[] } | null = null;
  for (const t of propagated.tray) {
    const anchors = ruleFilteredCandidateAnchors(propagated, t.instanceId);
    if (!best || anchors.length < best.anchors.length) best = { instanceId: t.instanceId, anchors };
  }
  if (!best) return false;

  for (const anchor of best.anchors) {
    const next = placeAnimal(propagated, best.instanceId, anchor);
    if (next === propagated) continue;
    if (solvableWithinDepth(next, depth - 1)) return true;
  }
  return false;
};

/**
 * ステージの思考レベルを判定する。幾何的な詰め方がちょうど1通りしかなければルールが
 * 一切仕事をしていないためL0（判定より先に不合格）。幾何的な詰め方が0通り（地形に対して
 * 物理的に置き切れない）の場合はルール以前に解自体が存在しないのでL0にはせず、
 * 以降の深さ判定に進めてunsolvableとして扱う。以降は深さ0(伝播のみ)から順に3まで試し、
 * 最初に解けた深さをレベルとする。深さ3でも解けなければunsolvable。
 */
export const solverLevel = (stage: Stage): SolverLevel => {
  if (countGeometricPlacements(stage, 2) === 1) return 'L0';

  const initial = createGameState(stage);
  if (solvableWithinDepth(initial, 0)) return 'L1';
  if (solvableWithinDepth(initial, 1)) return 'L2';
  if (solvableWithinDepth(initial, 2)) return 'L3';
  if (solvableWithinDepth(initial, 3)) return 'L4';
  return 'unsolvable';
};

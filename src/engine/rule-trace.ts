import { findSolution } from './solver';
import { createGameState, placeAnimal, validAnchorCells } from './board';
import { ruleFilteredCandidateAnchors } from './propagation';
import type { AnimalInstance, GameState, Pos, Species, Stage } from './types';

type ChosenMove = {
  index: number;
  instanceId: string;
  species: Species;
  anchor: Pos;
  geomCount: number;
  ruleCount: number;
};

/**
 * 決定的な手順で次の1手を選ぶ: 条件適用後の候補数(ruleCount)が最小のインスタンスを選び、
 * 同点なら種名の辞書順、それでも同点なら(解答での)アンカーの行→列の順。
 * 手はsolvedAnchorByInstanceに従って必ず唯一解の位置に置く(トレースを迷わせないため)。
 */
const chooseNextMove = (
  state: GameState,
  remaining: AnimalInstance[],
  solvedAnchorByInstance: Map<string, Pos>
): ChosenMove => {
  let chosen: ChosenMove | null = null;
  remaining.forEach((inst, i) => {
    const geomCount = validAnchorCells(state, inst.instanceId).size;
    const ruleCount = ruleFilteredCandidateAnchors(state, inst.instanceId).length;
    const anchor = solvedAnchorByInstance.get(inst.instanceId)!;
    const better =
      !chosen ||
      ruleCount < chosen.ruleCount ||
      (ruleCount === chosen.ruleCount && inst.species < chosen.species) ||
      (ruleCount === chosen.ruleCount &&
        inst.species === chosen.species &&
        (anchor.r < chosen.anchor.r || (anchor.r === chosen.anchor.r && anchor.c < chosen.anchor.c)));
    if (better) chosen = { index: i, instanceId: inst.instanceId, species: inst.species, anchor, geomCount, ruleCount };
  });
  return chosen!;
};

/**
 * 唯一解が存在する前提で、解答を決定的な順序でトレースし、「幾何だけでは2通り以上あるのに
 * 条件を適用して初めて1通りに絞れた手」の数を数える。解が無ければ0を返す
 * （呼び出し側でsolutions===1を別途確認する想定）。
 */
export const countRuleMoves = (stage: Stage): number => {
  const solution = findSolution(stage);
  if (!solution) return 0;

  const solvedAnchorByInstance = new Map(solution.placed.map((p) => [p.instanceId, p.anchor]));
  let state = createGameState(stage);
  let remaining = [...stage.animals];
  let ruleMoves = 0;

  while (remaining.length > 0) {
    const move = chooseNextMove(state, remaining, solvedAnchorByInstance);
    if (move.geomCount >= 2 && move.ruleCount === 1) ruleMoves++;
    state = placeAnimal(state, move.instanceId, move.anchor);
    remaining = remaining.filter((_, i) => i !== move.index);
  }

  return ruleMoves;
};

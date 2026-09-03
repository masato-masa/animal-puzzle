import { isStageCleared } from './conditions';
import { createGameState, placeAnimal } from './board';
import type { ConditionSkip, GameState, Stage } from './types';

/** 配置済みピースを「アンカー位置:種」の集合として正規化する。同種ピース同士の入れ替えは同一解として扱う。 */
const canonicalSignature = (state: GameState): string =>
  state.placed
    .map((p) => `${p.anchor.r},${p.anchor.c}:${p.species}`)
    .sort()
    .join('|');

/**
 * 全ての動物を盤面に配置し切る組み合わせを探索し、条件をすべて満たす
 * 「解」（同種ピースの入れ替えを除いた見た目上の配置）の数を数える。
 * capに達し次第探索を打ち切る（唯一解かどうかの判定には0/1/2以上の区別で十分なため）。
 */
export const countSolutions = (
  stage: Stage,
  cap = 2,
  skip?: ConditionSkip,
  skipRuleIndex?: number
): number => {
  const instances = stage.animals;
  const seen = new Set<string>();
  let count = 0;

  const backtrack = (state: GameState, index: number): void => {
    if (count >= cap) return;
    if (index === instances.length) {
      if (isStageCleared(state, skip, skipRuleIndex)) {
        const sig = canonicalSignature(state);
        if (!seen.has(sig)) {
          seen.add(sig);
          count++;
        }
      }
      return;
    }
    const instance = instances[index];
    for (let r = 0; r < stage.rows && count < cap; r++) {
      for (let c = 0; c < stage.cols && count < cap; c++) {
        const next = placeAnimal(state, instance.instanceId, { r, c });
        if (next !== state) backtrack(next, index + 1);
      }
    }
  };

  backtrack(createGameState(stage), 0);
  return count;
};

/**
 * 種の配置条件（隣接禁止など）を無視し、「地形と重なりだけ見て形が入る」パターン数を数える。
 * countSolutions と比較することで、そのステージが本当にルールで絞り込まれているか
 * （見た目の候補は複数あるが正解は1つ）をステージ作成時にチェックできる。
 */
export const countGeometricPlacements = (stage: Stage, cap = 20): number => {
  const instances = stage.animals;
  const seen = new Set<string>();
  let count = 0;

  const backtrack = (state: GameState, index: number): void => {
    if (count >= cap) return;
    if (index === instances.length) {
      const sig = canonicalSignature(state);
      if (!seen.has(sig)) {
        seen.add(sig);
        count++;
      }
      return;
    }
    for (let r = 0; r < stage.rows && count < cap; r++) {
      for (let c = 0; c < stage.cols && count < cap; c++) {
        const next = placeAnimal(state, instances[index].instanceId, { r, c });
        if (next !== state) backtrack(next, index + 1);
      }
    }
  };

  backtrack(createGameState(stage), 0);
  return count;
};

export type SolutionStatus = 'none' | 'unique' | 'multiple';

export const solutionStatus = (stage: Stage): SolutionStatus => {
  const count = countSolutions(stage, 2);
  if (count === 0) return 'none';
  if (count === 1) return 'unique';
  return 'multiple';
};

export const hasUniqueSolution = (stage: Stage): boolean => solutionStatus(stage) === 'unique';

/** そのステージの解を1つ探して返す（複数ある場合は探索順で最初に見つかったもの）。無ければundefined。 */
export const findSolution = (stage: Stage): GameState | undefined => {
  let found: GameState | undefined;

  const backtrack = (state: GameState, index: number): void => {
    if (found) return;
    if (index === stage.animals.length) {
      if (isStageCleared(state)) found = state;
      return;
    }
    for (let r = 0; r < stage.rows && !found; r++) {
      for (let c = 0; c < stage.cols && !found; c++) {
        const next = placeAnimal(state, stage.animals[index].instanceId, { r, c });
        if (next !== state) backtrack(next, index + 1);
      }
    }
  };

  backtrack(createGameState(stage), 0);
  return found;
};

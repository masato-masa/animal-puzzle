import { violatingAnimals } from './conditions';
import { createGameState, placeAnimal } from './board';
import type { GameState, Stage } from './types';

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
export const countSolutions = (stage: Stage, cap = 2): number => {
  const instances = stage.animals;
  const seen = new Set<string>();
  let count = 0;

  const backtrack = (state: GameState, index: number): void => {
    if (count >= cap) return;
    if (index === instances.length) {
      if (violatingAnimals(state).length === 0) {
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

export type SolutionStatus = 'none' | 'unique' | 'multiple';

export const solutionStatus = (stage: Stage): SolutionStatus => {
  const count = countSolutions(stage, 2);
  if (count === 0) return 'none';
  if (count === 1) return 'unique';
  return 'multiple';
};

export const hasUniqueSolution = (stage: Stage): boolean => solutionStatus(stage) === 'unique';

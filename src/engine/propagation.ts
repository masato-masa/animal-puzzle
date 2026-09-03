import type { GameState, Pos, Species, SpeciesCondition } from './types';
import { posKey } from './types';
import { SPECIES } from './species';
import { conditionCheckers, isStageCleared } from './conditions';
import { isStageRuleSatisfied } from './stage-rules';
import { canPlace, placeAnimal } from './board';
import { shapeCells } from './shapes';

/**
 * 配置しても「今すでに盤面にある駒・地形だけ」で即座に破れると判定できる条件の種類。
 * adjacentRequired/flockRequiredのような「必要」系条件は、相手が将来置かれれば満たされうるため
 * ここには含めない（isStageClearedで最終判定する）。blockAdjacentRequiredは地形にしか
 * 依存せず常に確定的に判定できるので特別扱いで常にチェックする。
 */
const MONOTONIC_FORBIDDING: ReadonlySet<SpeciesCondition['kind']> = new Set([
  'adjacentForbidden',
  'diagonalForbidden',
  'surroundForbidden',
  'minDistance',
  'blockAdjacentForbidden',
]);

const passesMonotonicSpeciesConditions = (state: GameState, placed: GameState['placed'][number]): boolean =>
  SPECIES[placed.species].conditions
    .filter((c) => MONOTONIC_FORBIDDING.has(c.kind) || c.kind === 'blockAdjacentRequired')
    .every((c) => conditionCheckers[c.kind](state, placed, c));

/**
 * stage.rulesのうち、指定した種が関わるものだけを対象にする。isStageRuleSatisfiedは
 * 相手側の種がまだ1体も置かれていなければ常にtrue（まだ判定できない＝除外しない）を返すため、
 * 「今すでに置かれている相手」との組み合わせでしか実際には絞り込まれない。
 */
const passesMonotonicStageRules = (state: GameState, species: Species): boolean =>
  (state.stage.rules ?? [])
    .filter((r) => r.a === species || r.b === species)
    .every((r) => isStageRuleSatisfied(state, r));

/** 地形・重なりに加えて、単調な条件・ステージルールでも絞り込んだ候補アンカー。 */
export const ruleFilteredCandidateAnchors = (state: GameState, instanceId: string): Pos[] => {
  const inst = state.tray.find((t) => t.instanceId === instanceId);
  if (!inst) return [];
  const out: Pos[] = [];
  for (let r = 0; r < state.stage.rows; r++) {
    for (let c = 0; c < state.stage.cols; c++) {
      const anchor = { r, c };
      if (!canPlace(state, instanceId, anchor)) continue;
      const next = placeAnimal(state, instanceId, anchor);
      const placed = next.placed.find((p) => p.instanceId === instanceId)!;
      if (!passesMonotonicSpeciesConditions(next, placed)) continue;
      // 種同士の禁止条件は片側にしか書かれない設計（species.ts冒頭コメント参照）。
      // 新しく置く駒自身の条件だけでなく、「既に置かれている他の駒」が今から
      // 持っている禁止条件を、この配置によって新たに破ってしまわないかも確認する。
      // これが無いと、例えば「シマウマ→ライオン隣接禁止」でシマウマを先に置いた場合、
      // 後から置くライオンの候補からその隣接マスが正しく除外されない。
      const breaksAlreadyPlaced = next.placed.some(
        (p) => p.instanceId !== instanceId && !passesMonotonicSpeciesConditions(next, p)
      );
      if (breaksAlreadyPlaced) continue;
      if (!passesMonotonicStageRules(next, inst.species)) continue;
      out.push(anchor);
    }
  }
  return out;
};

const emptyCellsOf = (state: GameState): Pos[] => {
  const filled = new Set(state.placed.flatMap((p) => p.cells.map(posKey)));
  const out: Pos[] = [];
  for (let r = 0; r < state.stage.rows; r++) {
    for (let c = 0; c < state.stage.cols; c++) {
      if (state.stage.terrain[r][c] !== 'land') continue;
      if (!filled.has(posKey({ r, c }))) out.push({ r, c });
    }
  }
  return out;
};

export type PropagationResult = { state: GameState; fullySolved: boolean; contradiction: boolean };

/**
 * naked single（ある駒の候補が1つだけ）とhidden single（あるマスを覆える候補が1つだけ）を
 * 交互に探し、見つかる限り確定させ続ける。どちらも見つからなくなったら停止する
 * （矛盾が無ければ「行き詰まり」＝これ以上は背理法が必要、というL1判定の材料になる）。
 */
export const propagateToFixation = (initial: GameState): PropagationResult => {
  let state = initial;
  for (;;) {
    if (state.tray.length === 0) {
      // 伝播は「必要」系条件(adjacentRequired/flockRequired)を絞り込みに使っていないため、
      // 全部置き終わっても実際には条件を満たしていない場合がありうる。isStageClearedで確認する。
      return { state, fullySolved: isStageCleared(state), contradiction: false };
    }

    const candidatesByInstance = new Map(
      state.tray.map((t) => [t.instanceId, ruleFilteredCandidateAnchors(state, t.instanceId)])
    );

    for (const [, cands] of candidatesByInstance) {
      if (cands.length === 0) return { state, fullySolved: false, contradiction: true };
    }

    const nakedSingle = state.tray.find((t) => candidatesByInstance.get(t.instanceId)!.length === 1);
    if (nakedSingle) {
      state = placeAnimal(state, nakedSingle.instanceId, candidatesByInstance.get(nakedSingle.instanceId)![0]);
      continue;
    }

    const emptyCells = emptyCellsOf(state);
    let hiddenSingle: { instanceId: string; anchor: Pos } | null = null;
    for (const cell of emptyCells) {
      const covering: { instanceId: string; anchor: Pos }[] = [];
      for (const t of state.tray) {
        for (const anchor of candidatesByInstance.get(t.instanceId)!) {
          if (shapeCells(t.species, anchor).some((cell2) => cell2.r === cell.r && cell2.c === cell.c)) {
            covering.push({ instanceId: t.instanceId, anchor });
          }
        }
      }
      if (covering.length === 1) {
        hiddenSingle = covering[0];
        break;
      }
      if (covering.length === 0) return { state, fullySolved: false, contradiction: true };
    }
    if (hiddenSingle) {
      state = placeAnimal(state, hiddenSingle.instanceId, hiddenSingle.anchor);
      continue;
    }

    return { state, fullySolved: false, contradiction: false };
  }
};

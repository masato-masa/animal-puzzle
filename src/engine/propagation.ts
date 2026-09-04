import type { GameState, Pos, Species, SpeciesCondition } from './types';
import { posKey } from './types';
import { conditionsFor } from './species';
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
  // 位置関係系(above/leftOf/sameRow/sameCol/exactDistance等)も、対象種の駒が
  // 既に条件を満たさない位置に置かれていれば、以降その種を何体置いても
  // (everyで全個体チェックのため)違反が覆ることはない。adjacentForbiddenと
  // 同じ理由で単調forbidding扱いにできる。
  'above',
  'below',
  'leftOf',
  'rightOf',
  'sameRow',
  'sameCol',
  'differentRow',
  'differentCol',
  'exactDistance',
]);

const passesMonotonicSpeciesConditions = (state: GameState, placed: GameState['placed'][number]): boolean =>
  conditionsFor(state.stage, placed.species)
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

/**
 * 空きマスの列挙。伝播（特にhidden single判定）は、盤面のlandマス総数と全動物の
 * 必要マス数が一致していること（validateStageが保証する不変条件）を前提にしている。
 * この前提が崩れたstageに対して呼ぶと、実際には正しく解けていないのに全マスが
 * 埋まったように見えて誤って確定してしまう恐れがある。呼び出し側は必ず
 * validateStageを通した後のstageで使うこと。
 */
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
 * naked group（同じ種の残り駒がk体、候補地点の和集合（＝同種内はどの個体でも同一）も
 * ちょうどk箇所しかない）とhidden single（あるマスを覆える候補が1つだけ）を
 * 交互に探し、見つかる限り確定させ続ける。どちらも見つからなくなったら停止する
 * （矛盾が無ければ「行き詰まり」＝これ以上は背理法が必要、というL1判定の材料になる）。
 * naked groupはサイズ1のときnaked single（駒の候補が1つだけ）と一致するため、
 * 単体のnaked single判定は不要（naked groupが包含する）。
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

    // 種ごとにグループ化する。同種の残り駒は互いに交換可能で、候補集合は
    // どの個体を渡してもruleFilteredCandidateAnchorsの結果が一致するため、
    // 先頭の1体分だけ計算すれば十分（種ごとに1回で済む）。
    const instanceIdsBySpecies = new Map<Species, string[]>();
    for (const t of state.tray) {
      const list = instanceIdsBySpecies.get(t.species);
      if (list) list.push(t.instanceId);
      else instanceIdsBySpecies.set(t.species, [t.instanceId]);
    }

    let nakedGroup: { instanceIds: string[]; candidates: Pos[] } | null = null;
    for (const instanceIds of instanceIdsBySpecies.values()) {
      const candidates = candidatesByInstance.get(instanceIds[0])!;
      if (candidates.length === instanceIds.length) {
        nakedGroup = { instanceIds, candidates };
        break;
      }
    }
    if (nakedGroup) {
      // 個体と候補地点を先頭から順に対応付けて1体ずつ配置する。同種内はどの
      // 組み合わせでも良いが、後続の配置ではcanPlaceが既に埋まったマスを
      // 自動的に除外するため、単純な対応付けで正しく動く。
      for (let i = 0; i < nakedGroup.instanceIds.length; i++) {
        state = placeAnimal(state, nakedGroup.instanceIds[i], nakedGroup.candidates[i]);
      }
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

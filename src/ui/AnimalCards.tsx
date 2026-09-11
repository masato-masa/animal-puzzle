import type { CSSProperties } from 'react';

import {
  boundingBox,
  conditionsFor,
  isSpeciesConditionSatisfied,
  isStageRuleSatisfied,
  type GameState,
  type Species,
} from '@/engine';
import { speciesLabel } from '@/art/palette';
import { conditionText, stageRuleText } from '@/lib/condition-text';

import { StatusMark } from './icons';
import { Piece } from './Piece';

type Props = {
  state: GameState;
  selectedId: string | null;
  /** その種の未配置の駒を1つ選ぶ。残っていなければ呼ばれない。 */
  onSelect: (instanceId: string) => void;
};

/** 盤面に出てくる順ではなく、ステージ定義の順に並べる（毎回同じ並びにする）。 */
const speciesOrder = (state: GameState): Species[] =>
  Array.from(new Set(state.stage.animals.map((a) => a.species)));

/**
 * トレイと条件パネルを1枚にまとめたカード列。
 *
 * 残数が 0 になってもカードは消さない。条件は最後まで見え続ける必要があるので、
 * 薄くするだけにとどめる。違反中は赤くし、盤上の赤い駒と対応させる。
 */
export function AnimalCards({ state, selectedId, onSelect }: Props) {
  const rules = state.stage.rules ?? [];

  return (
    <div className="cards">
      {speciesOrder(state).map((sp) => {
        const remaining = state.tray.filter((a) => a.species === sp);
        const conditions = conditionsFor(state.stage, sp);
        const violating = state.placed.some(
          (p) => p.species === sp && conditions.some((c) => !isSpeciesConditionSatisfied(state, sp, c))
        );
        const selected = remaining.some((a) => a.instanceId === selectedId);
        const { w, h } = boundingBox(sp);

        return (
          <button
            key={sp}
            type="button"
            className="card"
            data-selected={selected ? 'true' : undefined}
            data-violating={violating ? 'true' : undefined}
            data-dimmed={remaining.length === 0 ? 'true' : undefined}
            disabled={remaining.length === 0}
            onClick={() => {
              const next = remaining[0];
              if (next) onSelect(next.instanceId);
            }}>
            <span className="card-piece" style={{ '--w': w, '--h': h } as CSSProperties}>
              <Piece species={sp} w={w} h={h} dimmed={remaining.length === 0} />
            </span>

            <span className="card-body">
              <span className="card-name">
                {speciesLabel[sp]}
                <span className="card-count">
                  のこり {remaining.length} / {state.stage.animals.filter((a) => a.species === sp).length}
                </span>
              </span>

              {conditions.length === 0 ? (
                <span className="card-cond">とくに条件なし</span>
              ) : (
                conditions.map((c, i) => {
                  const ok = isSpeciesConditionSatisfied(state, sp, c);
                  return (
                    <span key={i} className="card-cond">
                      {/* 置き終わるまでは ✓ を出さない。未配置は条件が自動的に
                          満たされてしまい、達成したように見えるため。 */}
                      <StatusMark ok={ok} pending={ok && remaining.length > 0} />
                      {conditionText(c)}
                    </span>
                  );
                })
              )}
            </span>
          </button>
        );
      })}

      {rules.length > 0 && (
        <div className="card card-static">
          <span className="card-body">
            <span className="card-name">このステージのやくそく</span>
            {rules.map((r, i) => {
              const ok = isStageRuleSatisfied(state, r);
              return (
                <span key={i} className="card-cond">
                  <StatusMark ok={ok} pending={ok && state.tray.length > 0} />
                  {stageRuleText(r)}
                </span>
              );
            })}
          </span>
        </div>
      )}
    </div>
  );
}

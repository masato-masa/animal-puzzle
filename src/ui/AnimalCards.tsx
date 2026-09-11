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
import { usePieceDrag } from './use-piece-drag';

type Props = {
  state: GameState;
  selectedId: string | null;
  draggingId: string | null;
  /** その種の未配置の駒を1つ選ぶ。 */
  onSelect: (instanceId: string) => void;
  /** ドラッグ開始。追従表示の左上（画面座標）を渡す。 */
  onDragStart: (instanceId: string, left: number, top: number) => void;
  onDragMove: (dx: number, dy: number) => void;
  onDragEnd: () => void;
  /** 盤面の 1 マスの辺長。つまんだ瞬間に盤面と同じ大きさへ変えるために要る。 */
  boardCell: number;
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
export function AnimalCards({
  state,
  selectedId,
  draggingId,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  boardCell,
}: Props) {
  const rules = state.stage.rules ?? [];

  return (
    <div className="cards">
      {speciesOrder(state).map((sp) => (
        <AnimalCard
          key={sp}
          species={sp}
          state={state}
          selectedId={selectedId}
          draggingId={draggingId}
          onSelect={onSelect}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
          boardCell={boardCell}
        />
      ))}

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

function AnimalCard({
  species,
  state,
  selectedId,
  draggingId,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  boardCell,
}: { species: Species } & Omit<Props, 'state'> & { state: GameState }) {
  const remaining = state.tray.filter((a) => a.species === species);
  const conditions = conditionsFor(state.stage, species);
  const violating = state.placed.some(
    (p) => p.species === species && conditions.some((c) => !isSpeciesConditionSatisfied(state, species, c))
  );
  const selected = remaining.some((a) => a.instanceId === selectedId);
  const total = state.stage.animals.filter((a) => a.species === species).length;
  const { w, h } = boundingBox(species);

  const next = remaining[0];

  const handlers = usePieceDrag({
    enabled: !!next,
    // カードの駒は盤面より小さいので、つかんだ瞬間に盤面と同じ大きさへ変え、
    // 指の位置を駒の中心に合わせる。
    onGrab: (x, y) =>
      next
        ? {
            instanceId: next.instanceId,
            left: x - (w * boardCell) / 2,
            top: y - (h * boardCell) / 2,
          }
        : null,
    onTap: () => {
      if (next) onSelect(next.instanceId);
    },
    onDragStart,
    onDragMove,
    onDragEnd,
  });

  return (
    <div
      {...handlers}
      className="card"
      data-selected={selected ? 'true' : undefined}
      data-violating={violating ? 'true' : undefined}
      data-dimmed={remaining.length === 0 ? 'true' : undefined}
      role="button"
      tabIndex={remaining.length === 0 ? -1 : 0}
      aria-disabled={remaining.length === 0}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        if (next) onSelect(next.instanceId);
      }}>
      <span className="card-piece" style={{ '--w': w, '--h': h } as CSSProperties}>
        <Piece
          species={species}
          w={w}
          h={h}
          dimmed={remaining.length === 0}
          hidden={!!next && next.instanceId === draggingId}
        />
      </span>

      <span className="card-body">
        <span className="card-name">
          {speciesLabel[species]}
          <span className="card-count">
            のこり {remaining.length} / {total}
          </span>
        </span>

        {conditions.length === 0 ? (
          <span className="card-cond">とくに条件なし</span>
        ) : (
          conditions.map((c, i) => {
            const ok = isSpeciesConditionSatisfied(state, species, c);
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
    </div>
  );
}

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

/** カードの中の1マスの辺長(px)。**全カードで共通にすることが大事。**
 *  種ごとに正規化すると、2x2 のゾウと 1x1 のリスが同じ大きさに見えてしまい、
 *  何マス使う駒なのかが一覧から読み取れない。 */
const CARD_CELL = 24;
const CARD_GAP = 2;
/** 一番大きい駒（2x2）が収まる枠。全カードでこの幅を確保して左端を揃える。 */
const CARD_SLOT = CARD_CELL * 2 + CARD_GAP;

type Props = {
  state: GameState;
  draggingId: string | null;
  /** ドラッグ開始。追従表示の左上（画面座標）を渡す。 */
  onDragStart: (instanceId: string, left: number, top: number) => void;
  onDragMove: (dx: number, dy: number) => void;
  onDragEnd: () => void;
  /** 盤面の 1 マスの辺長。つかんだ瞬間に盤面と同じ大きさへ変えるために要る。 */
  boardCell: number;
};

/** 盤面に出てくる順ではなく、ステージ定義の順に並べる（毎回同じ並びにする）。 */
const speciesOrder = (state: GameState): Species[] =>
  Array.from(new Set(state.stage.animals.map((a) => a.species)));

/**
 * トレイと条件パネルを1枚にまとめたカード列。ここから駒を**スワイプで引き出す**。
 *
 * 残数が 0 になってもカードは消さない。条件は最後まで見え続ける必要があるので、
 * 薄くするだけにとどめる。違反中は赤くし、盤上の赤い駒と対応させる。
 */
export function AnimalCards({ state, draggingId, onDragStart, onDragMove, onDragEnd, boardCell }: Props) {
  const rules = state.stage.rules ?? [];

  const order = speciesOrder(state);

  return (
    // 種類が多いステージは2列にする。1列のままだと縦に収まらず、カード列が
    // スクロールしてしまい、「上へスワイプして駒を引き出す」操作とぶつかる。
    <div className="cards" data-dense={order.length >= 5 ? 'true' : undefined}>
      {order.map((sp) => (
        <AnimalCard
          key={sp}
          species={sp}
          state={state}
          draggingId={draggingId}
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
  draggingId,
  onDragStart,
  onDragMove,
  onDragEnd,
  boardCell,
}: { species: Species; state: GameState } & Omit<Props, 'state'>) {
  const remaining = state.tray.filter((a) => a.species === species);
  const conditions = conditionsFor(state.stage, species);
  const violating = state.placed.some(
    (p) => p.species === species && conditions.some((c) => !isSpeciesConditionSatisfied(state, species, c))
  );
  const total = state.stage.animals.filter((a) => a.species === species).length;
  const { w, h } = boundingBox(species);
  const next = remaining[0];

  const handlers = usePieceDrag({
    enabled: !!next,
    // つかんだ瞬間に盤面と同じ大きさへ変え、指の位置を駒の中心に合わせる。
    // カードの中の駒は小さいので、そのままの大きさで引き出すと狙いが付けにくい。
    onGrab: (x, y) =>
      next
        ? { instanceId: next.instanceId, left: x - (w * boardCell) / 2, top: y - (h * boardCell) / 2 }
        : null,
    onDragStart,
    onDragMove,
    onDragEnd,
  });

  return (
    <div
      {...handlers}
      className="card"
      data-violating={violating ? 'true' : undefined}
      data-dimmed={remaining.length === 0 ? 'true' : undefined}>
      {/* 1マスの大きさを全カードで共通にしているので、ここを見れば
          「何マス分の、どんな形の駒か」が分かる。 */}
      <span
        className="card-slot"
        style={{ '--cell': `${CARD_CELL}px`, '--gap': `${CARD_GAP}px`, width: CARD_SLOT } as CSSProperties}>
        <Piece
          species={species}
          w={w}
          h={h}
          dimmed={remaining.length === 0}
          hidden={!!next && next.instanceId === draggingId}
        />
        {/* 何匹残っているか。1匹しかいない種では出さない（常に「1」で情報が無い）。
            0 匹になったことはカード全体を薄くすることで伝える。 */}
        {total > 1 && <span className="card-count">{remaining.length}</span>}
      </span>

      <span className="card-body">
        <span className="card-name">{speciesLabel[species]}</span>

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

import { useRef, type PointerEvent as ReactPointerEvent } from 'react';

/** この距離を超えて指が動いたらドラッグを開始する。画面全体で同じ値を使う。
 *  小さすぎると画面のスクロールのつもりが駒を掴んでしまい、
 *  大きすぎると掴み始めが鈍く感じる。 */
export const DRAG_THRESHOLD = 7;

export type Grab = {
  instanceId: string;
  /** つかんだ瞬間の駒の左上（画面座標）。つまんだ場所ではないので、
   *  大きい駒をどこでつまんでも狙いがずれない。 */
  left: number;
  top: number;
};

type Options = {
  /** 押した座標から「何をつかんだか」を返す。何も無ければ null。 */
  onGrab: (x: number, y: number) => Grab | null;
  onDragStart: (instanceId: string, left: number, top: number) => void;
  onDragMove: (dx: number, dy: number) => void;
  onDragEnd: () => void;
  enabled?: boolean;
};

/**
 * つまんで動かす操作。ポインタイベントで自前に組む。
 *
 * **操作はドラッグだけ。** タップで選んでタップで置く方式は直感的でないため
 * 廃止した。指を離した場所がそのまま結果になるので、いま何が選ばれているかを
 * 覚えておく必要がない。
 *
 * 座標は毎回イベントから取り、何も保持しない。
 */
export function usePieceDrag({ onGrab, onDragStart, onDragMove, onDragEnd, enabled = true }: Options) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const grabbed = useRef<Grab | null>(null);
  const dragging = useRef(false);

  const reset = () => {
    start.current = null;
    grabbed.current = null;
    dragging.current = false;
  };

  return {
    onPointerDown: (e: ReactPointerEvent) => {
      if (!enabled || !e.isPrimary) return;
      const grab = onGrab(e.clientX, e.clientY);
      // つかむものが無い場所は素通りさせる。盤の余白でページを
      // スクロールできなくなるのを防ぐ。
      if (!grab) return;
      start.current = { x: e.clientX, y: e.clientY };
      grabbed.current = grab;
      dragging.current = false;
      // 指が要素の外へ出ても追い続ける。無いと盤の外へ運ぶ操作が途中で切れる。
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* 対応していない環境では capture 無しで続行する */
      }
    },

    onPointerMove: (e: ReactPointerEvent) => {
      const s = start.current;
      const grab = grabbed.current;
      if (!s || !grab) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (!dragging.current) {
        if (Math.hypot(dx, dy) <= DRAG_THRESHOLD) return;
        dragging.current = true;
        onDragStart(grab.instanceId, grab.left, grab.top);
      }
      onDragMove(dx, dy);
    },

    onPointerUp: () => {
      if (dragging.current) onDragEnd();
      reset();
    },

    // 指が途中で無効化された（通知・電話・ブラウザのジェスチャ）。
    // 掴んだままの状態を残さないことが大事。
    onPointerCancel: () => {
      if (dragging.current) onDragEnd();
      reset();
    },
  };
}

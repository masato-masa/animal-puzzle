import { useRef, type PointerEvent as ReactPointerEvent } from 'react';

/** タップとドラッグの分かれ目。画面全体で同じ値を使う。
 *  小さすぎると普通のタップが誤ってドラッグになり、大きすぎると掴み始めが鈍る。 */
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
  /** 指が閾値まで動かなかったとき。押した座標を渡す。 */
  onTap: (x: number, y: number, grabbed: Grab | null) => void;
  onDragStart: (instanceId: string, left: number, top: number) => void;
  onDragMove: (dx: number, dy: number) => void;
  onDragEnd: () => void;
  enabled?: boolean;
};

/**
 * つまんで動かす操作。ポインタイベントで自前に組む。
 *
 * ジェスチャライブラリに載せると、タップまでそのライブラリの状態機械を通る。
 * タップはこのゲームの主操作なので、外部の挙動に左右されないようにしてある。
 * 座標は毎回イベントから取り、何も保持しない。
 */
export function usePieceDrag({ onGrab, onTap, onDragStart, onDragMove, onDragEnd, enabled = true }: Options) {
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
      start.current = { x: e.clientX, y: e.clientY };
      grabbed.current = onGrab(e.clientX, e.clientY);
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
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (!dragging.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        dragging.current = true;
        if (grabbed.current) onDragStart(grabbed.current.instanceId, grabbed.current.left, grabbed.current.top);
      }
      if (dragging.current && grabbed.current) onDragMove(dx, dy);
    },

    onPointerUp: () => {
      const s = start.current;
      if (!s) return;
      if (dragging.current && grabbed.current) onDragEnd();
      else onTap(s.x, s.y, grabbed.current);
      reset();
    },

    // 指が途中で無効化された（通知・電話・ブラウザのジェスチャ）。
    // 何もせずに畳む。掴んだままの状態を残さないことが大事。
    onPointerCancel: () => {
      if (dragging.current) onDragEnd();
      reset();
    },
  };
}

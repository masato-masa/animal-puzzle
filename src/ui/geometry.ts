import type { Pos } from '@/engine';

/**
 * セル間隔とカードの内側余白。**CSS に同じ数字を書かない。**
 * ここを唯一の出どころにして、盤面にインラインの CSS 変数として流し込む。
 * 二重に持つと、片方だけ変えたときに当たり判定と見た目がずれる。
 */
export const GAP = 6;
export const PAD = 16;

/** getBoundingClientRect() の必要な部分だけ。テストから作れるようにしてある。 */
export type Rect = { left: number; top: number; width: number; height: number };

/** 1マスの辺長。gap は cols-1 本しかないことに注意（cols 本ではない）。 */
export const cellSize = (rect: Rect, cols: number): number => (rect.width - GAP * (cols - 1)) / cols;

const clamp = (v: number, max: number): number => Math.min(max, Math.max(0, v));

/**
 * 画面座標を盤面のマスに変える。矩形の外なら null。
 *
 * **値を一切キャッシュしない。** 呼ぶたびに rect を渡してもらう前提なので、
 * スクロール・回転・リサイズ・フォント読み込みのどれが起きてもずれない。
 * 旧実装が measureInWindow の非同期結果を保持していたのが「反応しない」の原因だった。
 */
export const cellFromPoint = (
  rect: Rect,
  rows: number,
  cols: number,
  x: number,
  y: number
): Pos | null => {
  if (x < rect.left || x > rect.left + rect.width) return null;
  if (y < rect.top || y > rect.top + rect.height) return null;
  const step = cellSize(rect, cols) + GAP;
  return {
    r: clamp(Math.floor((y - rect.top) / step), rows - 1),
    c: clamp(Math.floor((x - rect.left) / step), cols - 1),
  };
};

/**
 * 駒の左上の画面座標から、置こうとしているアンカーのマスを出す。
 * つまんだ場所ではなく駒の左上を基準にするので、2x2 の駒でも狙いがずれない。
 * 盤の外にはみ出す座標もそのまま返す（置けるかどうかは engine が決める）。
 */
export const anchorFromPiecePoint = (rect: Rect, left: number, top: number, cols: number): Pos => {
  const step = cellSize(rect, cols) + GAP;
  return {
    r: Math.round((top - rect.top) / step),
    c: Math.round((left - rect.left) / step),
  };
};

/**
 * n マス分の駒の辺長。gap を n-1 本またぐぶん、セル n 個ぶんより長い。
 * CSS 側の `calc(var(--w) * var(--cell) + (var(--w) - 1) * var(--gap))` と同じ式で、
 * ドラッグ中に指へ追従させる複製の大きさを出すのに使う。
 */
export const pieceSpan = (n: number, cell: number): number => n * cell + (n - 1) * GAP;

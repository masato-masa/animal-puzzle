import type { CSSProperties, RefObject } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import { animalAt, boundingBox, posKey, terrainAt, type GameState, type Pos } from '@/engine';
import { blockSprite } from '@/art/sprites';

import { cellFromPoint, cellSize, GAP, PAD } from './geometry';
import { Piece } from './Piece';
import { usePieceDrag } from './use-piece-drag';

/** マスにはまっていない駒の位置。.grid の左上を原点とした px。 */
export type FreePositions = Record<string, { x: number; y: number }>;

/** クリア時に駒が1つずつ跳ねる間隔（秒）。オーバーレイを出す時刻もこれで決まる。 */
export const BOUNCE_STEP = 0.08;

export type BoardProps = {
  state: GameState;
  /** 選択中の駒が置けるアンカー。posKey の集合。ここだけ光らせる。 */
  validAnchors: Set<string>;
  violatingIds: Set<string>;
  /** ドラッグ中の駒。本体は隠し、追従表示は Game が描く。 */
  draggingId: string | null;
  /** マスにはまっていない、盤の上に自由に置かれた駒。 */
  free: FreePositions;
  /** 当たり判定に使う .grid の実体。値は保持せず、イベントのたびに測り直す。 */
  gridRef: RefObject<HTMLDivElement | null>;
  /** クリアした。駒を置いた順に跳ねさせる。 */
  won: boolean;
  /** つかんだ瞬間の駒の左上（画面座標）を渡す。 */
  onDragStart: (instanceId: string, left: number, top: number) => void;
  onDragMove: (dx: number, dy: number) => void;
  onDragEnd: () => void;
};

/**
 * 盤面の描画と、盤上のジェスチャ。
 *
 * ジェスチャは .grid に 1 つだけ付ける。駒ごとに付けると入れ子でイベントを
 * 奪い合い、これが旧実装で「掴めなくなる」一因だった。
 *
 * **操作はドラッグだけ。** タップで選ぶ方式は廃止した。
 *
 * 駒は grid に一切参加させず、絶対配置で重ねる。こうすると駒を置いても
 * 消しても grid の計算結果が変わらないので、盤面が 1px も動かない。
 */
export function Board({
  state,
  validAnchors,
  violatingIds,
  draggingId,
  free,
  gridRef,
  won,
  onDragStart,
  onDragMove,
  onDragEnd,
}: BoardProps) {
  const { stage, placed, tray } = state;
  const still = useReducedMotion();

  /** マスにはまっていない駒。tray に居るが盤の上に置かれている。 */
  const freePieces = tray.filter((a) => a.instanceId in free);

  /** 押した座標から、そのマスを覆っている駒を探す。矩形は毎回測り直すので
   *  スクロールやリサイズでずれない。 */
  const grabAt = (x: number, y: number) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const cell = cellSize(rect, stage.cols);

    // 自由に置かれた駒が上に乗っているので先に見る。手前にあるものから順に。
    for (let i = freePieces.length - 1; i >= 0; i--) {
      const a = freePieces[i];
      const p = free[a.instanceId];
      const { w, h } = boundingBox(a.species);
      const left = rect.left + p.x;
      const top = rect.top + p.y;
      const width = w * cell + (w - 1) * GAP;
      const height = h * cell + (h - 1) * GAP;
      if (x >= left && x <= left + width && y >= top && y <= top + height) {
        return { instanceId: a.instanceId, left, top };
      }
    }

    const pos = cellFromPoint(rect, stage.rows, stage.cols, x, y);
    // アンカーのマスだけでなく cells 全体を見るので、2x2 の駒はどのマスを
    // つかんでも掴める。
    const piece = pos ? animalAt(state, pos) : undefined;
    if (!piece) return null;
    return {
      instanceId: piece.instanceId,
      left: rect.left + piece.anchor.c * (cell + GAP),
      top: rect.top + piece.anchor.r * (cell + GAP),
    };
  };

  const handlers = usePieceDrag({ onGrab: grabAt, onDragStart, onDragMove, onDragEnd });

  const cells: Pos[] = [];
  for (let r = 0; r < stage.rows; r++) {
    for (let c = 0; c < stage.cols; c++) cells.push({ r, c });
  }

  return (
    <div className="board" style={{ '--pad': `${PAD}px` } as CSSProperties}>
      <div
        {...handlers}
        ref={gridRef}
        className="grid"
        style={
          {
            // GAP / PAD は geometry.ts が唯一の出どころ。CSS には書かず、ここから流す。
            '--cols': stage.cols,
            '--rows': stage.rows,
            '--gap': `${GAP}px`,
            '--pad': `${PAD}px`,
          } as CSSProperties
        }
        role="grid"
        aria-label={`${stage.cols}×${stage.rows} の盤面`}>
        {cells.map((pos) => {
          const terrain = terrainAt(stage, pos);
          const block = terrain === 'wall' || terrain === 'tree' || terrain === 'water' ? terrain : null;
          return (
            <div
              key={posKey(pos)}
              className="cell"
              data-terrain={terrain}
              data-valid={validAnchors.has(posKey(pos)) ? 'true' : undefined}
              // 揺れの位相をマスごとにずらす。全部が同じ拍で動くと、風ではなく
              // 画面全体が揺れているように見えてしまう。
              style={{ '--phase': `${((pos.r * 7 + pos.c * 13) % 10) / 10}s` } as CSSProperties}
              role="gridcell">
              {block && <img className="cell-art" src={blockSprite[block]} alt="" draggable={false} />}
            </div>
          );
        })}

        <AnimatePresence initial={false}>
          {placed.map((animal, order) => {
            const { w, h } = boundingBox(animal.species);
            return (
              <motion.div
                key={animal.instanceId}
                className="piece-slot"
                data-dragging={animal.instanceId === draggingId ? 'true' : undefined}
                style={{ '--r': animal.anchor.r, '--c': animal.anchor.c } as CSSProperties}
                // 参考アプリより damping を上げ、回転も浅くしてある。あちらは
                // 1マスに収まる猫だが、こちらは駒が footprint ぴったりなので、
                // 行きすぎが大きいと隣のマスにはみ出して見える。
                initial={still ? false : { scale: 0, rotate: -12 }}
                // クリアしたら置いた順に跳ねる。placed の並びがそのまま置いた順。
                animate={
                  won && !still
                    ? { scale: 1, rotate: 0, y: [0, -13, 0] }
                    : { scale: 1, rotate: 0 }
                }
                exit={{ scale: 0, opacity: 0, transition: { duration: 0.12 } }}
                transition={
                  won && !still
                    ? { delay: order * BOUNCE_STEP, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }
                    : { type: 'spring', stiffness: 620, damping: 26, mass: 0.7 }
                }>
                <Piece
                  species={animal.species}
                  w={w}
                  h={h}
                  violating={violatingIds.has(animal.instanceId)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* マスにはまっていない駒。離した場所にそのまま残る。
            はまっている駒より手前に出して、掴み直せることを見た目でも示す。 */}
        {freePieces.map((a) => {
          const { w, h } = boundingBox(a.species);
          const p = free[a.instanceId];
          return (
            <div
              key={a.instanceId}
              className="piece-slot piece-slot-free"
              data-dragging={a.instanceId === draggingId ? 'true' : undefined}
              style={{ '--w': w, '--h': h, left: p.x, top: p.y } as CSSProperties}>
              <Piece species={a.species} w={w} h={h} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

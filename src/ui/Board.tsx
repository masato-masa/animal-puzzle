import { useEffect, type CSSProperties, type RefObject } from 'react';
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'motion/react';

import { animalAt, boundingBox, posKey, terrainAt, type GameState, type Pos } from '@/engine';
import { TreeIcon, WaterIcon } from '@/art/blocks';

import { cellFromPoint, cellSize, GAP, PAD } from './geometry';
import { Piece } from './Piece';
import { usePieceDrag } from './use-piece-drag';

/** クリア時に駒が1つずつ跳ねる間隔（秒）。オーバーレイを出す時刻もこれで決まる。 */
export const BOUNCE_STEP = 0.08;

export type BoardProps = {
  state: GameState;
  /** 選択中の駒が置けるアンカー。posKey の集合。ここだけ光らせる。 */
  validAnchors: Set<string>;
  selectedId: string | null;
  violatingIds: Set<string>;
  /** ドラッグ中の駒。本体は隠し、追従表示は Game が描く。 */
  draggingId: string | null;
  /** 当たり判定に使う .grid の実体。値は保持せず、イベントのたびに測り直す。 */
  gridRef: RefObject<HTMLDivElement | null>;
  /** 値が変わるたびに盤を1回振る。置けない場所を押したことを伝える。 */
  rejectToken: number;
  /** クリアした。駒を置いた順に跳ねさせる。 */
  won: boolean;
  onCellPress: (pos: Pos) => void;
  onPiecePress: (instanceId: string) => void;
  /** つかんだ瞬間の駒の左上（画面座標）を渡す。 */
  onDragStart: (instanceId: string, left: number, top: number) => void;
  onDragMove: (dx: number, dy: number) => void;
  onDragEnd: () => void;
};

/**
 * 盤面の描画と、盤上のジェスチャ。
 *
 * useDrag は .grid に 1 つだけ付ける。駒ごとに付けると入れ子でイベントを
 * 奪い合い、これが旧実装で「掴めなくなる」一因だった。
 *
 * 駒は grid に一切参加させず、絶対配置で重ねる。こうすると駒を置いても
 * 消しても grid の計算結果が変わらないので、盤面が 1px も動かない。
 */
export function Board({
  state,
  validAnchors,
  selectedId,
  violatingIds,
  draggingId,
  gridRef,
  rejectToken,
  won,
  onCellPress,
  onPiecePress,
  onDragStart,
  onDragMove,
  onDragEnd,
}: BoardProps) {
  const { stage, placed } = state;
  const controls = useAnimationControls();
  const still = useReducedMotion();

  // 置けない場所に置こうとした。左右に短く振って弾かれたことを伝える。
  useEffect(() => {
    if (rejectToken === 0 || still) return;
    void controls.start({
      x: [0, -5, 5, -3.5, 3.5, 0],
      transition: { duration: 0.34, ease: 'easeInOut' },
    });
  }, [rejectToken, controls, still]);

  /** 押した座標から、そのマスを覆っている駒を探す。矩形は毎回測り直すので
   *  スクロールやリサイズでずれない。 */
  const grabAt = (x: number, y: number) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const pos = cellFromPoint(rect, stage.rows, stage.cols, x, y);
    // アンカーのマスだけでなく cells 全体を見るので、2x2 の駒はどのマスを
    // つかんでも掴める。
    const piece = pos ? animalAt(state, pos) : undefined;
    if (!piece) return null;
    const cell = cellSize(rect, stage.cols);
    return {
      instanceId: piece.instanceId,
      left: rect.left + piece.anchor.c * (cell + GAP),
      top: rect.top + piece.anchor.r * (cell + GAP),
    };
  };

  const handlers = usePieceDrag({
    onGrab: grabAt,
    onTap: (x, y, grabbed) => {
      if (grabbed) {
        onPiecePress(grabbed.instanceId);
        return;
      }
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pos = cellFromPoint(rect, stage.rows, stage.cols, x, y);
      if (pos) onCellPress(pos);
    },
    onDragStart,
    onDragMove,
    onDragEnd,
  });

  const cells: Pos[] = [];
  for (let r = 0; r < stage.rows; r++) {
    for (let c = 0; c < stage.cols; c++) cells.push({ r, c });
  }

  return (
    /* 揺れはカード側に掛ける。ジェスチャを載せた要素に motion を重ねると、
       framer-motion のパン用 onDragStart と自前のハンドラが同名 prop で衝突する。 */
    <motion.div className="board" animate={controls} style={{ '--pad': `${PAD}px` } as CSSProperties}>
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
          return (
            <div
              key={posKey(pos)}
              className="cell"
              data-terrain={terrain}
              data-valid={validAnchors.has(posKey(pos)) ? 'true' : undefined}
              role="gridcell"
            >
              {terrain === 'water' && <WaterIcon />}
              {terrain === 'tree' && <TreeIcon />}
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
                data-selected={animal.instanceId === selectedId ? 'true' : undefined}
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
      </div>
    </motion.div>
  );
}

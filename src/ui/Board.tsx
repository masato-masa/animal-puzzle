import { useEffect, type CSSProperties, type RefObject } from 'react';
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'motion/react';

import { boundingBox, posKey, terrainAt, type GameState, type Pos } from '@/engine';
import { TreeIcon, WaterIcon } from '@/art/blocks';

import { GAP, PAD } from './geometry';
import { Piece } from './Piece';

export type BoardProps = {
  state: GameState;
  /** 選択中の駒が置けるアンカー。posKey の集合。ここだけ光らせる。 */
  validAnchors: Set<string>;
  selectedId: string | null;
  violatingIds: Set<string>;
  /** 当たり判定に使う .grid の実体。値は保持せず、イベントのたびに測り直す。 */
  gridRef: RefObject<HTMLDivElement | null>;
  /** 値が変わるたびに盤を1回振る。置けない場所を押したことを伝える。 */
  rejectToken: number;
  onCellPress: (pos: Pos) => void;
  onPiecePress: (instanceId: string) => void;
};

/**
 * 盤面の描画。駒は grid に一切参加させず、絶対配置で重ねる。
 * こうすると駒を置いても消しても grid の計算結果が変わらないので、
 * 盤面が 1px も動かない。
 */
export function Board({
  state,
  validAnchors,
  selectedId,
  violatingIds,
  gridRef,
  rejectToken,
  onCellPress,
  onPiecePress,
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

  const cells: Pos[] = [];
  for (let r = 0; r < stage.rows; r++) {
    for (let c = 0; c < stage.cols; c++) cells.push({ r, c });
  }

  return (
    <div className="board" style={{ '--pad': `${PAD}px` } as CSSProperties}>
      <motion.div
        ref={gridRef}
        className="grid"
        animate={controls}
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
              onPointerUp={() => onCellPress(pos)}
              role="gridcell">
              {terrain === 'water' && <WaterIcon />}
              {terrain === 'tree' && <TreeIcon />}
            </div>
          );
        })}

        <AnimatePresence initial={false}>
          {placed.map((animal) => {
            const { w, h } = boundingBox(animal.species);
            return (
              <motion.div
                key={animal.instanceId}
                className="piece-slot"
                data-selected={animal.instanceId === selectedId ? 'true' : undefined}
                style={{ '--r': animal.anchor.r, '--c': animal.anchor.c } as CSSProperties}
                // 参考アプリより damping を上げ、回転も浅くしてある。あちらは
                // 1マスに収まる猫だが、こちらは駒が footprint ぴったりなので、
                // 行きすぎが大きいと隣のマスにはみ出して見える。
                initial={still ? false : { scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0, transition: { duration: 0.12 } }}
                transition={{ type: 'spring', stiffness: 620, damping: 26, mass: 0.7 }}
                onPointerUp={(e) => {
                  // 下のマスにも届くと「置き直し」が「選択解除」に化ける。
                  e.stopPropagation();
                  onPiecePress(animal.instanceId);
                }}>
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
      </motion.div>
    </div>
  );
}

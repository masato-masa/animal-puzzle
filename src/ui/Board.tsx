import type { CSSProperties, RefObject } from 'react';

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
};

/**
 * 盤面の描画。駒は grid に一切参加させず、絶対配置で重ねる。
 * こうすると駒を置いても消しても grid の計算結果が変わらないので、
 * 盤面が 1px も動かない。
 */
export function Board({ state, validAnchors, selectedId, violatingIds, gridRef }: BoardProps) {
  const { stage, placed } = state;
  const cells: Pos[] = [];
  for (let r = 0; r < stage.rows; r++) {
    for (let c = 0; c < stage.cols; c++) cells.push({ r, c });
  }

  return (
    <div className="board" style={{ '--pad': `${PAD}px` } as CSSProperties}>
      <div
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
              role="gridcell">
              {terrain === 'water' && <WaterIcon />}
              {terrain === 'tree' && <TreeIcon />}
            </div>
          );
        })}

        {placed.map((animal) => {
          const { w, h } = boundingBox(animal.species);
          return (
            <div
              key={animal.instanceId}
              className="piece-slot"
              data-selected={animal.instanceId === selectedId ? 'true' : undefined}
              style={{ '--r': animal.anchor.r, '--c': animal.anchor.c } as CSSProperties}>
              <Piece
                species={animal.species}
                w={w}
                h={h}
                violating={violatingIds.has(animal.instanceId)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

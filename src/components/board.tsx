import type { RefObject } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { boundingBox, terrainAt, type GameState, type Pos, type Species } from '@/engine';

import { AnimalPiece } from './animal-piece';
import { BoardCell } from './board-cell';
import { Draggable } from './draggable';
import { PopIn } from './pop-in';

const grassBg = require('@/assets/images/terrain/grass-bg.png');
const cornerTL = require('@/assets/images/fence/corner-tl.png');
const cornerTR = require('@/assets/images/fence/corner-tr.png');
const cornerBL = require('@/assets/images/fence/corner-bl.png');
const cornerBR = require('@/assets/images/fence/corner-br.png');
const railH = require('@/assets/images/fence/rail-h.png');
const railV = require('@/assets/images/fence/rail-v.png');

type Props = {
  state: GameState;
  /** 1マスの辺長(px)。呼び出し側で画面幅から算出する。 */
  cell: number;
  violatingIds: Set<string>;
  /** ドラッグ中のピース。見た目は呼び出し側のDragOverlayが描くので、ここでは空欄として扱う。 */
  hiddenInstanceId: string | null;
  onPieceDragStart: (instanceId: string, species: Species, anchor: Pos, pageX: number, pageY: number) => void;
  onPieceDragMove: (dx: number, dy: number) => void;
  onPieceDragEnd: (dx: number, dy: number) => void;
  /** マス目そのもの（floor）の実ページ座標を測るためのref。ドロップ判定に使う。 */
  floorRef?: RefObject<View | null>;
  onFloorLayout?: (e: LayoutChangeEvent) => void;
};

/** 盤面の描画。盤面は常に矩形で、使わないマスは茂み（wall）で埋める運用に統一している。盤面自体は柵で囲む。 */
export function Board({
  state,
  cell,
  violatingIds,
  hiddenInstanceId,
  onPieceDragStart,
  onPieceDragMove,
  onPieceDragEnd,
  floorRef,
  onFloorLayout,
}: Props) {
  const { stage, placed } = state;
  const width = stage.cols * cell;
  const height = stage.rows * cell;

  const fenceThickness = Math.round(cell * 0.9);
  const outerWidth = width + fenceThickness * 2;
  const outerHeight = height + fenceThickness * 2;
  const railSegW = cell * 2;
  const railSegH = cell * 2;
  const hCount = Math.ceil(width / railSegW);
  const vCount = Math.ceil(height / railSegH);

  const cells: Pos[] = [];
  for (let r = 0; r < stage.rows; r++) {
    for (let c = 0; c < stage.cols; c++) cells.push({ r, c });
  }

  return (
    <View style={[styles.fenceWrap, { width: outerWidth, height: outerHeight }]}>
      <Image source={cornerTL} style={{ position: 'absolute', left: 0, top: 0, width: fenceThickness, height: fenceThickness }} />
      <Image
        source={cornerTR}
        style={{ position: 'absolute', right: 0, top: 0, width: fenceThickness, height: fenceThickness }}
      />
      <Image
        source={cornerBL}
        style={{ position: 'absolute', left: 0, bottom: 0, width: fenceThickness, height: fenceThickness }}
      />
      <Image
        source={cornerBR}
        style={{ position: 'absolute', right: 0, bottom: 0, width: fenceThickness, height: fenceThickness }}
      />

      <View style={[styles.fenceRow, { top: 0, left: fenceThickness, width, height: fenceThickness }]}>
        {Array.from({ length: hCount }).map((_, i) => (
          <Image
            key={i}
            source={railH}
            resizeMode="stretch"
            style={{ position: 'absolute', left: i * railSegW, width: railSegW, height: fenceThickness }}
          />
        ))}
      </View>
      <View style={[styles.fenceRow, { bottom: 0, left: fenceThickness, width, height: fenceThickness }]}>
        {Array.from({ length: hCount }).map((_, i) => (
          <Image
            key={i}
            source={railH}
            resizeMode="stretch"
            style={{ position: 'absolute', left: i * railSegW, width: railSegW, height: fenceThickness }}
          />
        ))}
      </View>
      <View style={[styles.fenceCol, { left: 0, top: fenceThickness, width: fenceThickness, height }]}>
        {Array.from({ length: vCount }).map((_, i) => (
          <Image
            key={i}
            source={railV}
            resizeMode="stretch"
            style={{ position: 'absolute', top: i * railSegH, width: fenceThickness, height: railSegH }}
          />
        ))}
      </View>
      <View style={[styles.fenceCol, { right: 0, top: fenceThickness, width: fenceThickness, height }]}>
        {Array.from({ length: vCount }).map((_, i) => (
          <Image
            key={i}
            source={railV}
            resizeMode="stretch"
            style={{ position: 'absolute', top: i * railSegH, width: fenceThickness, height: railSegH }}
          />
        ))}
      </View>

      <View
        ref={floorRef}
        onLayout={onFloorLayout}
        style={[styles.floor, { left: fenceThickness, top: fenceThickness, width, height }]}>
        <Image source={grassBg} resizeMode="cover" style={[StyleSheet.absoluteFill, { width, height }]} />

        {cells.map((pos) => {
          const terrain = terrainAt(stage, pos);
          if (terrain === 'void' || terrain === 'land') return null;
          return (
            <View
              key={`${pos.r},${pos.c}`}
              style={[styles.cell, { left: pos.c * cell, top: pos.r * cell, width: cell, height: cell }]}>
              <BoardCell terrain={terrain} size={cell} />
            </View>
          );
        })}

        {placed.map((animal) => {
          const { w, h } = boundingBox(animal.species);
          return (
            <View
              key={animal.instanceId}
              style={[
                styles.pieceSlot,
                {
                  left: animal.anchor.c * cell,
                  top: animal.anchor.r * cell,
                  width: w * cell,
                  height: h * cell,
                },
              ]}>
              <PopIn>
                <Draggable
                  onDragStart={(pageX, pageY) => onPieceDragStart(animal.instanceId, animal.species, animal.anchor, pageX, pageY)}
                  onDragMove={onPieceDragMove}
                  onDragEnd={onPieceDragEnd}>
                  <AnimalPiece
                    species={animal.species}
                    violating={violatingIds.has(animal.instanceId)}
                    hidden={animal.instanceId === hiddenInstanceId}
                    size={{ w: w * cell, h: h * cell }}
                  />
                </Draggable>
              </PopIn>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fenceWrap: {
    position: 'relative',
    alignSelf: 'center',
  },
  fenceRow: {
    position: 'absolute',
    overflow: 'hidden',
    zIndex: 3,
  },
  fenceCol: {
    position: 'absolute',
    overflow: 'hidden',
    zIndex: 3,
  },
  floor: {
    position: 'absolute',
    overflow: 'hidden',
  },
  cell: {
    position: 'absolute',
  },
  pieceSlot: {
    position: 'absolute',
    zIndex: 2,
  },
});

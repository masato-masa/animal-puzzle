import type { RefObject } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { boundingBox, terrainAt, type GameState, type Pos, type Species } from '@/engine';
import { colors, ui } from '@/theme';

import { AnimalPiece } from './animal-piece';
import { BoardCell } from './board-cell';
import { Draggable } from './draggable';

type Props = {
  state: GameState;
  /** 1マスの辺長(px)。呼び出し側で画面幅から算出する。 */
  cell: number;
  violatingIds: Set<string>;
  /** ドラッグ中のピース。見た目は呼び出し側のDragOverlayが描くので、ここでは空欄として扱う。 */
  hiddenInstanceId: string | null;
  onPieceDragStart: (instanceId: string, species: Species, anchor: Pos, pageX: number, pageY: number) => void;
  onPieceDragMove: (dx: number, dy: number) => void;
  onPieceDragEnd: (dx: number, dy: number, pageX: number, pageY: number) => void;
  /** マス目そのもの（floor）の実ページ座標を測るためのref。ドロップ判定に使う。 */
  floorRef?: RefObject<View | null>;
  onFloorLayout?: (e: LayoutChangeEvent) => void;
};

/** 盤面の描画。voidマスは何も描かず非インタラクティブにすることで非矩形の外形を表現する。 */
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

  const cells: Pos[] = [];
  for (let r = 0; r < stage.rows; r++) {
    for (let c = 0; c < stage.cols; c++) cells.push({ r, c });
  }

  return (
    <View style={styles.frame}>
      <View ref={floorRef} onLayout={onFloorLayout} style={[styles.floor, { width, height }]}>
        {cells.map((pos) => {
          const terrain = terrainAt(stage, pos);
          if (terrain === 'void') return null;
          return (
            <View
              key={`${pos.r},${pos.c}`}
              style={[styles.cell, { left: pos.c * cell, top: pos.r * cell, width: cell, height: cell }]}>
              <BoardCell terrain={terrain} />
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
              <Draggable
                onDragStart={(pageX, pageY) => onPieceDragStart(animal.instanceId, animal.species, animal.anchor, pageX, pageY)}
                onDragMove={onPieceDragMove}
                onDragEnd={onPieceDragEnd}>
                <AnimalPiece
                  species={animal.species}
                  violating={violatingIds.has(animal.instanceId)}
                  hidden={animal.instanceId === hiddenInstanceId}
                />
              </Draggable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    backgroundColor: colors.panelBorder,
    borderRadius: ui.radius + 8,
    padding: 6,
    ...ui.shadow,
    shadowOffset: { width: 0, height: 6 },
  },
  floor: {
    position: 'relative',
    backgroundColor: colors.skyBottom,
    borderRadius: ui.radius,
    overflow: 'hidden',
  },
  cell: {
    position: 'absolute',
    padding: 1,
  },
  pieceSlot: {
    position: 'absolute',
    zIndex: 2,
  },
});

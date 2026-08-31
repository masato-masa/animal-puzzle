import { Pressable, StyleSheet, View } from 'react-native';

import { boundingBox, posKey, terrainAt, type GameState, type Pos } from '@/engine';
import { colors, ui } from '@/theme';

import { AnimalPiece } from './animal-piece';
import { BoardCell } from './board-cell';

type Props = {
  state: GameState;
  /** 1マスの辺長(px)。呼び出し側で画面幅から算出する。 */
  cell: number;
  violatingIds: Set<string>;
  /** 選択中のトレイ動物が配置可能なアンカー位置(左上セル)。未選択ならnull。 */
  validAnchors: Set<string> | null;
  onCellPress: (pos: Pos) => void;
};

/** 盤面の描画。voidマスは何も描かず非インタラクティブにすることで非矩形の外形を表現する。 */
export function Board({ state, cell, violatingIds, validAnchors, onCellPress }: Props) {
  const { stage, placed } = state;
  const width = stage.cols * cell;
  const height = stage.rows * cell;

  const cells: Pos[] = [];
  for (let r = 0; r < stage.rows; r++) {
    for (let c = 0; c < stage.cols; c++) cells.push({ r, c });
  }

  return (
    <View style={styles.frame}>
      <View style={[styles.floor, { width, height }]}>
        {cells.map((pos) => {
          const terrain = terrainAt(stage, pos);
          if (terrain === 'void') return null;
          const key = posKey(pos);
          return (
            <Pressable
              key={key}
              onPress={() => onCellPress(pos)}
              style={[styles.cell, { left: pos.c * cell, top: pos.r * cell, width: cell, height: cell }]}>
              <BoardCell
                terrain={terrain}
                validAnchor={validAnchors?.has(key) ?? false}
                dimmed={!!validAnchors && !validAnchors.has(key)}
              />
            </Pressable>
          );
        })}

        {placed.map((animal) => {
          const { w, h } = boundingBox(animal.species);
          return (
            <Pressable
              key={animal.instanceId}
              onPress={() => onCellPress(animal.anchor)}
              style={[
                styles.pieceSlot,
                {
                  left: animal.anchor.c * cell,
                  top: animal.anchor.r * cell,
                  width: w * cell,
                  height: h * cell,
                },
              ]}>
              <AnimalPiece species={animal.species} violating={violatingIds.has(animal.instanceId)} />
            </Pressable>
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

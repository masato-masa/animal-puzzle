import { StyleSheet, Text, View } from 'react-native';

import { boundingBox, type Species } from '@/engine';
import { colors, speciesEmoji, ui } from '@/theme';

import { Draggable } from './draggable';

/** トレイのミニプレビューの1マス分の単位px。 */
const CHIP_UNIT = 24;

type Props = {
  species: Species;
  hidden?: boolean;
  onDragStart: (pageX: number, pageY: number) => void;
  onDragMove: (dx: number, dy: number) => void;
  onDragEnd: (dx: number, dy: number, pageX: number, pageY: number) => void;
};

/** トレイ用の単一チップ。形状のミニプレビュー（横長/縦長/正方形）を反映する。つまんで盤面へドラッグする。 */
export function AnimalChip({ species, hidden, onDragStart, onDragMove, onDragEnd }: Props) {
  const { w, h } = boundingBox(species);
  return (
    <View style={[styles.wrapper, hidden && styles.hidden]}>
      <Draggable onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd}>
        <View style={[styles.chip, { width: w * CHIP_UNIT, height: h * CHIP_UNIT }]}>
          <Text style={styles.icon}>{speciesEmoji[species]}</Text>
        </View>
      </Draggable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    margin: 4,
  },
  hidden: {
    opacity: 0,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.panelBorder,
    backgroundColor: colors.panel,
    ...ui.shadow,
  },
  icon: {
    fontSize: 20,
  },
});

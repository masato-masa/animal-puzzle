import { Image, StyleSheet, Text, View } from 'react-native';

import { boundingBox, type Species } from '@/engine';
import { speciesArt } from '@/lib/animal-art';
import { colors, speciesEmoji, ui } from '@/theme';

import { Draggable } from './draggable';

/** トレイのミニプレビューの1マス分の単位px。 */
const CHIP_UNIT = 26;

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
  const art = speciesArt[species];
  const width = w * CHIP_UNIT;
  const height = h * CHIP_UNIT;
  return (
    <View style={[styles.wrapper, hidden && styles.hidden]}>
      <Draggable onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd}>
        {art ? (
          <Image source={art} resizeMode="stretch" style={[{ width, height }, styles.art, ui.shadow]} />
        ) : (
          <View style={[styles.chip, { width, height }]}>
            <Text style={styles.icon}>{speciesEmoji[species]}</Text>
          </View>
        )}
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
  art: {
    borderRadius: 6,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.panelBorder,
    backgroundColor: colors.panel,
    overflow: 'hidden',
    ...ui.shadow,
  },
  icon: {
    fontSize: 20,
  },
});

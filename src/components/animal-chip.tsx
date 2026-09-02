import { Image, StyleSheet, Text, View } from 'react-native';

import { boundingBox, type Species } from '@/engine';
import { speciesArt } from '@/lib/animal-art';
import { colors, speciesEmoji, ui } from '@/theme';

import { Draggable } from './draggable';
import { Shake } from './shake';

type Props = {
  species: Species;
  /** 1マスの辺長(px)。盤面のマスと同じ大きさにするため、呼び出し側から渡す。 */
  cell: number;
  hidden?: boolean;
  /** 置けない場所へドロップされて弾かれた直後に振動させる。0なら振らない。 */
  shakeToken?: number;
  onDragStart: (pageX: number, pageY: number) => void;
  onDragMove: (dx: number, dy: number) => void;
  onDragEnd: (dx: number, dy: number) => void;
};

/**
 * トレイ用の単一チップ。盤面のピースと同じ大きさ（cell基準）で表示することで、
 * つまんだ瞬間に大きさが変わらないようにする。つまんで盤面へドラッグする。
 */
export function AnimalChip({ species, cell, hidden, shakeToken, onDragStart, onDragMove, onDragEnd }: Props) {
  const { w, h } = boundingBox(species);
  const art = speciesArt[species];
  const width = w * cell;
  const height = h * cell;
  return (
    <View style={[styles.wrapper, hidden && styles.hidden]}>
      <Shake token={shakeToken ?? 0}>
        <Draggable onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd}>
          {art ? (
            <Image source={art} resizeMode="stretch" style={[{ width, height }, styles.art, ui.shadow]} />
          ) : (
            <View style={[styles.chip, { width, height }]}>
              <Text style={styles.icon}>{speciesEmoji[species]}</Text>
            </View>
          )}
        </Draggable>
      </Shake>
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

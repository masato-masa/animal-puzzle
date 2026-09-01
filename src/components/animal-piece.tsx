import { StyleSheet, Text, View } from 'react-native';

import type { Species } from '@/engine';
import { colors, speciesEmoji, ui } from '@/theme';

type Props = {
  species: Species;
  violating?: boolean;
  /** ドラッグ中の本体を隠す時に使う。マウント自体は維持しないとドラッグ操作が途中で切れてしまう。 */
  hidden?: boolean;
};

/**
 * 盤面上に配置されたピースの見た目。親（board.tsx）が footprint 分の
 * 絶対配置ボックスを用意し、その中いっぱいに描画される想定。
 */
export function AnimalPiece({ species, violating, hidden }: Props) {
  return (
    <View
      style={[
        styles.piece,
        {
          borderColor: violating ? colors.violationEdge : colors.panelBorder,
          borderWidth: violating ? 3 : 2,
          backgroundColor: violating ? 'rgba(232, 56, 47, 0.22)' : colors.panel,
        },
        hidden && styles.hidden,
      ]}>
      <Text style={styles.icon}>{speciesEmoji[species]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  piece: {
    flex: 1,
    margin: 2,
    borderRadius: ui.radius * 0.6,
    alignItems: 'center',
    justifyContent: 'center',
    ...ui.shadow,
  },
  icon: {
    fontSize: 22,
  },
  hidden: {
    opacity: 0,
  },
});

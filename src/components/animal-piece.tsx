import { StyleSheet, Text, View } from 'react-native';

import type { Species } from '@/engine';
import { colors, speciesEmoji, ui } from '@/theme';

type Props = {
  species: Species;
  violating?: boolean;
};

/**
 * 盤面上に配置されたピースの見た目。親（board.tsx）が footprint 分の
 * 絶対配置ボックスを用意し、その中いっぱいに描画される想定。
 */
export function AnimalPiece({ species, violating }: Props) {
  return (
    <View
      style={[
        styles.piece,
        {
          borderColor: violating ? colors.violationEdge : colors.panelBorder,
          borderWidth: violating ? 3 : 2,
          backgroundColor: violating ? 'rgba(232, 56, 47, 0.22)' : colors.panel,
        },
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
});

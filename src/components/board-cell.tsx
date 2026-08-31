import { StyleSheet, View } from 'react-native';

import type { Terrain } from '@/engine';
import { colors, terrainColors } from '@/theme';

type Props = {
  terrain: Terrain;
  validAnchor?: boolean;
  dimmed?: boolean;
};

/** 盤面1マス分の地形背景。voidマスは呼び出し側（board.tsx）でそもそも描画しない。 */
export function BoardCell({ terrain, validAnchor, dimmed }: Props) {
  const palette = terrainColors[terrain];
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: palette.fill, borderColor: palette.dark },
        validAnchor && styles.validAnchor,
        dimmed && styles.dimmed,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
  },
  validAnchor: {
    borderColor: colors.validTargetEdge,
    borderWidth: 3,
  },
  dimmed: {
    opacity: 0.4,
  },
});

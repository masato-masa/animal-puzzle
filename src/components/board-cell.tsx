import { StyleSheet, View } from 'react-native';

import type { Terrain } from '@/engine';
import { terrainColors } from '@/theme';

type Props = {
  terrain: Terrain | 'wall';
};

/** 盤面1マス分の地形背景。voidマスは呼び出し側（board.tsx）でそもそも描画しない。 */
export function BoardCell({ terrain }: Props) {
  const palette = terrainColors[terrain];
  return <View style={[styles.tile, { backgroundColor: palette.fill, borderColor: palette.dark }]} />;
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
  },
});

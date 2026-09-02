import { Image, StyleSheet, View } from 'react-native';

import type { Terrain } from '@/engine';
import { terrainColors } from '@/theme';

const bushArt = require('@/assets/images/terrain/bush.png');

type Props = {
  terrain: Terrain | 'wall';
  /** 1マスの辺長(px)。茂み画像をパーセント指定にするとreact-native-webで高さ0になることがあるため、実寸で渡す。 */
  size: number;
};

/** 盤面1マス分の地形背景。voidマスは呼び出し側（board.tsx）でそもそも描画しない。 */
export function BoardCell({ terrain, size }: Props) {
  if (terrain === 'wall') {
    return (
      <View style={styles.tile}>
        <Image source={bushArt} resizeMode="cover" style={{ width: size, height: size }} />
      </View>
    );
  }
  const palette = terrainColors[terrain];
  return <View style={[styles.tile, { backgroundColor: palette.fill, borderColor: palette.dark }]} />;
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
});

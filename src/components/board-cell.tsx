import { Image, StyleSheet, View } from 'react-native';

import type { Terrain } from '@/engine';
import { terrainColors } from '@/theme';

const bushArt = require('@/assets/images/terrain/bush.png');

type Props = {
  terrain: Terrain | 'wall';
  /** 1マスの辺長(px)。茂み画像をパーセント指定にするとreact-native-webで高さ0になることがあるため、実寸で渡す。 */
  size: number;
};

/**
 * 盤面1マス分の地形。voidマスは呼び出し側（board.tsx）でそもそも描画しない。
 * landは盤面共通の草原背景がそのまま透けて見えるよう何も描かず、wallは
 * 切り抜き済みの茂み画像をマスにそのまま置くだけ（枠・背景なし）。
 */
export function BoardCell({ terrain, size }: Props) {
  if (terrain === 'wall') {
    return <Image source={bushArt} resizeMode="contain" style={{ width: size, height: size }} />;
  }
  if (terrain === 'land') {
    return null;
  }
  const palette = terrainColors[terrain];
  return <View style={[styles.tile, { backgroundColor: palette.fill }]} />;
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
  },
});

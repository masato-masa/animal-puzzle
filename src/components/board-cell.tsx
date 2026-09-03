import { Image, StyleSheet, View } from 'react-native';

import type { BlockKind } from '@/engine';
import { terrainColors, ui } from '@/theme';

const bushArt = require('@/assets/images/terrain/bush.png');

type Props = {
  terrain: BlockKind;
  /** 1マスの辺長(px)。茂み画像をパーセント指定にするとreact-native-webで高さ0になることがあるため、実寸で渡す。 */
  size: number;
};

/**
 * 盤面1マス分のブロック。land と void は呼び出し側（board.tsx）で描画しない。
 * wallは切り抜き済みの茂み画像をそのまま置く（枠・背景なし）。水と木は専用の
 * イラストがまだ無いため、形と色で区別できる単色タイルで描いている。
 */
export function BoardCell({ terrain, size }: Props) {
  if (terrain === 'wall') {
    return <Image source={bushArt} resizeMode="contain" style={{ width: size, height: size }} />;
  }
  const palette = terrainColors[terrain];
  return (
    <View style={styles.cell}>
      <View
        style={[
          terrain === 'tree' ? styles.tree : styles.water,
          { backgroundColor: palette.fill, borderColor: palette.dark },
          terrain === 'tree' && { width: size * 0.78, height: size * 0.78, borderRadius: size * 0.39 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  water: {
    width: '100%',
    height: '100%',
    borderRadius: ui.radius / 2,
    borderWidth: 2,
  },
  tree: {
    borderWidth: 3,
  },
});

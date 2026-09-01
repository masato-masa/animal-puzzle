import { Image, StyleSheet, Text, View } from 'react-native';

import type { Species } from '@/engine';
import { speciesArt } from '@/lib/animal-art';
import { colors, speciesEmoji, ui } from '@/theme';

type Props = {
  species: Species;
  violating?: boolean;
  /** ドラッグ中の本体を隠す時に使う。マウント自体は維持しないとドラッグ操作が途中で切れてしまう。 */
  hidden?: boolean;
  /** ピース全体のpx寸法。Imageのサイズをパーセント指定にするとreact-native-webで高さ0になることがあるため、実寸で渡す。 */
  size: { w: number; h: number };
};

/**
 * 盤面上に配置されたピースの見た目。親（board.tsx）が footprint 分の
 * 絶対配置ボックスを用意し、その中いっぱいに描画される想定。
 * イラストを持つ種はその画像を、持たない種（ワニ・ウシツツキ等）は絵文字を表示する。
 */
export function AnimalPiece({ species, violating, hidden, size }: Props) {
  const art = speciesArt[species];
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
      {art ? (
        <Image source={art} style={{ width: size.w - 4, height: size.h - 4 }} resizeMode="contain" />
      ) : (
        <Text style={styles.icon}>{speciesEmoji[species]}</Text>
      )}
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
    overflow: 'hidden',
    ...ui.shadow,
  },
  icon: {
    fontSize: 22,
  },
  hidden: {
    opacity: 0,
  },
});

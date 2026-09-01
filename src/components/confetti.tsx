import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const COLORS = ['#FFB020', '#3FA845', '#4FB8E8', '#E8382F', '#FFD65C', '#8FBF5B'];
const COUNT = 16;

type Piece = { angle: number; distance: number; color: string; size: number; delay: number };

const PIECES: Piece[] = Array.from({ length: COUNT }, (_, i) => ({
  angle: (i / COUNT) * Math.PI * 2 + Math.random() * 0.4,
  distance: 90 + Math.random() * 70,
  color: COLORS[i % COLORS.length],
  size: 6 + Math.random() * 6,
  delay: Math.random() * 120,
}));

/** クリア時に中心から弾け散る紙吹雪。画像アセット無しで小さな色片をふわっと飛ばす。 */
export function Confetti() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 900, useNativeDriver: true }).start();
  }, [progress]);

  return (
    <View style={styles.container} pointerEvents="none">
      {PIECES.map((p, i) => {
        const tx = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.distance] });
        const ty = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.sin(p.angle) * p.distance + 40],
        });
        const opacity = progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] });
        const rotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', p.angle > Math.PI ? '-360deg' : '360deg'],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.piece,
              {
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                opacity,
                transform: [{ translateX: tx }, { translateY: ty }, { rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  piece: {
    position: 'absolute',
    borderRadius: 2,
  },
});

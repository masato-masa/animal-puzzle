import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/** マウント時に「ポンッ」と弾んで現れる演出。ピースが盤面に着地した瞬間の手応えを出す。 */
export function PopIn({ children }: { children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Animated.View style={{ flex: 1, transform: [{ scale }] }}>{children}</Animated.View>;
}

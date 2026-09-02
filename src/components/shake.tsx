import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

type Props = {
  /** 0は「振らない」。呼び出し側はtokenをインクリメントするたびに新規の振動を発生させる。 */
  token: number;
  children: React.ReactNode;
};

/** 置けない場所にドロップした時の「ダメ」フィードバック用の左右シェイク。 */
export function Shake({ token, children }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (token === 0) return;
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const translateX = anim.interpolate({ inputRange: [-1, 1], outputRange: [-7, 7] });

  return <Animated.View style={{ transform: [{ translateX }] }}>{children}</Animated.View>;
}

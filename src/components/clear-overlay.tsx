import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { colors, ui } from '@/theme';

import { ActionButton } from './action-button';

type Props = {
  hasNext: boolean;
  onNext: () => void;
  onRetry: () => void;
  onList: () => void;
};

export function ClearOverlay({ hasNext, onNext, onRetry, onList }: Props) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enter, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
  }, [enter]);

  return (
    <View style={styles.backdrop}>
      <Animated.View
        style={[
          styles.card,
          {
            opacity: enter,
            transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          },
        ]}>
        <Text style={styles.title}>クリア！</Text>
        <Text style={styles.detail}>すべての動物が条件を満たしました</Text>
        <View style={styles.buttons}>
          {hasNext ? <ActionButton label="つぎのステージ" onPress={onNext} tone="primary" /> : null}
          <ActionButton label="もういちど" onPress={onRetry} />
          <ActionButton label="ステージ一覧" onPress={onList} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 60, 90, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 10,
  },
  card: {
    backgroundColor: colors.panel,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: colors.accentDark,
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 340,
    ...ui.shadow,
    shadowOffset: { width: 0, height: 6 },
  },
  title: {
    color: colors.accent,
    fontSize: 34,
    fontWeight: '900',
  },
  detail: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttons: {
    marginTop: 14,
    gap: 10,
    width: '100%',
    alignItems: 'center',
  },
});

import { StyleSheet, Text, View } from 'react-native';

import { colors, ui } from '@/theme';

import { ActionButton } from './action-button';

type Props = {
  title: string;
  message?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * react-native-webはAlert.alertが何もしない実装のため、破壊的な操作の確認には
 * このカスタムダイアログを使う（リセット・削除など）。
 */
export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={styles.buttons}>
          <ActionButton label="キャンセル" onPress={onCancel} />
          <ActionButton label={confirmLabel} onPress={onConfirm} tone="danger" />
        </View>
      </View>
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
    zIndex: 20,
  },
  card: {
    backgroundColor: colors.panel,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: colors.panelBorder,
    paddingVertical: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 320,
    ...ui.shadow,
    shadowOffset: { width: 0, height: 6 },
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttons: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
});

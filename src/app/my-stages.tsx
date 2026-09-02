import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import type { Stage } from '@/engine';
import { deleteCustomStage, listCustomStages } from '@/storage/custom-stages';
import { colors, ui } from '@/theme';

/** ピース数からざっくりした難易度の目安（★の数）を出す。 */
const difficultyStars = (pieceCount: number): string => {
  const stars = pieceCount <= 2 ? 1 : pieceCount <= 5 ? 2 : 3;
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
};

export default function MyStagesScreen() {
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>([]);

  const reload = useCallback(() => {
    listCustomStages().then(setStages);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const handleDelete = (stage: Stage) => {
    Alert.alert('削除しますか？', stage.name, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomStage(stage.id);
          reload();
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <BackButton onPress={() => router.back()} />
      <Text style={styles.title}>マイステージ</Text>

      {stages.length === 0 ? (
        <Text style={styles.empty}>まだステージがありません。エディタで作ってみましょう。</Text>
      ) : (
        stages.map((stage) => (
          <View key={stage.id} style={styles.row}>
            <Pressable
              style={styles.rowMain}
              onPress={() => router.push({ pathname: '/game/[stageId]', params: { stageId: stage.id } })}>
              <Text style={styles.rowLabel}>{stage.name}</Text>
              <Text style={styles.rowMeta}>
                {stage.rows}x{stage.cols} ・ {difficultyStars(stage.animals.length)}
              </Text>
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={() => handleDelete(stage)}>
              <Text style={styles.deleteButtonLabel}>削除</Text>
            </Pressable>
          </View>
        ))
      )}

      <Pressable style={styles.createButton} onPress={() => router.push('/editor')}>
        <Text style={styles.createButtonLabel}>＋ 新しいステージを作る</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingTop: 56,
    gap: 14,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '700',
    marginVertical: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowMain: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: ui.radius,
    borderWidth: 2,
    borderColor: colors.panelBorder,
    paddingVertical: 14,
    paddingHorizontal: 18,
    ...ui.shadow,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  rowMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  deleteButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.dangerDark,
    backgroundColor: 'rgba(232, 56, 47, 0.12)',
  },
  deleteButtonLabel: {
    color: colors.dangerDark,
    fontWeight: '900',
    fontSize: 12,
  },
  createButton: {
    alignSelf: 'center',
    marginTop: 12,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.accentDark,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    ...ui.shadow,
  },
  createButtonLabel: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 15,
  },
});

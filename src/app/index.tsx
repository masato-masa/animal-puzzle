import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CHAPTERS, getStage } from '@/levels/stages';
import { loadProgress } from '@/storage/progress';
import { colors, ui } from '@/theme';

export default function StageSelectScreen() {
  const router = useRouter();
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadProgress().then((p) => {
        if (active) setClearedIds(new Set(p.clearedStageIds));
      });
      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.appTitle}>動物パズル</Text>
      {CHAPTERS.map((chapter) => (
        <View key={chapter.id} style={styles.chapter}>
          <Text style={styles.chapterTitle}>{chapter.name}</Text>
          {chapter.stageIds.map((stageId) => {
            const stage = getStage(stageId);
            if (!stage) return null;
            const cleared = clearedIds.has(stageId);
            return (
              <Pressable
                key={stageId}
                style={styles.row}
                onPress={() => router.push({ pathname: '/game/[stageId]', params: { stageId } })}>
                <Text style={styles.rowLabel}>{stage.name}</Text>
                {cleared ? <Text style={styles.rowCheck}>✓ クリア</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingTop: 56,
    alignItems: 'stretch',
    gap: 20,
  },
  appTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  chapter: {
    gap: 10,
  },
  chapterTitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '900',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  rowCheck: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '900',
  },
});

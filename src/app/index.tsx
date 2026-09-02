import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Species } from '@/engine';
import { CHAPTERS, getStage } from '@/levels/stages';
import { speciesArt } from '@/lib/animal-art';
import { loadProgress } from '@/storage/progress';
import { colors, speciesEmoji, ui } from '@/theme';

/** ピース数からざっくりした難易度の目安（★の数）を出す。 */
const difficultyStars = (pieceCount: number): number => (pieceCount <= 2 ? 1 : pieceCount <= 5 ? 2 : 3);

const uniqueSpecies = (species: Species[]): Species[] => Array.from(new Set(species));

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
      {CHAPTERS.map((chapter) => {
        const chapterClearedCount = chapter.stageIds.filter((id) => clearedIds.has(id)).length;
        return (
          <View key={chapter.id} style={styles.chapter}>
            <View style={styles.chapterHeader}>
              <Text style={styles.chapterTitle}>{chapter.name}</Text>
              <Text style={styles.chapterProgress}>
                {chapterClearedCount}/{chapter.stageIds.length} クリア
              </Text>
            </View>
            {chapter.stageIds.map((stageId) => {
              const stage = getStage(stageId);
              if (!stage) return null;
              const cleared = clearedIds.has(stageId);
              const thumbSpecies = uniqueSpecies(stage.animals.map((a) => a.species)).slice(0, 4);
              return (
                <Pressable
                  key={stageId}
                  style={[styles.row, cleared && styles.rowCleared]}
                  onPress={() => router.push({ pathname: '/game/[stageId]', params: { stageId } })}>
                  <View style={styles.thumbRow}>
                    {thumbSpecies.map((sp, i) => {
                      const art = speciesArt[sp];
                      const overlap = i === 0 ? null : styles.thumbOverlap;
                      return art ? (
                        <Image key={i} source={art} resizeMode="cover" style={[styles.thumb, overlap]} />
                      ) : (
                        <View key={i} style={[styles.thumbEmoji, overlap]}>
                          <Text style={styles.thumbEmojiText}>{speciesEmoji[sp]}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.rowTextCol}>
                    <Text style={styles.rowLabel}>{stage.name}</Text>
                    <Text style={styles.rowStars}>
                      {'★'.repeat(difficultyStars(stage.animals.length))}
                      {'☆'.repeat(3 - difficultyStars(stage.animals.length))}
                    </Text>
                  </View>
                  {cleared ? <Text style={styles.rowCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        );
      })}

      <Pressable style={styles.myStagesButton} onPress={() => router.push('/my-stages')}>
        <Text style={styles.myStagesButtonLabel}>マイステージ / ステージを作る</Text>
      </Pressable>
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
  chapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  chapterTitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '900',
  },
  chapterProgress: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.panel,
    borderRadius: ui.radius,
    borderWidth: 2,
    borderColor: colors.panelBorder,
    paddingVertical: 10,
    paddingHorizontal: 14,
    ...ui.shadow,
  },
  rowCleared: {
    backgroundColor: colors.landLight,
    borderColor: colors.success,
  },
  thumbRow: {
    flexDirection: 'row',
  },
  thumb: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.panel,
  },
  thumbEmoji: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.panel,
    backgroundColor: colors.landLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbOverlap: {
    marginLeft: -10,
  },
  thumbEmojiText: {
    fontSize: 16,
  },
  rowTextCol: {
    flex: 1,
    gap: 4,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  rowStars: {
    color: colors.accentDark,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  rowCheck: {
    color: colors.success,
    fontSize: 20,
    fontWeight: '900',
  },
  myStagesButton: {
    alignSelf: 'center',
    marginTop: 8,
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.panelBorder,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    ...ui.shadow,
  },
  myStagesButtonLabel: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 14,
  },
});

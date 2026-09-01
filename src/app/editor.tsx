import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import {
  MAX_ANIMALS_PER_STAGE,
  SPECIES,
  countSolutions,
  validateStage,
  type AnimalInstance,
  type CellTerrain,
  type Species,
  type Stage,
} from '@/engine';
import { generateCustomStageId, saveCustomStage } from '@/storage/custom-stages';
import { colors, speciesEmoji, speciesLabel, terrainColors, ui } from '@/theme';

const ALL_SPECIES = Object.keys(SPECIES) as Species[];

const PAINT_OPTIONS: { terrain: CellTerrain; label: string }[] = [
  { terrain: 'land', label: '平地' },
  { terrain: 'water', label: '水場' },
  { terrain: 'sky', label: '空' },
  { terrain: 'wall', label: '壁' },
  { terrain: 'void', label: 'void' },
];

const MIN_SIZE = 5;
const MAX_SIZE = 8;

const makeGrid = (rows: number, cols: number): CellTerrain[][] =>
  Array.from({ length: rows }, () => Array<CellTerrain>(cols).fill('land'));

const buildAnimals = (counts: Record<Species, number>): AnimalInstance[] => {
  const list: AnimalInstance[] = [];
  for (const species of ALL_SPECIES) {
    for (let i = 0; i < counts[species]; i++) list.push({ instanceId: `${species}-${i}`, species });
  }
  return list;
};

const emptyCounts = (): Record<Species, number> =>
  Object.fromEntries(ALL_SPECIES.map((s) => [s, 0])) as Record<Species, number>;

type CheckResult =
  | { kind: 'errors'; errors: string[] }
  | { kind: 'none' }
  | { kind: 'unique' }
  | { kind: 'multiple' };

export default function EditorScreen() {
  const router = useRouter();
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [terrain, setTerrain] = useState<CellTerrain[][]>(() => makeGrid(5, 5));
  const [paint, setPaint] = useState<CellTerrain>('land');
  const [counts, setCounts] = useState<Record<Species, number>>(emptyCounts);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const totalAnimals = ALL_SPECIES.reduce((sum, s) => sum + counts[s], 0);

  const stage: Stage = useMemo(
    () => ({ id: 'draft', name: name || '無題のステージ', rows, cols, terrain, animals: buildAnimals(counts) }),
    [name, rows, cols, terrain, counts]
  );

  const resize = (nextRows: number, nextCols: number) => {
    setRows(nextRows);
    setCols(nextCols);
    setTerrain(makeGrid(nextRows, nextCols));
    setResult(null);
  };

  const paintCell = (r: number, c: number) => {
    setTerrain((prev) => prev.map((row, ri) => (ri === r ? row.map((t, ci) => (ci === c ? paint : t)) : row)));
    setResult(null);
  };

  const changeCount = (species: Species, delta: number) => {
    setCounts((prev) => {
      const next = Math.max(0, prev[species] + delta);
      return { ...prev, [species]: next };
    });
    setResult(null);
  };

  const runCheck = () => {
    const errors = validateStage(stage);
    if (errors.length > 0) {
      setResult({ kind: 'errors', errors });
      return;
    }
    const count = countSolutions(stage, 2);
    if (count === 0) setResult({ kind: 'none' });
    else if (count === 1) setResult({ kind: 'unique' });
    else setResult({ kind: 'multiple' });
  };

  const canSave = result?.kind === 'unique' && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const id = generateCustomStageId();
    await saveCustomStage({ ...stage, id, name: name || '無題のステージ' });
    setSaving(false);
    router.push({ pathname: '/game/[stageId]', params: { stageId: id } });
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <BackButton onPress={() => router.back()} />
      <Text style={styles.title}>ステージエディタ</Text>

      <Section label="盤面サイズ">
        <View style={styles.row}>
          <SizeStepper label="たて" value={rows} onChange={(v) => resize(v, cols)} />
          <SizeStepper label="よこ" value={cols} onChange={(v) => resize(rows, v)} />
        </View>
      </Section>

      <Section label="地形をえらんでマスをタップ">
        <View style={styles.row}>
          {PAINT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.terrain}
              onPress={() => setPaint(opt.terrain)}
              style={[styles.paintButton, paint === opt.terrain && styles.paintButtonSelected]}>
              <Text style={styles.paintButtonLabel}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.grid}>
          {terrain.map((row, r) => (
            <View key={r} style={styles.gridRow}>
              {row.map((t, c) => (
                <Pressable
                  key={c}
                  onPress={() => paintCell(r, c)}
                  style={[
                    styles.gridCell,
                    t === 'void'
                      ? styles.gridCellVoid
                      : { backgroundColor: terrainColors[t].fill, borderColor: terrainColors[t].dark },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </Section>

      <Section label={`動物をえらぶ（${totalAnimals} / ${MAX_ANIMALS_PER_STAGE}）`}>
        {ALL_SPECIES.map((species) => (
          <View key={species} style={styles.animalRow}>
            <Text style={styles.animalIcon}>{speciesEmoji[species]}</Text>
            <Text style={styles.animalLabel}>{speciesLabel[species]}</Text>
            <View style={styles.stepper}>
              <Pressable style={styles.stepperButton} onPress={() => changeCount(species, -1)}>
                <Text style={styles.stepperButtonLabel}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{counts[species]}</Text>
              <Pressable style={styles.stepperButton} onPress={() => changeCount(species, 1)}>
                <Text style={styles.stepperButtonLabel}>＋</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </Section>

      <Pressable style={styles.checkButton} onPress={runCheck}>
        <Text style={styles.checkButtonLabel}>検証する</Text>
      </Pressable>

      {result ? <ResultView result={result} /> : null}

      <Section label="ステージ名">
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="れい: サバンナのしょしんしゃ"
          placeholderTextColor={colors.textMuted}
        />
      </Section>

      <Pressable
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        disabled={!canSave}
        onPress={handleSave}>
        <Text style={styles.saveButtonLabel}>保存してあそぶ</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function SizeStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.animalLabel}>{label}</Text>
      <Pressable
        style={styles.stepperButton}
        onPress={() => value > MIN_SIZE && onChange(value - 1)}>
        <Text style={styles.stepperButtonLabel}>−</Text>
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable
        style={styles.stepperButton}
        onPress={() => value < MAX_SIZE && onChange(value + 1)}>
        <Text style={styles.stepperButtonLabel}>＋</Text>
      </Pressable>
    </View>
  );
}

function ResultView({ result }: { result: CheckResult }) {
  if (result.kind === 'errors') {
    return (
      <View style={[styles.resultBox, styles.resultError]}>
        {result.errors.map((e, i) => (
          <Text key={i} style={styles.resultErrorText}>
            ・{e}
          </Text>
        ))}
      </View>
    );
  }
  if (result.kind === 'none') {
    return (
      <View style={[styles.resultBox, styles.resultError]}>
        <Text style={styles.resultErrorText}>解がありません。配置できない条件になっています。</Text>
      </View>
    );
  }
  if (result.kind === 'multiple') {
    return (
      <View style={[styles.resultBox, styles.resultError]}>
        <Text style={styles.resultErrorText}>配置パターンが複数あります。壁などで絞り込んでください。</Text>
      </View>
    );
  }
  return (
    <View style={[styles.resultBox, styles.resultOk]}>
      <Text style={styles.resultOkText}>唯一解です！保存できます。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingTop: 56,
    gap: 18,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '900',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paintButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.panelBorder,
    backgroundColor: colors.panel,
  },
  paintButtonSelected: {
    borderColor: colors.validTargetEdge,
    backgroundColor: 'rgba(255, 214, 92, 0.35)',
  },
  paintButtonLabel: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 13,
  },
  grid: {
    alignSelf: 'flex-start',
    backgroundColor: colors.panelBorder,
    padding: 4,
    borderRadius: 10,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    width: 32,
    height: 32,
    margin: 1,
    borderWidth: 1,
    borderRadius: 4,
  },
  gridCellVoid: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  animalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  animalIcon: {
    fontSize: 20,
    width: 28,
  },
  animalLabel: {
    color: colors.text,
    fontWeight: '700',
    flex: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.panelBorder,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    ...ui.shadow,
  },
  stepperButtonLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  stepperValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    minWidth: 24,
    textAlign: 'center',
  },
  checkButton: {
    alignSelf: 'center',
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.accentDark,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 28,
    ...ui.shadow,
  },
  checkButtonLabel: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 15,
  },
  resultBox: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
    gap: 4,
  },
  resultError: {
    backgroundColor: 'rgba(232, 56, 47, 0.12)',
    borderColor: colors.dangerDark,
  },
  resultErrorText: {
    color: colors.dangerDark,
    fontWeight: '700',
    fontSize: 13,
  },
  resultOk: {
    backgroundColor: 'rgba(63, 168, 69, 0.15)',
    borderColor: colors.successDark,
  },
  resultOkText: {
    color: colors.successDark,
    fontWeight: '900',
    fontSize: 14,
  },
  nameInput: {
    borderWidth: 2,
    borderColor: colors.panelBorder,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.panel,
    color: colors.text,
    fontWeight: '700',
  },
  saveButton: {
    alignSelf: 'center',
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.successDark,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    ...ui.shadow,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonLabel: {
    color: colors.textOnDark,
    fontWeight: '900',
    fontSize: 16,
  },
});

import { gradeStage, meetsChapterBar } from '@/lib/stage-difficulty';
import type { CellTerrain, Stage } from '@/engine';

const unsolvableStage: Stage = {
  id: 'grade-unsolvable',
  name: 'x',
  rows: 5,
  cols: 5,
  terrain: Array.from({ length: 5 }, () => Array<CellTerrain>(5).fill('wall')),
  animals: [{ instanceId: 's1', species: 'squirrel' }],
};

const l0Stage: Stage = {
  id: 'grade-l0',
  name: 'x',
  rows: 5,
  cols: 5,
  terrain: [
    ['land', 'wall', 'wall', 'wall', 'wall'],
    ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
  ],
  animals: [{ instanceId: 's1', species: 'squirrel' }],
};

const l1Stage: Stage = {
  id: 'grade-l1',
  name: 'x',
  rows: 5,
  cols: 5,
  terrain: [
    ['land', 'wall', 'wall', 'land', 'land'],
    ['land', 'wall', 'wall', 'wall', 'wall'],
    ['wall', 'wall', 'wall', 'wall', 'wall'],
    ['land', 'wall', 'wall', 'wall', 'wall'],
    ['land', 'wall', 'wall', 'wall', 'wall'],
  ],
  animals: [
    { instanceId: 'l1', species: 'lion' },
    { instanceId: 'z1', species: 'zebra' },
  ],
  rules: [{ kind: 'above', a: 'zebra', b: 'lion' }],
};

describe('gradeStage', () => {
  test('unsolvable stage: solutions 0, level unsolvable, no rule moves or effective conditions', () => {
    const grade = gradeStage(unsolvableStage);
    expect(grade.solutions).toBe(0);
    expect(grade.level).toBe('unsolvable');
    expect(grade.ruleMoves).toBe(0);
    expect(grade.effectiveConditions).toBe(0);
  });

  test('L0 stage: unique solution but geometric packing is also 1, level L0', () => {
    const grade = gradeStage(l0Stage);
    expect(grade.solutions).toBe(1);
    expect(grade.geometricPackings).toBe(1);
    expect(grade.level).toBe('L0');
  });

  test('L1 stage: unique solution, geometric packing > 1, level L1, at least one effective condition', () => {
    const grade = gradeStage(l1Stage);
    expect(grade.solutions).toBe(1);
    expect(grade.geometricPackings).toBeGreaterThan(1);
    expect(grade.level).toBe('L1');
    // ステージ限定ルール(zebra above lion)を外すとlion@(0,0)の組み合わせも許されてしまい
    // 解が2つになる。zebra自身のadjacentForbidden(lion)は常に非隣接なので外しても解は
    // 変わらない(効いていない)。よってeffectiveConditionsはルール分の1のみ。
    expect(grade.effectiveConditions).toBeGreaterThanOrEqual(1);
  });
});

describe('meetsChapterBar', () => {
  test('a grade with too few effective conditions for chapter 1 reports a condition-count reason', () => {
    const grade = gradeStage(l1Stage);
    // l1Stageの効いている条件数は1(ステージ限定ルールのみ)で、1章の必要範囲2〜3本に
    // 届かない。ここでは合否理由に条件数の指摘が含まれることを確認する。
    const reasons = meetsChapterBar(grade, 1);
    expect(reasons.some((r) => r.includes('条件数'))).toBe(true);
  });

  test('an unsolvable grade fails every chapter bar with a solutions reason', () => {
    const grade = gradeStage(unsolvableStage);
    const reasons = meetsChapterBar(grade, 1);
    expect(reasons.some((r) => r.includes('唯一解'))).toBe(true);
  });

  test('chapter 2 requires L3 or above', () => {
    const grade = gradeStage(l1Stage); // level L1
    const reasons = meetsChapterBar(grade, 2);
    expect(reasons.some((r) => r.includes('レベル'))).toBe(true);
  });
});

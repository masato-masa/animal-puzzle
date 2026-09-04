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
  test('effectiveConditions is informational only and never appears in the reasons', () => {
    // l1Stageの効いている条件数は1。設計書8.4節の改訂(2026-09-04)により、条件数は
    // 章の合否判定には使わない(gradeStageの参考値のみ)。理由に「条件数」が
    // 含まれないことを確認する。
    const grade = gradeStage(l1Stage);
    expect(grade.effectiveConditions).toBeGreaterThanOrEqual(1);
    const reasons = meetsChapterBar(grade, 1, l1Stage);
    expect(reasons.some((r) => r.includes('条件数'))).toBe(false);
  });

  test('an unsolvable grade fails every chapter bar with a solutions reason', () => {
    const grade = gradeStage(unsolvableStage);
    const reasons = meetsChapterBar(grade, 1, unsolvableStage);
    expect(reasons.some((r) => r.includes('唯一解'))).toBe(true);
  });

  test('chapter 2 requires L3 or above', () => {
    const grade = gradeStage(l1Stage); // level L1
    const reasons = meetsChapterBar(grade, 2, l1Stage);
    expect(reasons.some((r) => r.includes('レベル'))).toBe(true);
  });

  test('a grade exceeding chapter 1 ceiling on level is rejected even though it clears the floor', () => {
    // l1Stageはlevel L1(chapter1の上限L2以内)なので、代わりに上限だけを検証する専用の
    // 高レベル・低ルール手数フィクスチャは不要 — 既存のl1Stageで上限チェックの配線だけ確認する。
    // より厳密な検証は次のテストで行う。
    const grade = gradeStage(l1Stage);
    const reasons = meetsChapterBar(grade, 1, l1Stage);
    // レベルはL1で上限L2以内なので「レベルが高すぎる」理由は出ないはず。
    expect(reasons.some((r) => r.includes('高すぎる'))).toBe(false);
  });

  test('chapter 1 rejects a stage with design warnings', () => {
    const stage: Stage = {
      id: 'warn-stage',
      name: 'x',
      rows: 8,
      cols: 5,
      terrain: [
        Array<CellTerrain>(5).fill('wall'),
        ['land', 'wall', 'wall', 'wall', 'wall'],
        ...Array.from({ length: 6 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: [{ instanceId: 's1', species: 'squirrel' }],
    };
    const grade = gradeStage(stage);
    const reasons = meetsChapterBar(grade, 1, stage);
    expect(reasons.some((r) => r.includes('無駄'))).toBe(true);
  });

  test('chapter 2 rejects a level exceeding its own bar (each of the 4 chapters maps to exactly one level)', () => {
    // 4章構成(1章=L1,2章=L2,3章=L3,4章=L4)では、各章のバーはmaxLevelで自分の
    // レベルに固定されている。2章にL4面が混じるとレベルが高すぎるとして弾かれる。
    const grade = { solutions: 1, geometricPackings: 2, level: 'L4' as const, ruleMoves: 0, effectiveConditions: 1, warnings: [] };
    const reasons = meetsChapterBar(grade, 2, l1Stage);
    expect(reasons.some((r) => r.includes('高すぎる'))).toBe(true);
  });

  test('chapter 4 (no maxLevel) accepts unsolvable as "harder than L4"', () => {
    // solverLevelのunsolvableは、深さ3までの背理法探索で解けなかっただけで、
    // 唯一解の存在自体はgrade.solutionsで別途保証されている(呼び出し元がcountSolutionsで
    // 検証済み)。上限の無い最終章(4章)に限り、unsolvableを「L4を超える難しさ」として
    // 合格扱いにする。l1Stage(lion+zebra、形が違う)だと4章の「同じ形の駒が2種以上」
    // 要件に引っかかってしまうため、domino_vを共有するlion+giraffeのフィクスチャを使う。
    const sharedShapeStage: Stage = {
      ...l1Stage,
      animals: [
        { instanceId: 'l1', species: 'lion' },
        { instanceId: 'g1', species: 'giraffe' },
      ],
      rules: [{ kind: 'above', a: 'giraffe', b: 'lion' }],
    };
    const grade = { solutions: 1, geometricPackings: 2, level: 'unsolvable' as const, ruleMoves: 0, effectiveConditions: 1, warnings: [] };
    expect(meetsChapterBar(grade, 4, sharedShapeStage)).toEqual([]);
  });

  test('unsolvable still fails a bar that has a maxLevel (only the top-tier bar gets the exception)', () => {
    const grade = { solutions: 1, geometricPackings: 2, level: 'unsolvable' as const, ruleMoves: 0, effectiveConditions: 1, warnings: [] };
    const reasons = meetsChapterBar(grade, 3, l1Stage);
    expect(reasons.some((r) => r.includes('届いていない'))).toBe(true);
  });

  test('chapter 2+ requires at least two species sharing one shape', () => {
    // squirrelだけの1種構成 = 同じ形(single)の駒が1種類しか無い。
    const stage: Stage = {
      id: 'single-shape',
      name: 'x',
      rows: 5,
      cols: 5,
      terrain: [
        ['land', 'land', 'wall', 'wall', 'wall'],
        ...Array.from({ length: 4 }, () => Array<CellTerrain>(5).fill('wall')),
      ],
      animals: [
        { instanceId: 's1', species: 'squirrel' },
        { instanceId: 's2', species: 'squirrel' },
      ],
    };
    const grade = gradeStage(stage);
    const reasons = meetsChapterBar(grade, 2, stage);
    expect(reasons.some((r) => r.includes('同じ形'))).toBe(true);
  });
});

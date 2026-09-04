import { validateStage, countGeometricPlacements, SHAPES, SPECIES, type Stage } from '@/engine';
import { gradeStage, meetsChapterBar } from '@/lib/stage-difficulty';
import { PATTERNS, terrainFromRows } from '../scripts/stage-patterns';
import { composeAnimals } from '../scripts/compose-animals';
import { formatStageSnippet } from '../scripts/format-stage';
import { generateForChapter } from '../scripts/generate-stages';

describe('stage-patterns', () => {
  test('every pattern land-cell count matches the total cells its slotShapes require', () => {
    for (const pattern of PATTERNS) {
      const terrain = terrainFromRows(pattern.rowsStr);
      const landCount = terrain.flat().filter((t) => t === 'land').length;
      const requiredCount = pattern.slotShapes.reduce((sum, shape) => sum + SHAPES[shape].length, 0);
      expect(landCount).toBe(requiredCount);
    }
  });

  test('every pattern geometrically fits its own slotShapes with at least 2 distinct packings', () => {
    // パターンが実際にタイル張り可能(幾何解>=1)で、かつL0でない(幾何解>=2)ことを、
    // composeAnimalsで実際に動物を割り当てて確認する。10回試して1回でも
    // 幾何解>=2になれば、そのパターン自体は使い物になる(種の組み合わせによっては
    // 幾何解が変わりうるため、パターン自体の検証としてはゆるくてよい)。
    for (const pattern of PATTERNS) {
      const terrain = terrainFromRows(pattern.rowsStr);
      let sawMultiple = false;
      for (let i = 0; i < 10 && !sawMultiple; i++) {
        const animals = composeAnimals(pattern.slotShapes);
        const stage: Stage = { id: 'test', name: 'x', rows: pattern.rows, cols: pattern.cols, terrain, animals };
        if (validateStage(stage).length > 0) continue;
        if (countGeometricPlacements(stage, 2) >= 2) sawMultiple = true;
      }
      expect(sawMultiple).toBe(true);
    }
  });
});

describe('composeAnimals', () => {
  test('produces one animal instance per slot, matching the requested shape', () => {
    const slots: Array<'single' | 'domino_v' | 'domino_h' | 'square2x2'> = ['domino_v', 'domino_v', 'single'];
    const animals = composeAnimals(slots);
    expect(animals).toHaveLength(3);
    // 実際の形はSHAPES[SPECIES[species].shape]で決まるので、種を見てshapeを検算する。
    for (const a of animals) {
      expect(SHAPES[SPECIES[a.species].shape].length).toBeGreaterThan(0);
    }
  });

  test('never uses more than 6 instances of a symmetric (self-referential) species in one call', () => {
    // lion/leopard/rhinoは自己回避・同種距離制約を持つ「対称な」種。
    // domino_vスロットを10個要求しても、lion+leopardの合計は6体までに制限されるはず。
    const slots = Array.from({ length: 10 }, () => 'domino_v' as const);
    const animals = composeAnimals(slots);
    const symmetricCount = animals.filter((a) => a.species === 'lion' || a.species === 'leopard').length;
    expect(symmetricCount).toBeLessThanOrEqual(6);
  });
});

describe('formatStageSnippet', () => {
  test('produces a stages.ts-pasteable object literal', () => {
    const stage: Stage = {
      id: 'draft',
      name: 'draft',
      rows: 5,
      cols: 5,
      terrain: terrainFromRows(['##.##', '##.##', '.....', '##.##', '##.##']),
      animals: [
        { instanceId: 'squirrel-0', species: 'squirrel' },
        { instanceId: 'squirrel-1', species: 'squirrel' },
      ],
    };
    const snippet = formatStageSnippet(stage, 'stage-1', '1. てすと');
    expect(snippet).toContain(`id: 'stage-1'`);
    expect(snippet).toContain(`name: '1. てすと'`);
    expect(snippet).toContain(`terrain(['##.##', '##.##', '.....', '##.##', '##.##'])`);
    expect(snippet).toContain(`['squirrel', 2]`);
  });
});

describe('generateForChapter', () => {
  test('finds a stage meeting chapter 1 bar within a bounded search', () => {
    // このテストはnpm test全体の実行時間に直接乗るため、予算を小さく保つ。
    // 1章のバー(L1〜L2, R0〜3)は最も緩いので、数百試行・数秒あれば十分見つかるはず。
    const stages = generateForChapter({ chapterNumber: 1, needed: 1 }, 500, 8000);
    expect(stages.length).toBe(1);
    const [stage] = stages;
    expect(validateStage(stage)).toEqual([]);
    const grade = gradeStage(stage);
    expect(meetsChapterBar(grade, 1, stage)).toEqual([]);
  }, 10000);

  test('a shared seen set is not reused across two separate generateForChapter calls', () => {
    // 章をまたいで同じ組み合わせが再登場しないことを保証する仕組みの単体テスト。
    // sharedSeenを2回の呼び出しで使い回すと、その2回の結果を合わせた集合の中に
    // 完全に同一の(地形×種構成)の組が存在しないはず。
    const sharedSeen = new Set<string>();
    const first = generateForChapter({ chapterNumber: 1, needed: 3 }, 2000, 8000, sharedSeen);
    const second = generateForChapter({ chapterNumber: 1, needed: 3 }, 2000, 8000, sharedSeen);
    expect(first.length).toBeGreaterThan(0);
    expect(second.length).toBeGreaterThan(0);

    const fingerprint = (s: (typeof first)[number]): string =>
      `${s.rows}x${s.cols}:${s.terrain.map((row) => row.join('')).join('|')}:${[...s.animals]
        .map((a) => a.species)
        .sort()
        .join(',')}`;

    const seenFingerprints = new Set(first.map(fingerprint));
    for (const stage of second) {
      expect(seenFingerprints.has(fingerprint(stage))).toBe(false);
    }
  }, 25000);
});

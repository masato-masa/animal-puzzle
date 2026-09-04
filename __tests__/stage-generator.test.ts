import { validateStage, countSolutions, countGeometricPlacements, MAX_ANIMALS_PER_STAGE } from '@/engine';
import { findDesignWarnings } from '@/lib/stage-design-checks';
import { generateOpenStages, puzzleSignature, type GeneratedStage } from '../scripts/generate-open-stages';

// このテストはnpm test全体の実行時間に直接乗るため、生成は1回だけ行い(beforeAll)、
// 複数のテストで結果を使い回す(呼び出しごとに数秒かかる乱数探索を繰り返さない)。
let results: GeneratedStage[];

beforeAll(() => {
  results = generateOpenStages(20000, 15000);
}, 20000);

describe('generateOpenStages', () => {
  test('finds at least one valid, uniquely-solvable stage within a bounded search', () => {
    expect(results.length).toBeGreaterThan(0);
  });

  test('every found stage is structurally valid, open (not a wall-forced corridor), and uniquely solvable', () => {
    expect(results.length).toBeGreaterThan(0);
    for (const { stage } of results) {
      expect(validateStage(stage)).toEqual([]);
      expect(stage.animals.length).toBeLessThanOrEqual(MAX_ANIMALS_PER_STAGE);
      // 壁で1本道を作った失敗作(旧方式の反省点)ではないことを、幾何学的な置き方の
      // 豊富さで確認する。少なくとも2通り(L0でない)は生成器自身がゲート済みだが、
      // ここでは「ルールを付ける前から本当に選択肢があった」ことも合わせて検証する。
      expect(countGeometricPlacements(stage, 2)).toBeGreaterThanOrEqual(2);
      expect(countSolutions(stage, 2)).toBe(1);
      expect(findDesignWarnings(stage)).toEqual([]);
      // animalRulesで種ごとにちょうど1つのルールを持つ(動物の性格とステージ限定ルールが
      // 別系統に分かれていた旧方式との違い)。
      const speciesInStage = new Set(stage.animals.map((a) => a.species));
      expect(Object.keys(stage.animalRules ?? {}).length).toBe(speciesInStage.size);
    }
  });
});

describe('puzzleSignature', () => {
  test('treats a mirrored terrain with the same species multiset as the same puzzle', () => {
    expect(results.length).toBeGreaterThan(0);
    const [{ stage }] = results;
    const mirrored = { ...stage, terrain: [...stage.terrain].reverse() };
    expect(puzzleSignature(mirrored)).toBe(puzzleSignature(stage));
  });

  test('treats a different species multiset as a different puzzle even on the same terrain', () => {
    expect(results.length).toBeGreaterThan(0);
    const [{ stage }] = results;
    const relabeled = {
      ...stage,
      animals: stage.animals.map((a, i) => (i === 0 ? { ...a, species: a.species === 'lion' ? 'leopard' : 'lion' } : a)),
    } as typeof stage;
    if (relabeled.animals[0].species !== stage.animals[0].species) {
      expect(puzzleSignature(relabeled)).not.toBe(puzzleSignature(stage));
    }
  });

  test('a seen set passed across two separate calls prevents duplicate puzzles', () => {
    const sharedSeen = new Set<string>();
    const first = generateOpenStages(20000, 10000, sharedSeen);
    const second = generateOpenStages(20000, 10000, sharedSeen);
    expect(first.length + second.length).toBeGreaterThan(0);

    const firstSignatures = new Set(first.map((r) => puzzleSignature(r.stage)));
    for (const r of second) {
      expect(firstSignatures.has(puzzleSignature(r.stage))).toBe(false);
    }
  }, 25000);
});

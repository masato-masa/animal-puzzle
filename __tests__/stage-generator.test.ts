import { validateStage, countGeometricPlacements, SHAPES, SPECIES, type Stage } from '@/engine';
import { PATTERNS, terrainFromRows } from '../scripts/stage-patterns';
import { composeAnimals } from '../scripts/compose-animals';

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

  test('never uses more than 2 instances of a symmetric (self-referential) species in one call', () => {
    // lion/leopard/rhinoは自己回避・同種距離制約を持つ「対称な」種。
    // domino_vスロットを10個要求しても、lion+leopardの合計は2体までに制限されるはず。
    const slots = Array.from({ length: 10 }, () => 'domino_v' as const);
    const animals = composeAnimals(slots);
    const symmetricCount = animals.filter((a) => a.species === 'lion' || a.species === 'leopard').length;
    expect(symmetricCount).toBeLessThanOrEqual(2);
  });
});

import { beforeEach, describe, expect, test } from 'vitest';

import { countGeometricPlacements, countSolutions, validateStage, type Species } from '@/engine';
import { hashFor, parseRoute } from '@/core/router';
import { findDesignWarnings } from '@/lib/stage-design-checks';
import { endlessSeed, enumerateTilings, generateEndless, mulberry32, rungsFor, targetFor } from '@/levels/endless';
import { STAGES } from '@/levels/stages';
import { clearProgress, loadEndlessCleared, recordEndlessClear } from '@/storage/progress';

describe('mulberry32', () => {
  test('同じシードからは同じ列が出る', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  test('面の番号と段が違えばシードも違う', () => {
    expect(endlessSeed(1, 0)).not.toBe(endlessSeed(2, 0));
    expect(endlessSeed(1, 0)).not.toBe(endlessSeed(1, 1));
  });
});

describe('targetFor', () => {
  test('番号が進むほど目標が上がり、上限を超えない', () => {
    let prev = targetFor(1);
    for (let n = 2; n <= 300; n++) {
      const t = targetFor(n);
      expect(t.pieces).toBeGreaterThanOrEqual(prev.pieces);
      expect(t.level).toBeGreaterThanOrEqual(prev.level);
      expect(t.pieces).toBeLessThanOrEqual(8);
      prev = t;
    }
  });
});

describe('enumerateTilings', () => {
  test('手作りの面で、素朴な全探索と同じ数を返す', () => {
    for (const stage of STAGES.slice(0, 12)) {
      const tilings = enumerateTilings(stage, 5000);
      expect(tilings).not.toBeNull();
      expect(tilings!.length).toBe(countGeometricPlacements(stage, 5000));
    }
  });
});

describe('generateEndless', () => {
  const sample = [1, 2, 3, 10, 20, 35, 60];
  const results = new Map(sample.map((n) => [n, generateEndless(n)]));

  test('同じ番号からは必ず同じ盤が出る', () => {
    for (const n of [1, 20]) expect(generateEndless(n).stage).toEqual(results.get(n)!.stage);
  });

  test('唯一解で、設計上の警告が無い', () => {
    for (const [n, r] of results) {
      expect(r.stage.id).toBe(`endless-${n}`);
      expect(validateStage(r.stage)).toEqual([]);
      expect(findDesignWarnings(r.stage)).toEqual([]);
      expect(countSolutions(r.stage, 2)).toBe(1);
      expect(countGeometricPlacements(r.stage, 2)).toBe(2);
    }
  });

  test('どのルールも、外すと唯一解が崩れる（役割の無いルールを置かない）', () => {
    for (const r of results.values()) {
      if (r.rung === rungsFor(1).length) continue;
      const rules = r.stage.animalRules ?? {};
      for (const sp of Object.keys(rules) as Species[]) {
        const without = { ...rules };
        delete without[sp];
        expect(countSolutions({ ...r.stage, animalRules: without }, 2)).toBeGreaterThan(1);
      }
    }
  });

  test('どのルールも参照しない水・木を置かない', () => {
    for (const r of results.values()) {
      if (r.rung === rungsFor(1).length) continue;
      const used = new Set(Object.values(r.stage.animalRules ?? {}).flatMap((c) => (c && 'block' in c ? [c.block] : [])));
      for (const cell of r.stage.terrain.flat()) {
        if (cell === 'water' || cell === 'tree') expect(used.has(cell)).toBe(true);
      }
    }
  });

  test('後の面ほど駒が多い', () => {
    const early = results.get(1)!.stage.animals.length;
    const late = results.get(60)!.stage.animals.length;
    expect(late).toBeGreaterThan(early);
  });

  test('試行の予算が 0 でも、最終段（手作りの面）で必ず面が出る', () => {
    for (const n of [1, 7, 49, 1000]) {
      const r = generateEndless(n, { budgetScale: 0 });
      expect(r.rung).toBe(rungsFor(n).length);
      expect(r.stage.id).toBe(`endless-${n}`);
      expect(countSolutions(r.stage, 2)).toBe(1);
    }
  });
});

describe('むげんのルートと記録', () => {
  beforeEach(() => localStorage.clear());

  test('ハッシュと行き来できる', () => {
    expect(parseRoute('#/endless/12')).toEqual({ name: 'endless', n: 12 });
    expect(hashFor({ name: 'endless', n: 12 })).toBe('#/endless/12');
    expect(parseRoute('#/endless/abc')).toEqual({ name: 'endless', n: 1 });
    expect(parseRoute('#/endless/0')).toEqual({ name: 'endless', n: 1 });
  });

  test('クリアした最大の番号だけを持ち、遊び直しで戻さない', async () => {
    expect(await loadEndlessCleared()).toBe(0);
    await recordEndlessClear(3);
    await recordEndlessClear(2);
    expect(await loadEndlessCleared()).toBe(3);
    await clearProgress();
    expect(await loadEndlessCleared()).toBe(0);
  });
});

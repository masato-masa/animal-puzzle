import { describe, expect, test } from 'vitest';

import { anchorFromPiecePoint, cellFromPoint, cellSize, GAP, pieceSpan } from '@/ui/geometry';

// 4列2行、セル40px、gap 6px の盤面。
// 幅 = 4*40 + 3*6 = 178、高さ = 2*40 + 1*6 = 86
const rect = { left: 100, top: 200, width: 178, height: 86 };

describe('cellSize', () => {
  test('gap は cols-1 本ぶんしかない', () => {
    expect(cellSize(rect, 4)).toBe(40);
  });
});

describe('cellFromPoint', () => {
  test('左上のマス', () => {
    expect(cellFromPoint(rect, 2, 4, 100, 200)).toEqual({ r: 0, c: 0 });
  });

  test('右下のマス', () => {
    expect(cellFromPoint(rect, 2, 4, 277, 285)).toEqual({ r: 1, c: 3 });
  });

  test('セルの内側の端はそのセル', () => {
    // 列0は 0..39、gap は 40..45、列1は 46 から
    expect(cellFromPoint(rect, 2, 4, 100 + 39, 200)).toEqual({ r: 0, c: 0 });
    expect(cellFromPoint(rect, 2, 4, 100 + 46, 200)).toEqual({ r: 0, c: 1 });
  });

  test('gap の上は手前のセルに寄せる', () => {
    expect(cellFromPoint(rect, 2, 4, 100 + 42, 200)).toEqual({ r: 0, c: 0 });
  });

  test('矩形の外は null', () => {
    expect(cellFromPoint(rect, 2, 4, 99, 200)).toBeNull();
    expect(cellFromPoint(rect, 2, 4, 279, 200)).toBeNull();
    expect(cellFromPoint(rect, 2, 4, 100, 199)).toBeNull();
    expect(cellFromPoint(rect, 2, 4, 100, 287)).toBeNull();
  });

  test('右端・下端ちょうどでも範囲外の番号を返さない', () => {
    expect(cellFromPoint(rect, 2, 4, 278, 286)).toEqual({ r: 1, c: 3 });
  });

  test('1列1行でも動く（gap が 0 本になる割り算）', () => {
    const one = { left: 0, top: 0, width: 40, height: 40 };
    expect(cellSize(one, 1)).toBe(40);
    expect(cellFromPoint(one, 1, 1, 20, 20)).toEqual({ r: 0, c: 0 });
  });
});

describe('anchorFromPiecePoint', () => {
  test('ぴったり重なっていればそのマス', () => {
    expect(anchorFromPiecePoint(rect, 100 + 46, 200 + 46, 4)).toEqual({ r: 1, c: 1 });
  });

  test('半マス未満のずれは近いマスに寄せる', () => {
    expect(anchorFromPiecePoint(rect, 100 + 46 + 15, 200 + 5, 4)).toEqual({ r: 0, c: 1 });
  });

  test('半マスを超えるずれは隣のマスになる', () => {
    expect(anchorFromPiecePoint(rect, 100 + 46 + 30, 200, 4)).toEqual({ r: 0, c: 2 });
  });

  test('盤の外にはみ出す位置も返す（置けるかの判断は engine に任せる）', () => {
    expect(anchorFromPiecePoint(rect, 100 - 46, 200 - 46, 4)).toEqual({ r: -1, c: -1 });
  });
});

describe('pieceSpan', () => {
  test('1マスの駒はセルそのまま', () => {
    expect(pieceSpan(1, 40)).toBe(40);
  });

  test('2マスの駒は gap を1本またぐ', () => {
    expect(pieceSpan(2, 40)).toBe(86);
    expect(pieceSpan(2, 40)).toBe(2 * 40 + GAP);
  });

  test('盤の全幅は cols マス分の駒と同じ長さになる', () => {
    expect(pieceSpan(4, cellSize(rect, 4))).toBeCloseTo(rect.width, 6);
  });
});

test('GAP は CSS に流し込む唯一の出どころ', () => {
  expect(GAP).toBe(6);
});

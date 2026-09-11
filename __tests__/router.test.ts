import { describe, expect, test } from 'vitest';

import { hashFor, parseRoute, type Route } from '@/core/router';

describe('parseRoute', () => {
  test('空・ルートはホーム', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#')).toEqual({ name: 'home' });
    expect(parseRoute('#/')).toEqual({ name: 'home' });
  });

  test('ステージ一覧', () => {
    expect(parseRoute('#/stages')).toEqual({ name: 'stages' });
  });

  test('ゲーム', () => {
    expect(parseRoute('#/game/stage-1')).toEqual({ name: 'game', stageId: 'stage-1' });
  });

  test('ID に使える文字をそのまま通す', () => {
    expect(parseRoute('#/game/custom-1757000000000-ab12cd')).toEqual({
      name: 'game',
      stageId: 'custom-1757000000000-ab12cd',
    });
  });

  test('URL エンコードを戻す', () => {
    expect(parseRoute('#/game/a%20b')).toEqual({ name: 'game', stageId: 'a b' });
  });

  test('stageId が無い game はホームに落とす', () => {
    expect(parseRoute('#/game')).toEqual({ name: 'home' });
    expect(parseRoute('#/game/')).toEqual({ name: 'home' });
  });

  test('マイステージとエディタ', () => {
    expect(parseRoute('#/my-stages')).toEqual({ name: 'my-stages' });
    expect(parseRoute('#/editor')).toEqual({ name: 'editor' });
  });

  test('知らないハッシュはホームに落とす', () => {
    expect(parseRoute('#/nope/nope')).toEqual({ name: 'home' });
  });

  test('クエリが付いていても読める', () => {
    expect(parseRoute('#/game/stage-2?x=1')).toEqual({ name: 'game', stageId: 'stage-2' });
  });
});

describe('hashFor', () => {
  test('往復して同じになる', () => {
    const routes: Route[] = [
      { name: 'home' },
      { name: 'stages' },
      { name: 'game', stageId: 'stage-7' },
      { name: 'my-stages' },
      { name: 'editor' },
    ];
    for (const r of routes) expect(parseRoute(hashFor(r))).toEqual(r);
  });

  test('ID をエスケープする', () => {
    expect(hashFor({ name: 'game', stageId: 'a b' })).toBe('#/game/a%20b');
  });
});

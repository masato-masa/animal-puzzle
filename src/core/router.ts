import { useSyncExternalStore } from 'react';

/**
 * ハッシュルーティング。GitHub Pages のサブパス配信では、通常のパスルーティングだと
 * 直リンクのたびに 404.html のフォールバックが必要になり、base パスとの二重管理も
 * 生む。ハッシュならサーバ設定が一切要らない。
 */
export type Route =
  | { name: 'stages' }
  | { name: 'game'; stageId: string }
  | { name: 'my-stages' }
  | { name: 'editor' };

export const parseRoute = (hash: string): Route => {
  const path = hash.replace(/^#/, '').split('?')[0];
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
  if (seg[0] === 'game' && seg[1]) return { name: 'game', stageId: seg[1] };
  if (seg[0] === 'my-stages') return { name: 'my-stages' };
  if (seg[0] === 'editor') return { name: 'editor' };
  return { name: 'stages' };
};

export const hashFor = (route: Route): string => {
  switch (route.name) {
    case 'game':
      return `#/game/${encodeURIComponent(route.stageId)}`;
    case 'my-stages':
      return '#/my-stages';
    case 'editor':
      return '#/editor';
    default:
      return '#/';
  }
};

export const navigate = (route: Route): void => {
  window.location.hash = hashFor(route);
};

export const goBack = (): void => {
  window.history.back();
};

const subscribe = (onChange: () => void): (() => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};

/**
 * getSnapshot は文字列を返す。ここで parseRoute を呼ぶと毎回別のオブジェクトが
 * 返り、参照が変わり続けて無限ループになるため、変換は外で行う。
 */
export const useRoute = (): Route =>
  parseRoute(
    useSyncExternalStore(
      subscribe,
      () => window.location.hash,
      () => ''
    )
  );

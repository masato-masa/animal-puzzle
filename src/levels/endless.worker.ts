/// <reference lib="webworker" />
/**
 * むげんの面を作るワーカー。生成は 1 面で数百 ms かかることがあり、
 * メインスレッドで回すとドラッグが止まるため、ここで作る。
 */
import { generateEndless } from './endless';

export type EndlessRequest = { n: number };
export type EndlessReply = { n: number; stage: import('@/engine').Stage };

self.onmessage = (e: MessageEvent<EndlessRequest>) => {
  const { n } = e.data;
  const { stage } = generateEndless(n);
  (self as unknown as Worker).postMessage({ n, stage } satisfies EndlessReply);
};

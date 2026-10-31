/**
 * むげんの面を画面から取り出す窓口。生成はワーカーに出し、結果は番号ごとに覚えておく。
 * 遊んでいる間に次の面を先に作らせておく（prefetchEndless）ので、「つぎへ」を押したときに
 * 待たずに出る。ワーカーが使えない環境では、その場で同期的に作る。
 *
 * 同じ番号からは必ず同じ盤が出る（endless.ts は番号からシードを決める）ので、
 * 覚えておくのはこのタブの中だけで十分。localStorage には盤を保存しない。
 */
import type { Stage } from '@/engine';

import type { EndlessReply } from './endless.worker';

const cache = new Map<number, Promise<Stage>>();
const waiting = new Map<number, (stage: Stage) => void>();

let worker: Worker | null | undefined;
const getWorker = (): Worker | null => {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./endless.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<EndlessReply>) => {
      waiting.get(e.data.n)?.(e.data.stage);
      waiting.delete(e.data.n);
    };
    worker.onerror = () => {
      // ワーカーが壊れたら、待っている分も含めて同期で作り直す。
      worker = null;
      for (const [n, resolve] of waiting) void generateHere(n).then(resolve);
      waiting.clear();
    };
  } catch {
    worker = null;
  }
  return worker;
};

const generateHere = async (n: number): Promise<Stage> => {
  const { generateEndless } = await import('./endless');
  return generateEndless(n).stage;
};

export const getEndlessStage = (n: number): Promise<Stage> => {
  const hit = cache.get(n);
  if (hit) return hit;
  const w = getWorker();
  const p = w
    ? new Promise<Stage>((resolve) => {
        waiting.set(n, resolve);
        w.postMessage({ n });
      })
    : generateHere(n);
  cache.set(n, p);
  return p;
};

/** 次の面を裏で作らせておく。結果は getEndlessStage が拾う。 */
export const prefetchEndless = (n: number): void => {
  void getEndlessStage(n);
};

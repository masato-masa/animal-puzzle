import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

type Props = {
  /** 駒が順に跳ね終わってから出す。その待ち時間（秒）。 */
  delay: number;
  hasNext: boolean;
  onNext: () => void;
  onRetry: () => void;
  onList: () => void;
};

export function ClearOverlay({ delay, hasNext, onNext, onRetry, onList }: Props) {
  const still = useReducedMotion();
  const wait = still ? 0 : delay;

  return (
    <AnimatePresence>
      <motion.div
        className="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        // 閉じるアニメーションの最中にクリックを吸わせない。
        exit={{ opacity: 0, pointerEvents: 'none' }}
        transition={{ duration: 0.25, delay: wait }}>
        <motion.div
          className="overlay-card"
          initial={still ? false : { scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24, delay: wait }}>
          <h2>クリア！</h2>
          <p>すべての動物が条件を満たしました</p>
          <div className="overlay-buttons">
            {hasNext && (
              <button type="button" className="sheet-btn" onClick={onNext}>
                つぎのステージ
              </button>
            )}
            <button type="button" className="sheet-btn quiet" onClick={onRetry}>
              もういちど
            </button>
            <button type="button" className="sheet-btn quiet" onClick={onList}>
              ステージ一覧
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

type Props = {
  /** 駒が順に跳ね終わってから出す。その待ち時間（秒）。 */
  delay: number;
  hasNext: boolean;
  onNext: () => void;
  onRetry: () => void;
  onList: () => void;
  nextLabel?: string;
  listLabel?: string;
};

export function ClearOverlay({ delay, hasNext, onNext, onRetry, onList, nextLabel = 'つぎへ', listLabel = 'ステージせんたく' }: Props) {
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
        transition={{ duration: 0.2, delay: wait }}>
        <motion.div
          className="overlay-card"
          initial={still ? false : { scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28, delay: wait }}>
          <h2>クリア！</h2>
          <div className="overlay-buttons">
            {hasNext && (
              <button type="button" className="sheet-btn" onClick={onNext}>
                {nextLabel}
              </button>
            )}
            <button type="button" className="sheet-btn quiet" onClick={onRetry}>
              もういちど
            </button>
            <button type="button" className="sheet-btn quiet" onClick={onList}>
              {listLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

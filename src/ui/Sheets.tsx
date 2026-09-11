import { useState } from 'react';
import { motion } from 'motion/react';

import { STAGES } from '@/levels/stages';
import { navigate } from '@/core/router';
import { clearProgress, unlockAllForTesting } from '@/storage/progress';

/** 画面全体を覆う下地。どの画面からも同じ形で出す。 */
export function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, pointerEvents: 'auto' }}
      // 閉じるアニメーションの間もオーバーレイが残っているので、
      // ここで当たり判定を切らないと、その 0.2 秒に押したボタンが反応しない。
      exit={{ opacity: 0, pointerEvents: 'none' }}
      transition={{ duration: 0.2 }}
      onPointerDown={(e) => {
        if (onClose && e.target === e.currentTarget) onClose();
      }}>
      {children}
    </motion.div>
  );
}

function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="sheet"
      initial={{ scale: 0.9, y: 18 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.94, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}>
      {children}
    </motion.div>
  );
}

const HELP_RULES = [
  '動物をぜんぶ盤面に置くとクリアです。',
  '動物にはそれぞれ「となりに誰がいてほしいか」などの条件があります。',
  'カードに出ている印が ✓ になれば、その動物の条件は満たされています。',
  '草・木・水のマスには置けません。動物の形にぴったり合う場所をさがします。',
];

const HELP_CONTROLS = [
  'カードから盤面へドラッグして置きます。タップで選ぶ操作はありません。',
  '置いた動物はそのままドラッグして動かせます。',
  '盤の外で離すとカードに戻ります。マスからずれた場所で離すと、その場に残ります。',
];

export function HelpSheet({ onClose }: { onClose: () => void }) {
  return (
    <Overlay key="help" onClose={onClose}>
      <Sheet>
        <h2 className="sheet-title">遊びかた</h2>

        <ul className="help-list">
          {HELP_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>

        <h3 className="sheet-subtitle">操作</h3>
        <ul className="help-list">
          {HELP_CONTROLS.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>

        <button type="button" className="sheet-btn" onClick={onClose}>
          とじる
        </button>
      </Sheet>
    </Overlay>
  );
}

interface SettingsSheetProps {
  muted: boolean;
  onToggleMute: () => void;
  onClose: () => void;
}

/** 設定。今は音の入切だけ。増やすときもここに行を足す。 */
export function SettingsSheet({ muted, onToggleMute, onClose }: SettingsSheetProps) {
  return (
    <Overlay key="settings" onClose={onClose}>
      <Sheet>
        <h2 className="sheet-title">設定</h2>

        <div className="sheet-row static">
          <span>音</span>
          <button
            type="button"
            className="switch"
            role="switch"
            aria-checked={!muted}
            aria-label={muted ? '音を出す' : '音を消す'}
            onClick={onToggleMute}
          />
        </div>

        <button type="button" className="sheet-btn" onClick={onClose}>
          とじる
        </button>
      </Sheet>
    </Overlay>
  );
}

/**
 * 開発者用。本番の操作導線には出さず、ホーム右下の小さなピルからだけ開く。
 * マイステージ（エディタで作ったステージ）もここからだけ開く。
 */
export function DevSheet({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const [status, setStatus] = useState('');

  return (
    <Overlay key="dev" onClose={onClose}>
      <Sheet>
        <h2 className="sheet-title">テストツール</h2>
        <p className="dev-note">本番では使わない、動作確認用のボタンです。</p>

        <button
          type="button"
          className="sheet-row"
          onClick={() => navigate({ name: 'my-stages' })}>
          マイステージ
        </button>

        <button type="button" className="sheet-row" onClick={() => navigate({ name: 'editor' })}>
          ステージをつくる
        </button>

        <button
          type="button"
          className="sheet-row"
          onClick={() => {
            void unlockAllForTesting().then(() => {
              setStatus(`${STAGES.length} ステージをクリア済みにしました。`);
              onChanged();
            });
          }}>
          全ステージ開放
        </button>

        <button
          type="button"
          className="sheet-row danger"
          onClick={() => {
            if (!window.confirm('きろくを ぜんぶ けしますか？')) return;
            void clearProgress().then(() => {
              setStatus('きろくを消しました。');
              onChanged();
            });
          }}>
          きろくを ぜんぶ けす
        </button>

        <p className="dev-status">{status}</p>

        <button type="button" className="sheet-link" onClick={onClose}>
          とじる
        </button>
      </Sheet>
    </Overlay>
  );
}

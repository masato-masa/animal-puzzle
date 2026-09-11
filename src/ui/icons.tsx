// 参考アプリと同じ方針で、アイコンは素材を持ってこず自前の SVG に描き起こす。
// 丸ボタンの地は --accent、線は白。

export function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.4" fill="var(--accent)" />
      <g fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.4 7.6 L9 12 L13.4 16.4" />
      </g>
    </svg>
  );
}

export function ResetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.4" fill="var(--accent)" />
      <g fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.4 12 a5.4 5.4 0 1 1 -1.7 -3.9" />
        <path d="M17.7 6.9 v3.4 h-3.4" />
      </g>
    </svg>
  );
}

export function HelpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.4" fill="var(--accent)" />
      <path
        d="M9.5 9.3 a2.6 2.6 0 1 1 3.2 2.9 v1.5"
        fill="none"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <circle cx="12.6" cy="16.6" r="1.25" fill="#fff" />
    </svg>
  );
}

export function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.4" fill="var(--accent)" />
      <g fill="#fff">
        <rect x="7" y="7.6" width="10" height="2.1" rx="1.05" />
        <rect x="7" y="10.95" width="10" height="2.1" rx="1.05" />
        <rect x="7" y="14.3" width="6.4" height="2.1" rx="1.05" />
      </g>
    </svg>
  );
}

/** 音の入切。歯車だと設定画面と誤解されるので、スピーカーで意味を出す。 */
export function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.4" fill="var(--accent)" />
      <path d="M7 10.4 h2.2 L12.4 7.6 v8.8 L9.2 13.6 H7 Z" fill="#fff" />
      {muted ? (
        <g stroke="#fff" strokeWidth="1.7" strokeLinecap="round">
          <path d="M14.4 10.2 L17.4 13.8" />
          <path d="M17.4 10.2 L14.4 13.8" />
        </g>
      ) : (
        <g fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round">
          <path d="M14.6 10 a3 3 0 0 1 0 4" />
          <path d="M16.6 8.4 a5.6 5.6 0 0 1 0 7.2" />
        </g>
      )}
    </svg>
  );
}

/**
 * 条件が満たされているかの印。
 *
 * まだ置いていない動物の条件は「自動的に満たされている」状態になるが、それを
 * ✓ で出すと達成したように見えて誤解を招く。置き終わるまでは中立の点にする。
 */
export function StatusMark({ ok, pending }: { ok: boolean; pending?: boolean }) {
  if (pending) {
    return (
      <svg className="status-mark" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="2.6" fill="currentColor" opacity="0.35" />
      </svg>
    );
  }
  return (
    <svg className="status-mark" viewBox="0 0 16 16" aria-hidden="true">
      {ok ? (
        <path
          d="M3.4 8.4 L6.4 11.4 L12.6 5"
          fill="none"
          stroke="var(--ok)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <g stroke="var(--ng)" strokeWidth="2.4" strokeLinecap="round">
          <path d="M4.4 4.4 L11.6 11.6" />
          <path d="M11.6 4.4 L4.4 11.6" />
        </g>
      )}
    </svg>
  );
}

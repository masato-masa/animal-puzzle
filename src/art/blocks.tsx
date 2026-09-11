/** 水ブロック。ワニの条件から参照されるので、無地の茂みと区別できる必要がある。 */
export function WaterIcon() {
  return (
    <svg className="block-icon" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.85">
        <path d="M3.5 9.5 q3 -2.8 6 0 t6 0 t5 0" />
        <path d="M3.5 15.5 q3 -2.8 6 0 t6 0 t5 0" />
      </g>
    </svg>
  );
}

/** 木ブロック。ゴリラの条件から参照される。 */
export function TreeIcon() {
  return (
    <svg className="block-icon" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="#fff" opacity="0.85">
        <path d="M12 2.6 c3.9 0 6.9 3.1 6.9 6.7 c0 3.9 -3.2 6.6 -6.9 6.6 s-6.9 -2.7 -6.9 -6.6 c0 -3.6 3 -6.7 6.9 -6.7 Z" />
        <rect x="10.8" y="13.6" width="2.4" height="7.6" rx="1.2" />
      </g>
    </svg>
  );
}

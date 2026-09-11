import { SPECIES, type ShapeKey, type Species } from '@/engine';

/**
 * 種のシルエット。色は親から currentColor で受ける（駒の上では --ink）。
 *
 * 複雑な1本のパスより、円・楕円・短い曲線を重ねるほうが破綻しにくく直しやすい。
 * 細部を描くと小さいマスで潰れるため、種ごとに 3〜6 個の図形に抑えてある。
 *
 * `cut` を付けた図形は駒の地色（--face）で塗る。単色シルエットのまま模様を
 * 抜けるので、シマウマの縞とヒョウの斑点、ゾウの耳の輪郭をこれで出している。
 * 体からはみ出した部分は駒の地と同じ色なので、切り抜かなくても見えない。
 */
type Shape =
  | { k: 'circle'; cx: number; cy: number; r: number; cut?: boolean }
  | { k: 'ellipse'; cx: number; cy: number; rx: number; ry: number; cut?: boolean }
  | { k: 'path'; d: string; cut?: boolean }
  /** 線で描く図形。手足・尻尾・鼻のように細長いものはこちらのほうが安定する。 */
  | { k: 'stroke'; d: string; w: number; cut?: boolean }
  /** 輪郭だけの円。地色で描くと「境目の線」になる（ゾウの耳）。 */
  | { k: 'ring'; cx: number; cy: number; r: number; w: number; cut?: boolean };

/**
 * viewBox は駒の形に合わせる。全種を 24x24 にすると、横長のワニやシマウマが
 * 2マスの駒の中央に小さく収まってしまい、外形とシルエットの向きがずれる。
 */
const VIEWBOX: Record<ShapeKey, string> = {
  single: '0 0 24 24',
  square2x2: '0 0 24 24',
  domino_h: '0 0 48 24',
  domino_v: '0 0 24 48',
};

const SHAPES: Record<Species, Shape[]> = {
  // ---- 1マス ----

  /**
   * リス: 後ろで巻き上がる大きな尻尾で識別する。
   * 尻尾は線ではなく三日月の塗りで描く。線にすると体の周りを一周して
   * カタツムリに見えてしまう。
   */
  squirrel: [
    {
      k: 'path',
      d: 'M12.6 21.6 C20 21 23 13.6 20 8.4 C18.3 5.4 15 4.6 13.4 6.4 C12.2 7.7 13 9.6 14.5 9.3 C16 9 17.4 10.6 17.8 13 C18.4 16.9 16.4 19.6 12.4 19 Z',
    },
    { k: 'ellipse', cx: 9, cy: 15.8, rx: 5.4, ry: 6 },
    { k: 'circle', cx: 8.2, cy: 7.8, r: 4.4 },
    { k: 'path', d: 'M4.8 4.8 c-0.8 -2.2 0.4 -3.7 2 -3 c1.1 0.5 1.7 2 1.6 3.4 Z' },
  ],

  /** ウシツツキ: 小さな体と、体に不釣り合いな長いくちばし。 */
  oxpecker: [
    {
      k: 'path',
      d: 'M6.4 17 c-1.8 -3.8 0.4 -7.9 4.6 -8.7 c3.8 -0.7 7.3 1.5 8.1 4.8 c0.7 3 -1.1 5.8 -4.2 6.5 c-3.5 0.8 -7 -0.4 -8.5 -2.6 Z',
    },
    { k: 'circle', cx: 8.4, cy: 8.6, r: 3.7 },
    { k: 'path', d: 'M5.4 6.9 L0.9 8.8 L5.4 10.8 Z' },
    { k: 'path', d: 'M17.8 13.6 L23.4 17.4 L17.6 18.4 Z' },
    { k: 'stroke', d: 'M11 19.6 v2.8 M14 19.8 v2.6', w: 1.5 },
  ],

  /** サル: 横に張り出した丸い耳と、細く巻いた尻尾。ゴリラとはここで分かれる。 */
  monkey: [
    { k: 'circle', cx: 4.9, cy: 9.4, r: 2.9 },
    { k: 'circle', cx: 19.1, cy: 9.4, r: 2.9 },
    { k: 'circle', cx: 12, cy: 9.6, r: 5.7 },
    { k: 'ellipse', cx: 11.6, cy: 18.4, rx: 4.7, ry: 4.3 },
    { k: 'stroke', d: 'M16 20 C20.6 20.8 21.8 16.8 19.2 15', w: 1.9 },
  ],

  // ---- 横2マス ----

  /**
   * シマウマ: 馬の輪郭に、地色で抜いた縞を重ねる。
   * 縞は体の中だけに収める。下まで伸ばすと脚とつながって、体が縦棒の束に
   * 分解されて馬に見えなくなる。
   */
  zebra: [
    { k: 'stroke', d: 'M20.5 15 v7.4 M25.8 15.6 v6.8 M31.4 15.6 v6.8 M36.8 15 v7.4', w: 2.8 },
    { k: 'ellipse', cx: 28.6, cy: 12, rx: 11.4, ry: 6 },
    { k: 'path', d: 'M24.6 13.4 L16.2 4.6 L19.6 1.8 L28 10.6 Z' },
    { k: 'path', d: 'M20.4 1.2 L11.4 1.6 C9.8 1.7 9.2 3.6 10.5 4.5 L17.6 8 Z' },
    { k: 'path', d: 'M20.8 2 l1.2 -2 l1.8 1.8 Z' },
    { k: 'stroke', d: 'M39.6 9.8 C43.4 11.2 43.8 15.2 42.4 17.8', w: 1.8 },
    { k: 'path', cut: true, d: 'M24.6 6.4 l-1.1 8.8 l2.2 0 l1.1 -8.8 Z' },
    { k: 'path', cut: true, d: 'M29.4 6 l-1.1 9.4 l2.2 0 l1.1 -9.4 Z' },
    { k: 'path', cut: true, d: 'M34.2 6.4 l-1.1 8.8 l2.2 0 l1.1 -8.8 Z' },
  ],

  /** ワニ: 長い口・背中のギザギザ・先細りの尻尾。 */
  crocodile: [
    { k: 'path', d: 'M2.6 11.8 L17 10 L17 16.4 L3 15.8 C1.2 15.7 1 12 2.6 11.8 Z' },
    { k: 'ellipse', cx: 24.5, cy: 13.2, rx: 9.8, ry: 4.8 },
    { k: 'path', d: 'M32 10 L46.4 11.7 C47.6 11.9 47.6 14.5 46.3 14.7 L32 16.6 Z' },
    { k: 'path', d: 'M17.6 9.2 l2.1 -3 l2.1 3 Z M22.8 8.6 l2.1 -3.2 l2.1 3.2 Z M28 9 l2.1 -3 l2.1 3 Z' },
    { k: 'stroke', d: 'M19.5 17.2 v4.2 M29.5 17 v4.4', w: 2.6 },
  ],

  // ---- 縦2マス ----

  /**
   * ライオン: ギザギザのたてがみ。ヒョウとはここで分かれる。
   * たてがみは外半径 10.5 / 内半径 9.0 の12山。差を大きくすると太陽や
   * ウイルスに見えるので、襟のように浅くしてある。
   */
  lion: [
    {
      k: 'path',
      d: 'M22.5 12 L20.69 14.33 L21.09 17.25 L18.36 18.36 L17.25 21.09 L14.33 20.69 L12 22.5 L9.67 20.69 L6.75 21.09 L5.64 18.36 L2.91 17.25 L3.31 14.33 L1.5 12 L3.31 9.67 L2.91 6.75 L5.64 5.64 L6.75 2.91 L9.67 3.31 L12 1.5 L14.33 3.31 L17.25 2.91 L18.36 5.64 L21.09 6.75 L20.69 9.67 Z',
    },
    { k: 'ellipse', cx: 12, cy: 31.5, rx: 7.8, ry: 11 },
    { k: 'stroke', d: 'M8.8 41 v5 M15.2 41 v5', w: 3.2 },
    { k: 'stroke', d: 'M19.4 33.5 C23 36.5 22.6 41.5 19.6 43.5', w: 1.9 },
    { k: 'circle', cx: 19.2, cy: 44.4, r: 2 },
  ],

  /** キリン: とにかく首が長いこと。それだけで他と混ざらない。 */
  giraffe: [
    { k: 'stroke', d: 'M8.6 40.5 v5.6 M15.4 40.5 v5.6', w: 2.7 },
    { k: 'ellipse', cx: 12, cy: 35.6, rx: 7.4, ry: 6.2 },
    { k: 'path', d: 'M8.2 34 L5.6 12.2 L11.6 11.2 L15.6 33.4 Z' },
    { k: 'path', d: 'M11.6 13.4 L3.9 9.9 C2 9.1 2.4 6.3 4.4 6 L11 5 Z' },
    { k: 'stroke', d: 'M6.4 5.6 L5.6 2.4 M9.8 5.2 L9.6 2', w: 1.4 },
    { k: 'stroke', d: 'M18.8 34 C21.4 36.4 21.1 40 19.2 41.6', w: 1.5 },
  ],

  /**
   * ヒョウ: たてがみの無い猫の輪郭に、地色で抜いた斑点。
   * 胴は楕円にしない。肩を細く腰を広い「おすわり」の形にしないと、
   * 頭と胴がだるまに見える。
   */
  leopard: [
    { k: 'path', d: 'M6.6 5.6 L6.9 1 L11.2 3.4 Z M17.4 5.6 L17.1 1 L12.8 3.4 Z' },
    { k: 'circle', cx: 12, cy: 9.4, r: 5.8 },
    {
      k: 'path',
      d: 'M12 16.4 c-4.6 0 -6.6 4.6 -6.6 9 c0 3 -2.4 5.6 -2.4 10 c0 4.8 4 7.6 9 7.6 s9 -2.8 9 -7.6 c0 -4.4 -2.4 -7 -2.4 -10 c0 -4.4 -2 -9 -6.6 -9 Z',
    },
    { k: 'stroke', d: 'M19.8 36.4 C24 39 23.6 43.8 20.2 45.8', w: 2.2 },
    { k: 'circle', cut: true, cx: 9.4, cy: 24.6, r: 1.7 },
    { k: 'circle', cut: true, cx: 14.4, cy: 27.4, r: 1.7 },
    { k: 'circle', cut: true, cx: 8.4, cy: 32.4, r: 1.8 },
    { k: 'circle', cut: true, cx: 15.2, cy: 34.6, r: 1.8 },
    { k: 'circle', cut: true, cx: 11.6, cy: 39.4, r: 1.7 },
  ],

  // ---- 2x2 ----

  /**
   * ゾウ: 垂れた鼻と大きな耳。耳は閉じた円にしない（目に見えてしまう）。
   * 地色の弧を1本引いて「耳のうしろの縁」を出す。
   */
  elephant: [
    { k: 'ellipse', cx: 15.4, cy: 13.6, rx: 7.4, ry: 6.6 },
    { k: 'circle', cx: 8.8, cy: 11.4, r: 6 },
    { k: 'stroke', cut: true, d: 'M11.8 6 C15.2 8.4 15.4 13.8 12.2 16.8', w: 1.6 },
    { k: 'stroke', d: 'M4.2 12.6 C1.6 16 2.2 19.8 5 21.8', w: 2.7 },
    { k: 'stroke', d: 'M12.4 19.2 v3.2 M18.8 18.8 v3.6', w: 3.1 },
  ],

  /** サイ: 鼻先の角。ゾウとはここで分かれる。 */
  rhino: [
    { k: 'ellipse', cx: 14.4, cy: 13.2, rx: 7.8, ry: 6.2 },
    { k: 'path', d: 'M9.4 8.8 L2.8 12.4 C1.6 13 1.8 14.8 3.2 15.2 L9.4 17.2 Z' },
    { k: 'path', d: 'M3.6 11.6 L2.4 5.6 C2.3 4.8 3.3 4.4 3.8 5.1 L6.9 10.2 Z' },
    { k: 'path', d: 'M6.8 9.4 l0.7 -2.8 l2.2 2.4 Z' },
    { k: 'path', d: 'M12.6 7.6 l0.2 -3.2 l2.6 2.6 Z' },
    { k: 'stroke', d: 'M9.8 18.2 v3.6 M18.4 18 v3.8', w: 3.2 },
  ],

  /**
   * ゴリラ: 広い肩と、地面まで届く長い腕・こぶし。サルとはここで分かれる
   * （尻尾も横に張り出した耳も無い）。眉を地色で抜くとヘアバンドに見えるので、
   * 代わりに前に突き出た口もとで顔の形を出す。
   */
  gorilla: [
    { k: 'circle', cx: 12, cy: 6, r: 4.2 },
    { k: 'ellipse', cx: 12, cy: 8.8, rx: 3, ry: 2.3 },
    // 胴は腕より内側に収める。胴を広くすると腕が飲み込まれて人の胸像に見える。
    {
      k: 'path',
      d: 'M12 9.6 c4.2 0 6.8 3.4 6.8 7.6 c0 3 -1.4 5.2 -3.2 5.2 L8.4 22.4 c-1.8 0 -3.2 -2.2 -3.2 -5.2 c0 -4.2 2.6 -7.6 6.8 -7.6 Z',
    },
    { k: 'stroke', d: 'M7 12.4 C3.4 14.6 2.6 18.4 3.4 21 M17 12.4 C20.6 14.6 21.4 18.4 20.6 21', w: 3.3 },
    { k: 'circle', cx: 3.2, cy: 21.8, r: 2.1 },
    { k: 'circle', cx: 20.8, cy: 21.8, r: 2.1 },
  ],
};

const render = (s: Shape, i: number) => {
  // cut は駒の地色で塗る。体からはみ出しても地と同色なので見えない。
  const paint = s.cut ? 'var(--face)' : 'currentColor';
  switch (s.k) {
    case 'circle':
      return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={paint} />;
    case 'ellipse':
      return <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={paint} />;
    case 'path':
      return <path key={i} d={s.d} fill={paint} />;
    case 'stroke':
      return (
        <path
          key={i}
          d={s.d}
          fill="none"
          stroke={paint}
          strokeWidth={s.w}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'ring':
      return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="none" stroke={paint} strokeWidth={s.w} />;
  }
};

export function SpeciesSilhouette({ species }: { species: Species }) {
  return (
    <svg className="silhouette" viewBox={VIEWBOX[SPECIES[species].shape]} aria-hidden="true">
      {SHAPES[species].map(render)}
    </svg>
  );
}

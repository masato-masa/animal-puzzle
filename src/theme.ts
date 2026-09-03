import type { ConditionBlock, Species } from '@/engine';

/**
 * サバンナをイメージした配色。蛇パズル（木枠・パーチメント）とは別系統の
 * トーンにしつつ、チャンキーな2Dパズルの質感（radius/shadow）は踏襲する。
 */
export const colors = {
  skyBottom: '#FFF6DE',

  land: '#8FBF5B',
  landDark: '#5E8F34',
  landLight: '#B8DC8A',

  /** 水ブロック。誰も乗れない。 */
  water: '#4FB8E8',
  waterDark: '#1E7BA8',
  waterLight: '#A7E3F7',

  /** 木ブロック。誰も乗れない。 */
  tree: '#2E6B3A',
  treeDark: '#1B4423',
  treeLight: '#4F9160',

  /** 配置不可の壁（草むら）マス。 */
  wall: '#3C6B35',
  wallDark: '#254520',
  wallLight: '#5C8F53',

  panel: '#FFF8EA',
  panelBorder: '#C89A5B',

  text: '#4A2E14',
  textMuted: '#8A6B47',
  textOnDark: '#FFFFFF',

  accent: '#FFB020',
  accentDark: '#C97C00',
  success: '#3FA845',
  successDark: '#26702B',
  danger: '#E8382F',
  dangerDark: '#A8180F',

  /** トレイで選択中の動物を配置できるアンカーマスのハイライト。 */
  validTarget: '#FFD65C',
  validTargetEdge: '#C4841A',
  /** 地形不一致・占有済みなどで置けないマスの表現。 */
  invalidTarget: 'rgba(74, 46, 20, 0.18)',

  /** 条件違反中のピースを示す枠色。 */
  violation: '#E8382F',
  violationEdge: '#A8180F',
} as const;

export const terrainColors = {
  land: { fill: colors.land, dark: colors.landDark, light: colors.landLight },
  water: { fill: colors.water, dark: colors.waterDark, light: colors.waterLight },
  tree: { fill: colors.tree, dark: colors.treeDark, light: colors.treeLight },
  wall: { fill: colors.wall, dark: colors.wallDark, light: colors.wallLight },
} as const;

/** ポップな見た目の共通値。snake-puzzleと同じ「くっきりした2Dパズル」の質感。 */
export const ui = {
  radius: 14,
  outline: 3,
  shadow: {
    shadowColor: 'rgba(74, 46, 20, 0.45)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
} as const;

/** v1では絵文字をプレースホルダーのアイコンとして使う（アートパイプライン不要）。 */
export const speciesEmoji: Record<Species, string> = {
  lion: '🦁',
  zebra: '🦓',
  giraffe: '🦒',
  elephant: '🐘',
  crocodile: '🐊',
  oxpecker: '🐦',
  squirrel: '🐿️',
};

export const speciesLabel: Record<Species, string> = {
  lion: 'ライオン',
  zebra: 'シマウマ',
  giraffe: 'キリン',
  elephant: 'ゾウ',
  crocodile: 'ワニ',
  oxpecker: 'ウシツツキ',
  squirrel: 'リス',
};

export const blockLabel: Record<ConditionBlock, string> = {
  water: '水べ',
  tree: '木',
};

import type { SpeciesCondition, StageRule } from '@/engine';
import { blockLabel, speciesLabel } from '@/theme';

/** 条件を短い日本語の説明文にする（じょうけんパネル表示用）。 */
export const conditionText = (condition: SpeciesCondition): string => {
  switch (condition.kind) {
    case 'adjacentForbidden':
      return `${speciesLabel[condition.with]}のとなりには置けない`;
    case 'minDistance':
      return `${speciesLabel[condition.from]}から${condition.distance}マス以上はなす`;
    case 'flockRequired':
      return 'おなじなかまととなり合わせる';
    case 'adjacentRequired':
      return `${speciesLabel[condition.with]}のとなりが必要`;
    case 'diagonalForbidden':
      return `${speciesLabel[condition.with]}のななめのとなりには置けない`;
    case 'surroundForbidden':
      return `${speciesLabel[condition.with]}のまわり8マスには置けない`;
    case 'blockAdjacentRequired':
      return `${blockLabel[condition.block]}のとなりが必要`;
    case 'blockAdjacentForbidden':
      return `${blockLabel[condition.block]}のとなりには置けない`;
    case 'above':
      return `${speciesLabel[condition.with]}より上にいる`;
    case 'below':
      return `${speciesLabel[condition.with]}より下にいる`;
    case 'leftOf':
      return `${speciesLabel[condition.with]}より左にいる`;
    case 'rightOf':
      return `${speciesLabel[condition.with]}より右にいる`;
    case 'sameRow':
      return `${speciesLabel[condition.with]}と同じ行にいる`;
    case 'sameCol':
      return `${speciesLabel[condition.with]}と同じ列にいる`;
    case 'differentRow':
      return `${speciesLabel[condition.with]}と同じ行に置けない`;
    case 'differentCol':
      return `${speciesLabel[condition.with]}と同じ列に置けない`;
    case 'exactDistance':
      return `${speciesLabel[condition.with]}からちょうど${condition.distance}マスはなす`;
    default:
      return '';
  }
};

/** ステージ限定ルールを短い日本語の説明文にする。 */
export const stageRuleText = (rule: StageRule): string => {
  const a = speciesLabel[rule.a];
  const b = speciesLabel[rule.b];
  switch (rule.kind) {
    case 'above':
      return `${a}は${b}より上にいる`;
    case 'leftOf':
      return `${a}は${b}より左にいる`;
    case 'sameRow':
      return `${a}と${b}は同じ行にいる`;
    case 'sameCol':
      return `${a}と${b}は同じ列にいる`;
    case 'differentRow':
      return `${a}と${b}は同じ行に置けない`;
    case 'differentCol':
      return `${a}と${b}は同じ列に置けない`;
    case 'exactDistance':
      return `${a}と${b}はちょうど${rule.distance}マスはなす`;
  }
};

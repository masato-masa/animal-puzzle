import type { SpeciesCondition } from '@/engine';
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
    default:
      return '';
  }
};

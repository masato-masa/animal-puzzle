import type { Condition } from '@/engine';
import { speciesLabel } from '@/theme';

/** 条件を短い日本語の説明文にする（じょうけんパネル表示用）。 */
export const conditionText = (condition: Condition): string => {
  switch (condition.kind) {
    case 'adjacentForbidden':
      return `${speciesLabel[condition.with]}のとなりには置けない`;
    case 'minDistance':
      return `${speciesLabel[condition.from]}から${condition.distance}マス以上はなす`;
    case 'flockRequired':
      return 'おなじなかまととなり合わせる';
    case 'symbiosisRequired':
      return `${speciesLabel[condition.with]}のとなりが必要`;
    default:
      return '';
  }
};

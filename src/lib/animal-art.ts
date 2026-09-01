import type { ImageSourcePropType } from 'react-native';

import type { Species } from '@/engine';

/**
 * 実写風イラストを持つ動物のみここに登録する。未登録の種（ワニ・ウシツツキなど）は
 * theme.tsのspeciesEmojiにフォールバックする（エディタで選択された場合の保険）。
 */
export const speciesArt: Partial<Record<Species, ImageSourcePropType>> = {
  squirrel: require('@/assets/images/animals/squirrel.png'),
  zebra: require('@/assets/images/animals/zebra.png'),
  lion: require('@/assets/images/animals/lion.png'),
  elephant: require('@/assets/images/animals/elephant.png'),
  giraffe: require('@/assets/images/animals/giraffe.png'),
};

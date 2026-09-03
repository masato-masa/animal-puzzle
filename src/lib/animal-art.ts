import type { ImageSourcePropType } from 'react-native';

import type { Species } from '@/engine';

/**
 * 実写風イラストを持つ動物のみここに登録する。未登録の種（ウシツツキ）は
 * theme.tsのspeciesEmojiにフォールバックする。
 */
export const speciesArt: Partial<Record<Species, ImageSourcePropType>> = {
  squirrel: require('@/assets/images/animals/squirrel.png'),
  zebra: require('@/assets/images/animals/zebra.png'),
  lion: require('@/assets/images/animals/lion.png'),
  elephant: require('@/assets/images/animals/elephant.png'),
  giraffe: require('@/assets/images/animals/giraffe.png'),
  crocodile: require('@/assets/images/animals/crocodile.png'),
  monkey: require('@/assets/images/animals/monkey.png'),
  leopard: require('@/assets/images/animals/leopard.png'),
  rhino: require('@/assets/images/animals/rhino.png'),
  gorilla: require('@/assets/images/animals/gorilla.png'),
};

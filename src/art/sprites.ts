import type { BlockKind, Species } from '@/engine';

import crocodile from '@/assets/sprites/animals/crocodile.png';
import elephant from '@/assets/sprites/animals/elephant.png';
import giraffe from '@/assets/sprites/animals/giraffe.png';
import gorilla from '@/assets/sprites/animals/gorilla.png';
import leopard from '@/assets/sprites/animals/leopard.png';
import lion from '@/assets/sprites/animals/lion.png';
import monkey from '@/assets/sprites/animals/monkey.png';
import oxpecker from '@/assets/sprites/animals/oxpecker.png';
import rhino from '@/assets/sprites/animals/rhino.png';
import squirrel from '@/assets/sprites/animals/squirrel.png';
import zebra from '@/assets/sprites/animals/zebra.png';
import tree from '@/assets/sprites/terrain/tree.png';
import wall from '@/assets/sprites/terrain/wall.png';
import water from '@/assets/sprites/terrain/water.png';

/**
 * 駒の絵。ChatGPT に 1 枚のシートとして描かせ、`scripts/slice-sprites.mjs` が
 * α の連結成分ごとに切り出したもの。
 *
 * **11 種を 1 枚にまとめて生成するのが肝。** 種ごとに別々に生成すると絵柄・
 * 線幅・光源・彩度が揃わず、並べた瞬間に安っぽくなる（2026-09 に一度これで
 * 失敗して全部捨てた）。描き直すときも必ず 11 種まとめて 1 枚で生成すること。
 *
 * 画像は footprint（1x1 / 2x1 / 1x2 / 2x2）と同じ縦横比の透明なキャンバスの
 * 中央に、縦横比を保ったまま収めてある。駒の箱にそのまま敷けばよい。
 */
export const speciesSprite: Record<Species, string> = {
  squirrel,
  oxpecker,
  monkey,
  zebra,
  crocodile,
  lion,
  giraffe,
  leopard,
  elephant,
  rhino,
  gorilla,
};

/** 置けないマスの絵。動物と同じシート方式・同じ絵柄で描かせてある。 */
export const blockSprite: Record<BlockKind, string> = { wall, tree, water };

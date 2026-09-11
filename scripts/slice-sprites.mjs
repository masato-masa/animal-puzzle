// ChatGPT に描かせた 1 枚のシートを、駒ごとの PNG に切り出す。
//
// 生成物はグリッドに正確には乗っていない（ワニのように隣のマスへはみ出す絵がある）
// ので、マス目で等分すると絵が切れる。そこでアルファの**連結成分**を1匹ずつの
// 塊として取り出し、読む順（上の行から、左から右へ）に並べ直して名前を付ける。
//
// 大きさは駒の footprint（1x1 / 2x1 / 1x2 / 2x2）に合わせて縦横比を保ったまま
// 収める。引き伸ばすと絵が歪むので、余った方向は透明のまま残す。
//
//   node scripts/slice-sprites.mjs animals
//   node scripts/slice-sprites.mjs terrain

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

/** これ未満のアルファは「何も無い」とみなす。アンチエイリアスの薄い画素で
 *  隣の絵とつながってしまうのを防ぐ。 */
const ALPHA_THRESHOLD = 40;
/** 画面全体に対してこれより小さい塊はゴミとして捨てる。 */
const MIN_AREA_RATIO = 0.0008;
/** 出力の1マスあたりの辺長。盤面のセルは最大でも 110px 前後なので 2 倍で足りる。 */
const CELL = 256;

const SHEETS = {
  animals: {
    src: 'assets-src/animals-grid.png',
    out: 'src/assets/sprites/animals',
    // シートに描かれている順（左上から右へ、1行ずつ）と、駒の footprint。
    items: [
      ['squirrel', 1, 1],
      ['oxpecker', 1, 1],
      ['monkey', 1, 1],
      ['zebra', 2, 1],
      ['crocodile', 2, 1],
      ['lion', 1, 2],
      ['giraffe', 1, 2],
      ['leopard', 1, 2],
      ['elephant', 2, 2],
      ['rhino', 2, 2],
      ['gorilla', 2, 2],
    ],
  },
  terrain: {
    src: 'assets-src/terrain-grid.png',
    out: 'src/assets/sprites/terrain',
    items: [
      ['wall', 1, 1],
      ['tree', 1, 1],
      ['water', 1, 1],
    ],
  },
};

const name = process.argv[2];
const sheet = SHEETS[name];
if (!sheet) {
  console.error(`使い方: node scripts/slice-sprites.mjs <${Object.keys(SHEETS).join('|')}>`);
  process.exit(1);
}

const { data, info } = await sharp(sheet.src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels } = info;
console.log(`元画像 ${W}x${H}`);

// --- アルファの連結成分を数える（4近傍の幅優先探索） ---
const labels = new Int32Array(W * H).fill(-1);
const boxes = [];
const queue = new Int32Array(W * H);

for (let start = 0; start < W * H; start++) {
  if (labels[start] !== -1) continue;
  if (data[start * channels + 3] < ALPHA_THRESHOLD) continue;

  const id = boxes.length;
  const box = { x0: W, y0: H, x1: -1, y1: -1, area: 0 };
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  labels[start] = id;

  while (head < tail) {
    const p = queue[head++];
    const x = p % W;
    const y = (p / W) | 0;
    box.area++;
    if (x < box.x0) box.x0 = x;
    if (y < box.y0) box.y0 = y;
    if (x > box.x1) box.x1 = x;
    if (y > box.y1) box.y1 = y;

    const push = (q) => {
      if (labels[q] !== -1) return;
      if (data[q * channels + 3] < ALPHA_THRESHOLD) return;
      labels[q] = id;
      queue[tail++] = q;
    };
    if (x > 0) push(p - 1);
    if (x < W - 1) push(p + 1);
    if (y > 0) push(p - W);
    if (y < H - 1) push(p + W);
  }
  boxes.push(box);
}

const minArea = W * H * MIN_AREA_RATIO;
const blobs = boxes.filter((b) => b.area >= minArea);
console.log(`連結成分 ${boxes.length} 個中、${blobs.length} 個を採用（${Math.round(minArea)} 画素以上）`);

if (blobs.length !== sheet.items.length) {
  console.error(
    `\n見つかった塊が ${blobs.length} 個で、期待する ${sheet.items.length} 個と合いません。`
  );
  console.error('絵どうしがくっついているか、分断されている可能性があります。内訳:');
  for (const b of blobs.sort((a, z) => z.area - a.area)) {
    console.error(`  ${b.x1 - b.x0 + 1}x${b.y1 - b.y0 + 1} @(${b.x0},${b.y0}) 面積 ${b.area}`);
  }
  process.exit(1);
}

// --- 読む順に並べ直す。行の高さの半分より近い中心どうしを同じ行とみなす ---
const withCenter = blobs.map((b) => ({ ...b, cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2 }));
withCenter.sort((a, b) => a.cy - b.cy);

const rows = [];
for (const b of withCenter) {
  const row = rows[rows.length - 1];
  const height = b.y1 - b.y0 + 1;
  if (row && Math.abs(b.cy - row.cy) < height * 0.6) {
    row.items.push(b);
    row.cy = row.items.reduce((s, i) => s + i.cy, 0) / row.items.length;
  } else {
    rows.push({ cy: b.cy, items: [b] });
  }
}
const ordered = rows.flatMap((r) => r.items.sort((a, b) => a.cx - b.cx));

// --- 切り出して footprint に収める ---
mkdirSync(sheet.out, { recursive: true });

for (let i = 0; i < ordered.length; i++) {
  const b = ordered[i];
  const [key, fw, fh] = sheet.items[i];
  const boxW = CELL * fw;
  const boxH = CELL * fh;
  const srcW = b.x1 - b.x0 + 1;
  const srcH = b.y1 - b.y0 + 1;

  // 縦横比を保ったまま、余白 4% を残して収める
  const scale = Math.min((boxW * 0.96) / srcW, (boxH * 0.96) / srcH);
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const cropped = await sharp(sheet.src)
    .ensureAlpha()
    .extract({ left: b.x0, top: b.y0, width: srcW, height: srcH })
    .resize(w, h)
    .toBuffer();

  await sharp({ create: { width: boxW, height: boxH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: cropped, gravity: 'centre' }])
    .png({ compressionLevel: 9, palette: true, quality: 92 })
    .toFile(`${sheet.out}/${key}.png`);

  console.log(
    `${key.padEnd(10)} ${srcW}x${srcH} → ${w}x${h} を ${boxW}x${boxH}(${fw}x${fh}マス) の中央へ`
  );
}

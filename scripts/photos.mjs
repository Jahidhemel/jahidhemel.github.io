/**
 * Tiles for the photo reel, and the big version each one opens to.
 *
 * Cut to each photograph's own shape rather than a single crop. A square crop
 * of a landscape takes the subject out of half of them, and the reel is meant
 * to show the pictures, not a uniform grid. Cards are a common HEIGHT with
 * whatever width that gives, so the row reads evenly while every photo keeps
 * its framing.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const OUT = 'public/img/photos';
mkdirSync(OUT, { recursive: true });

const CARD_H = 560;   // 2x the 280px the reel shows
const FULL_MAX = 1700;

const photos = [
  ['ride', 'beyond3.jpg', 'Motorcycles at night'],
  ['boat', 'boat-sunset.jpg', 'A fishing boat with flags at sunset'],
  ['snow', 'snow-night.jpg', 'Standing in falling snow at night'],
  ['hammock', 'beyond1.jpg', 'Working from a hammock'],
  ['ski', 'beyond2.jpg', 'On a ski slope'],
  ['hills', 'beyond6.jpg', 'A hillside viewpoint'],
  ['falls', 'beyond4.jpg', 'At a waterfall'],
  ['beach', 'beach-walk.jpg', 'Walking along a rocky shoreline'],
  ['moon', 'moon-palm.jpg', 'A palm tree under a full moon by the sea'],
  ['seagull', 'seagull.jpg', 'A seagull over the sea with hills behind'],
  ['peak', 'beyond5.jpg', 'In the mountains'],
];

const out = [];
let total = 0;
for (const [name, src, alt] of photos) {
  const card = await sharp(`public/img/${src}`)
    .resize({ height: CARD_H, withoutEnlargement: true })
    .webp({ quality: 76 })
    .toFile(`${OUT}/${name}.webp`);

  const full = await sharp(`public/img/${src}`)
    .resize({ width: FULL_MAX, height: FULL_MAX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(`${OUT}/${name}-full.webp`);

  total += card.size + full.size;
  // The reel needs the card's shape up front, or every tile is the wrong
  // width until its image decodes and the row reflows under the cursor.
  out.push({ name, alt, w: card.width, h: card.height, fw: full.width, fh: full.height });
}

console.log(`${photos.length} photos, ${(total / 1024).toFixed(0)}KB`);
for (const p of out) {
  console.log(`  ${p.name.padEnd(9)} card ${p.w}x${p.h}  full ${p.fw}x${p.fh}`);
}

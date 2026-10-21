/**
 * Tiles for the two scrolling rows in the motion build.
 *
 * Every tile is his own work or his own photograph. The reference design
 * hot-links twenty-one GIF previews of other people's websites; putting
 * those in a portfolio would be showing someone else's work as your own.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const OUT = 'public/img/marquee';
mkdirSync(OUT, { recursive: true });

const W = 840, H = 540; // 2x the 420x270 tile

const tiles = [
  ['mscc', 'public/img/built/mscc-960.webp'],
  ['assistant', 'public/img/built/assistant-960.webp'],
  ['qahelper', 'public/img/built/qahelper-960.webp'],
  ['snippets', 'public/img/built/snippets-960.webp'],
  ['legal', 'public/img/pages/legal-960.webp'],
  ['fruit', 'public/img/pages/fruit-960.webp'],
  ['summer', 'public/img/pages/summer-960.webp'],
  ['travel', 'public/img/pages/travel-960.webp'],
  ['qa-free', 'public/img/qa/qa-free-checkout.webp'],
  ['qa-jpy', 'public/img/qa/qa-jpy-rounding.webp'],
  ['config', 'public/img/story/story1-config-760.webp'],
  ['beach', 'public/img/beach-walk.jpg'],
  ['boat', 'public/img/boat-sunset.jpg'],
  ['moon', 'public/img/moon-palm.jpg'],
  ['seagull', 'public/img/seagull.jpg'],
  ['snow', 'public/img/snow-night.jpg'],
  ['ride', 'public/img/beyond3.jpg'],
  ['hammock', 'public/img/beyond1.jpg'],
  ['ski', 'public/img/beyond2.jpg'],
  ['hills', 'public/img/beyond6.jpg'],
  ['falls', 'public/img/beyond4.jpg'],
];

let total = 0;
for (const [name, src] of tiles) {
  const info = await sharp(src)
    .resize(W, H, { fit: 'cover', position: 'top' })
    .webp({ quality: 72 })
    .toFile(`${OUT}/${name}.webp`);
  total += info.size;
}
console.log(`${tiles.length} tiles, ${(total / 1024).toFixed(0)}KB total`);

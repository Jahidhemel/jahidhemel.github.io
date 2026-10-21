/**
 * Card images for the eFoli demo store.
 *
 * Captured from the live storefront at efoli-support1.myshopify.com, which is
 * deliberately public. Re-capture the sources with
 * scratchpad/shoot-theme.mjs, then point SRC at them.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SRC = process.argv[2];
if (!SRC) { console.error('usage: node scripts/theme-shots.mjs <folder of captures>'); process.exit(1); }
const OUT = 'public/img/cards';
mkdirSync(OUT, { recursive: true });

const jobs = [
  ['efoli-tall', `${SRC}/home.png`, null, 900],
  // the live app stage in the hero: four widgets in their real states
  ['efoli-1', `${SRC}/home.png`, { left: 770, top: 150, width: 710, height: 580 }, 640],
  // The dark support block and the custom footer. Cut nearer to the slot's
  // own shape: a wide strip in a tall slot gets object-fit cropped to a band
  // across the middle with the text cut off at both ends.
  ['efoli-2', `${SRC}/b.png`, { left: 200, top: 300, width: 780, height: 620 }, 640],
];

for (const [name, src, crop, w] of jobs) {
  let img = sharp(src);
  if (crop) img = img.extract(crop);
  const i = await img.resize(w).webp({ quality: 80 }).toFile(`${OUT}/${name}.webp`);
  console.log(`${name.padEnd(11)} ${i.width}x${i.height}  ${(i.size / 1024).toFixed(0)}KB`);
}

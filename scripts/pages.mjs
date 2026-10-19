/**
 * Thumbnails for the landing pages in the Work section.
 *
 * The sources are screenshots of the pages as they are actually published, at
 * 1440x900, taken with Playwright. Cropped to the top 1440x760 so each one
 * shows its hero rather than whatever happens to be halfway down.
 *
 * Re-take the sources with:
 *   node scripts/shoot-pages.mjs
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SRC = process.argv[2];
if (!SRC) {
  console.error('usage: node scripts/pages.mjs <folder of 1440x900 png screenshots>');
  process.exit(1);
}
const OUT = 'public/img/pages';
mkdirSync(OUT, { recursive: true });

const kb = (n) => `${(n / 1024).toFixed(0)}KB`;

for (const name of ['legal', 'fruit', 'summer', 'travel']) {
  for (const w of [480, 960]) {
    const info = await sharp(`${SRC}/${name}.png`)
      .extract({ left: 0, top: 0, width: 1440, height: 760 })
      .resize(w)
      .webp({ quality: 80 })
      .toFile(`${OUT}/${name}-${w}.webp`);
    if (w === 960) console.log(`${name}-${w}.webp  ${kb(info.size)}  ${info.width}x${info.height}`);
  }
}

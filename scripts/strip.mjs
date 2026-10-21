/**
 * Tiles for the snippets and landing-pages line.
 *
 * Same treatment as the photo reel: one height, natural width, so a wide
 * landing page and a tall configurator sit in the same row without either
 * being cropped into something unreadable.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const OUT = 'public/img/strip';
mkdirSync(OUT, { recursive: true });
const H = 560;

const tiles = [
  ['snippets', 'public/img/built/snippets-960.webp'],
  ['legal', 'public/img/pages/legal-960.webp'],
  ['fruit', 'public/img/pages/fruit-960.webp'],
  ['summer', 'public/img/pages/summer-960.webp'],
  ['travel', 'public/img/pages/travel-960.webp'],
  ['config', 'public/img/story/story1-config-760.webp'],
];

for (const [name, src] of tiles) {
  const i = await sharp(src)
    .resize({ height: H, withoutEnlargement: false })
    .webp({ quality: 78 })
    .toFile(`${OUT}/${name}.webp`);
  console.log(`${name.padEnd(9)} ${i.width}x${i.height}`);
}

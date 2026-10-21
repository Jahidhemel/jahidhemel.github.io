/**
 * Images for the stacking project cards: one tall shot of the tool plus two
 * detail crops of the same screenshot, so all three are the real thing.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
const OUT = 'public/img/cards';
mkdirSync(OUT, { recursive: true });

// [name, source, [detail crops as fractions of the source]]
const set = [
  ['mscc', 'public/img/built/mscc-960.webp', [[0.0, 0.0, 0.52, 0.30], [0.50, 0.22, 0.50, 0.55]]],
  ['assistant', 'public/img/built/assistant-960.webp', [[0.10, 0.08, 0.45, 0.32], [0.08, 0.55, 0.52, 0.40]]],
  ['qahelper', 'public/img/built/qahelper-960.webp', [[0.06, 0.06, 0.46, 0.30], [0.46, 0.30, 0.50, 0.45]]],
];

for (const [name, src, crops] of set) {
  const m = await sharp(src).metadata();
  await sharp(src).resize(900).webp({ quality: 78 }).toFile(`${OUT}/${name}-tall.webp`);
  for (let i = 0; i < crops.length; i++) {
    const [fx, fy, fw, fh] = crops[i];
    await sharp(src)
      .extract({
        left: Math.round(m.width * fx),
        top: Math.round(m.height * fy),
        width: Math.round(m.width * fw),
        height: Math.round(m.height * fh),
      })
      .resize(640)
      .webp({ quality: 78 })
      .toFile(`${OUT}/${name}-${i + 1}.webp`);
  }
}
console.log('card images written');

/**
 * The hero portrait.
 *
 * The source arrives as a circle with a white ring on a two-tone background.
 * Scanning for the ring put the photograph at centre (267, 240) with an inner
 * radius of 231; cropping to 229 keeps the crop just inside it, so no white
 * arc survives and the top of his head is not shaved off by the mask.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
mkdirSync('public/img', { recursive: true });

const cx = 267, cy = 240, r = 229;
for (const w of [360, 720]) {
  const info = await sharp('public/img/profile.jpg')
    .extract({ left: cx - r, top: cy - r, width: r * 2, height: r * 2 })
    .resize(w, w, { fit: 'cover' })
    .webp({ quality: 84 })
    .toFile(`public/img/portrait-${w}.webp`);
  console.log(`portrait-${w}.webp  ${(info.size / 1024).toFixed(0)}KB`);
}

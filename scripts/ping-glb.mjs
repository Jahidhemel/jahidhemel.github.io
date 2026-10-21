/**
 * Writes public/ping.glb — Ping, the site's robot, as an actual 3D model.
 *
 * Primitives placed by hand; no scan and no generated mesh. The container
 * writer and the shapes live in lib/glb.mjs, shared with the avatar.
 *
 *   node scripts/ping-glb.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { sphere, cylinder, torus, buildGlb } from './lib/glb.mjs';

const materials = {
  shell:  { color: [0.890, 0.925, 0.961, 1], metallic: 0.15, roughness: 0.45 },
  accent: { color: [0.133, 0.827, 0.933, 1], metallic: 0.25, roughness: 0.30 },
  dark:   { color: [0.047, 0.047, 0.047, 1], metallic: 0.40, roughness: 0.20 },
  glow:   { color: [0.650, 0.950, 1.000, 1], metallic: 0, roughness: 0.60, emissive: [0.35, 0.85, 0.95] },
};

const parts = [
  // head and face
  [sphere(1, 32, 24), 'shell', [0, 1.05, 0], [1, 0.92, 0.9]],
  [sphere(1, 32, 24), 'dark', [0, 1.06, 0.52], [0.72, 0.56, 0.5]],
  [sphere(1, 20, 14), 'glow', [-0.26, 1.1, 0.86], [0.12, 0.14, 0.1]],
  [sphere(1, 20, 14), 'glow', [0.26, 1.1, 0.86], [0.12, 0.14, 0.1]],
  // Headphones. The band is a half turn over the top: a full ring lying flat
  // cuts across the visor like a hat brim, and closed it dips through him.
  [torus(1.04, 0.07, 30, 14, Math.PI, Math.PI), 'accent', [0, 1.05, -0.04], [1, 1, 1], [Math.PI / 2, 0, 0]],
  [cylinder(1, 1, 1, 26), 'accent', [-1.0, 1.05, -0.04], [0.27, 0.3, 0.27], [0, 0, Math.PI / 2]],
  [cylinder(1, 1, 1, 26), 'accent', [1.0, 1.05, -0.04], [0.27, 0.3, 0.27], [0, 0, Math.PI / 2]],
  // Antenna, set back so it clears the band rather than growing through it.
  [cylinder(0.045, 0.045, 1, 12), 'shell', [0, 2.12, -0.3], [1, 0.46, 1], [0.22, 0, 0]],
  [sphere(1, 20, 14), 'accent', [0, 2.4, -0.36], [0.14, 0.14, 0.14]],
  // body and arms
  [sphere(1, 32, 24), 'shell', [0, -0.35, 0], [0.78, 0.72, 0.68]],
  [sphere(1, 20, 14), 'accent', [0, -0.25, 0.63], [0.13, 0.13, 0.08]],
  [cylinder(0.12, 0.1, 1, 16), 'shell', [-0.68, -0.46, 0.06], [1, 0.58, 1], [0, 0, 0.75]],
  [cylinder(0.12, 0.1, 1, 16), 'shell', [0.68, -0.46, 0.06], [1, 0.58, 1], [0, 0, -0.75]],
];

mkdirSync('public', { recursive: true });
const out = buildGlb({ parts, materials, name: 'Ping' });
writeFileSync('public/ping.glb', out);

const tris = parts.reduce((a, [g]) => a + g.idx.length / 3, 0);
console.log(`public/ping.glb  ${(out.length / 1024).toFixed(0)}KB  ${parts.length} meshes  ${tris} triangles`);

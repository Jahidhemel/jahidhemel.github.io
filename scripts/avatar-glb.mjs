/**
 * Writes public/hemel.glb — a stylised 3D avatar for the hero.
 *
 * This is NOT a scan and NOT a likeness in any photographic sense. There is
 * no image-to-3D model available here, so it is a caricature built out of
 * primitives by hand, from looking at his photographs: short dark hair swept
 * up at the front, a full connected beard, thick brows, navy suit, light blue
 * shirt and a dark tie. The same approach as the robot, aimed at a person.
 *
 * Kept deliberately stylised rather than chasing realism. A low-poly head
 * that reaches for a real face lands in the uncanny valley; one that reads as
 * a character does not.
 *
 *   node scripts/avatar-glb.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { sphere, shell, cylinder, box, buildGlb } from './lib/glb.mjs';

const materials = {
  skin:  { color: [0.722, 0.522, 0.380, 1], metallic: 0, roughness: 0.72 },
  hair:  { color: [0.075, 0.062, 0.058, 1], metallic: 0.05, roughness: 0.55, doubleSided: true },
  white: { color: [0.960, 0.960, 0.960, 1], metallic: 0, roughness: 0.35 },
  iris:  { color: [0.160, 0.105, 0.070, 1], metallic: 0, roughness: 0.25 },
  suit:  { color: [0.118, 0.153, 0.247, 1], metallic: 0.05, roughness: 0.68 },
  shirt: { color: [0.678, 0.800, 0.898, 1], metallic: 0, roughness: 0.70 },
  tie:   { color: [0.090, 0.125, 0.200, 1], metallic: 0.1, roughness: 0.45 },
  lip:   { color: [0.420, 0.250, 0.205, 1], metallic: 0, roughness: 0.6 },
};

const HEAD_Y = 1.18;

const parts = [
  /* ---- head ---- */
  [sphere(1, 18, 12), 'skin', [0, HEAD_Y, 0], [0.93, 1.03, 0.90]],
  [sphere(1, 18, 12), 'skin', [-0.90, HEAD_Y - 0.04, -0.06], [0.11, 0.18, 0.10]],
  [sphere(1, 18, 12), 'skin', [0.90, HEAD_Y - 0.04, -0.06], [0.11, 0.18, 0.10]],

  /* ---- beard ----
     Built from masses, not a latitude band. A band cuts a hard horizontal
     line across the face and buries the nose and mouth with it, which reads
     as a balaclava. A chin mass with cheeks either side gives the shape, and
     the nose and mouth sit proud of it so they come through. */
  // A trimmed beard hugging the jaw, not a mass over the whole face.
  [sphere(1, 18, 12), 'hair', [0, HEAD_Y - 0.62, 0.10], [0.74, 0.44, 0.60]],
  [sphere(1, 16, 11), 'hair', [-0.70, HEAD_Y - 0.34, 0.14], [0.17, 0.30, 0.28]],
  [sphere(1, 16, 11), 'hair', [0.70, HEAD_Y - 0.34, 0.14], [0.17, 0.30, 0.28]],
  // moustache, and the mouth just under it
  [sphere(1, 18, 12), 'hair', [0, HEAD_Y - 0.21, 0.83], [0.22, 0.07, 0.14]],
  [sphere(1, 18, 12), 'lip', [0, HEAD_Y - 0.33, 0.84], [0.12, 0.03, 0.06]],

  /* ---- hair ----
     A cap that comes down to the temples, and a sweep of volume above the
     forehead rather than a ball on the crown. */
  [shell(1, 28, 14, 0, 1.12), 'hair', [0, HEAD_Y, -0.05], [0.985, 1.065, 0.965]],
  [sphere(1, 18, 12), 'hair', [0, HEAD_Y + 0.66, 0.10], [0.72, 0.30, 0.60]],

  /* ---- eyes ---- */
  [sphere(1, 16, 11), 'white', [-0.31, HEAD_Y + 0.10, 0.74], [0.135, 0.098, 0.085]],
  [sphere(1, 16, 11), 'white', [0.31, HEAD_Y + 0.10, 0.74], [0.135, 0.098, 0.085]],
  [sphere(1, 16, 12), 'iris', [-0.31, HEAD_Y + 0.085, 0.82], [0.065, 0.065, 0.045]],
  [sphere(1, 16, 12), 'iris', [0.31, HEAD_Y + 0.085, 0.82], [0.065, 0.065, 0.045]],

  /* ---- brows: thick and level, which is most of the expression ---- */
  [box(0.33, 0.07, 0.10), 'hair', [-0.31, HEAD_Y + 0.29, 0.78], null, [0, 0, 0.09]],
  [box(0.33, 0.07, 0.10), 'hair', [0.31, HEAD_Y + 0.29, 0.78], null, [0, 0, -0.09]],

  /* ---- nose: smaller and flatter than the first pass, which was an egg -- */
  [sphere(1, 22, 16), 'skin', [0, HEAD_Y - 0.01, 0.86], [0.105, 0.145, 0.125]],

  /* ---- neck, narrow enough to sit inside the collar ---- */
  [cylinder(0.26, 0.30, 1, 18), 'skin', [0, HEAD_Y - 0.96, -0.02], [1, 0.40, 1]],

  /* ---- shoulders, collar and tie ---- */
  [sphere(1, 36, 22), 'suit', [0, -0.66, 0], [1.24, 0.62, 0.74]],
  // the shirt showing at the opening: an oval, not the ball it was
  [sphere(1, 18, 12), 'shirt', [0, -0.22, 0.44], [0.24, 0.30, 0.14]],
  // collar, two lapels angled off the centre
  [box(0.30, 0.34, 0.1), 'suit', [-0.22, -0.26, 0.47], null, [0.18, 0, 0.42]],
  [box(0.30, 0.34, 0.1), 'suit', [0.22, -0.26, 0.47], null, [0.18, 0, -0.42]],
  // the tie, hanging from the collar rather than floating on the chest
  [box(0.15, 0.17, 0.08), 'tie', [0, -0.26, 0.52], null, [0.2, 0, 0]],
  [box(0.13, 0.52, 0.08), 'tie', [0, -0.58, 0.49], null, [0.22, 0, 0]],
];

mkdirSync('public', { recursive: true });
const out = buildGlb({ parts, materials, name: 'Hemel' });
writeFileSync('public/hemel.glb', out);

const tris = parts.reduce((a, [g]) => a + g.idx.length / 3, 0);
console.log(`public/hemel.glb  ${(out.length / 1024).toFixed(0)}KB  ${parts.length} meshes  ${tris} triangles`);

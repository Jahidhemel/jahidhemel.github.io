/**
 * Writes public/ping.glb — Ping, as an actual 3D model.
 *
 * There is no image-to-3D model available here, so this is not a scan of a
 * photograph and it is deliberately not a likeness of anyone. It is the robot
 * from the site, built out of primitives in code: spheres, cylinders, a torus
 * and a rounded body, placed by hand.
 *
 * The file is written straight to the glTF 2.0 binary container rather than
 * through a library: a 12-byte header, a JSON chunk and a binary chunk, each
 * padded to a four-byte boundary. Positions carry min/max because the spec
 * requires it for POSITION accessors and loaders use it to frame the model.
 *
 *   node scripts/ping-glb.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';

/* ------------------------------------------------------------- geometry ---- */

/** Each builder returns { pos: number[], nrm: number[], idx: number[] }. */

function sphere(r = 1, seg = 28, rings = 20) {
  const pos = [], nrm = [], idx = [];
  for (let y = 0; y <= rings; y++) {
    const v = y / rings;
    const phi = v * Math.PI;
    for (let x = 0; x <= seg; x++) {
      const u = x / seg;
      const theta = u * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      pos.push(nx * r, ny * r, nz * r);
      nrm.push(nx, ny, nz);
    }
  }
  for (let y = 0; y < rings; y++) {
    for (let x = 0; x < seg; x++) {
      const a = y * (seg + 1) + x;
      const b = a + seg + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { pos, nrm, idx };
}

function cylinder(rTop = 1, rBot = 1, h = 1, seg = 24, caps = true) {
  const pos = [], nrm = [], idx = [];
  const half = h / 2;
  // side
  for (let y = 0; y <= 1; y++) {
    const r = y === 0 ? rBot : rTop;
    const py = y === 0 ? -half : half;
    for (let x = 0; x <= seg; x++) {
      const theta = (x / seg) * Math.PI * 2;
      const cx = Math.cos(theta), cz = Math.sin(theta);
      pos.push(cx * r, py, cz * r);
      nrm.push(cx, 0, cz);
    }
  }
  for (let x = 0; x < seg; x++) {
    const a = x, b = x + seg + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  if (caps) {
    for (const [py, ny, r] of [[half, 1, rTop], [-half, -1, rBot]]) {
      const centre = pos.length / 3;
      pos.push(0, py, 0); nrm.push(0, ny, 0);
      const ring = pos.length / 3;
      for (let x = 0; x <= seg; x++) {
        const theta = (x / seg) * Math.PI * 2;
        pos.push(Math.cos(theta) * r, py, Math.sin(theta) * r);
        nrm.push(0, ny, 0);
      }
      for (let x = 0; x < seg; x++) {
        if (ny > 0) idx.push(centre, ring + x, ring + x + 1);
        else idx.push(centre, ring + x + 1, ring + x);
      }
    }
  }
  return { pos, nrm, idx };
}

/**
 * `arc` and `from` cut a partial ring. A headphone band is an arc over the
 * head, not a full circle: closed, the lower half dips straight through his
 * chest.
 */
function torus(R = 1, r = 0.25, seg = 36, rings = 16, arc = Math.PI * 2, from = 0) {
  const pos = [], nrm = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const u = from + (i / seg) * arc;
    for (let j = 0; j <= rings; j++) {
      const v = (j / rings) * Math.PI * 2;
      const cx = Math.cos(u), sx = Math.sin(u);
      const nx = Math.cos(v) * cx, ny = Math.sin(v), nz = Math.cos(v) * sx;
      pos.push((R + r * Math.cos(v)) * cx, r * Math.sin(v), (R + r * Math.cos(v)) * sx);
      nrm.push(nx, ny, nz);
    }
  }
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < rings; j++) {
      const a = i * (rings + 1) + j;
      const b = a + rings + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { pos, nrm, idx };
}

/* --------------------------------------------------------------- the rig ---- */

const SHELL = [0.890, 0.925, 0.961, 1];   // #E3ECF5, the body
const ACCENT = [0.133, 0.827, 0.933, 1];  // #22D3EE, the site's cyan
const DARK = [0.047, 0.047, 0.047, 1];    // visor
const GLOW = [0.65, 0.95, 1.0, 1];        // eyes

/** [geometry, material, translation, scale, rotationEuler] */
const parts = [
  // head and face
  [sphere(1, 32, 24), 'shell', [0, 1.05, 0], [1, 0.92, 0.9]],
  [sphere(1, 32, 24), 'dark', [0, 1.06, 0.52], [0.72, 0.56, 0.5]],
  [sphere(1, 20, 14), 'glow', [-0.26, 1.1, 0.86], [0.12, 0.14, 0.1]],
  [sphere(1, 20, 14), 'glow', [0.26, 1.1, 0.86], [0.12, 0.14, 0.1]],
  // Headphones. The band is a ring in the XY plane, turned a quarter turn
  // about X: left flat it lies around his head like a hat brim and cuts
  // straight across the visor.
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

/* ------------------------------------------------- pack it into a container -- */

const chunks = [];          // Buffer pieces, in order
let byteLength = 0;
const bufferViews = [];
const accessors = [];

function push(data, target) {
  // Each view starts on a four-byte boundary, which float and short both need.
  const pad = (4 - (byteLength % 4)) % 4;
  if (pad) { chunks.push(Buffer.alloc(pad)); byteLength += pad; }
  const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  const view = { buffer: 0, byteOffset: byteLength, byteLength: buf.length };
  if (target !== undefined) view.target = target;
  bufferViews.push(view);
  chunks.push(buf);
  byteLength += buf.length;
  return bufferViews.length - 1;
}

function addFloat3(arr) {
  const data = new Float32Array(arr);
  const view = push(data, 34962); // ARRAY_BUFFER
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < arr.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      if (arr[i + k] < min[k]) min[k] = arr[i + k];
      if (arr[i + k] > max[k]) max[k] = arr[i + k];
    }
  }
  accessors.push({ bufferView: view, componentType: 5126, count: arr.length / 3, type: 'VEC3', min, max });
  return accessors.length - 1;
}

function addIndices(arr) {
  const data = new Uint32Array(arr);
  const view = push(data, 34963); // ELEMENT_ARRAY_BUFFER
  accessors.push({ bufferView: view, componentType: 5125, count: arr.length, type: 'SCALAR' });
  return accessors.length - 1;
}

const matIndex = { shell: 0, accent: 1, dark: 2, glow: 3 };
const materials = [
  { name: 'shell', pbrMetallicRoughness: { baseColorFactor: SHELL, metallicFactor: 0.15, roughnessFactor: 0.45 } },
  { name: 'accent', pbrMetallicRoughness: { baseColorFactor: ACCENT, metallicFactor: 0.25, roughnessFactor: 0.3 } },
  { name: 'dark', pbrMetallicRoughness: { baseColorFactor: DARK, metallicFactor: 0.4, roughnessFactor: 0.2 } },
  {
    name: 'glow',
    pbrMetallicRoughness: { baseColorFactor: GLOW, metallicFactor: 0, roughnessFactor: 0.6 },
    emissiveFactor: [0.35, 0.85, 0.95],
  },
];

/** Euler XYZ to quaternion, because glTF nodes store rotation as a quaternion. */
function quat([x, y, z]) {
  const cx = Math.cos(x / 2), sx = Math.sin(x / 2);
  const cy = Math.cos(y / 2), sy = Math.sin(y / 2);
  const cz = Math.cos(z / 2), sz = Math.sin(z / 2);
  return [
    sx * cy * cz + cx * sy * sz,
    cx * sy * cz - sx * cy * sz,
    cx * cy * sz + sx * sy * cz,
    cx * cy * cz - sx * sy * sz,
  ];
}

const meshes = [];
const nodes = [];

for (const [geo, mat, translation, scale, rotation] of parts) {
  const p = addFloat3(geo.pos);
  const n = addFloat3(geo.nrm);
  const i = addIndices(geo.idx);
  meshes.push({ primitives: [{ attributes: { POSITION: p, NORMAL: n }, indices: i, material: matIndex[mat] }] });
  const node = { mesh: meshes.length - 1 };
  if (translation) node.translation = translation;
  if (scale) node.scale = scale;
  if (rotation) node.rotation = quat(rotation);
  nodes.push(node);
}

// One parent so the whole robot can be turned as a unit.
const children = nodes.map((_, i) => i);
nodes.push({ name: 'Ping', children });

const gltf = {
  asset: { version: '2.0', generator: 'ping-glb.mjs' },
  scene: 0,
  scenes: [{ nodes: [nodes.length - 1] }],
  nodes,
  meshes,
  materials,
  accessors,
  bufferViews,
  buffers: [{ byteLength }],
};

const bin = Buffer.concat(chunks);
const json = Buffer.from(JSON.stringify(gltf), 'utf8');
const jsonPad = Buffer.alloc((4 - (json.length % 4)) % 4, 0x20); // spaces
const binPad = Buffer.alloc((4 - (bin.length % 4)) % 4, 0);

const jsonChunk = Buffer.concat([json, jsonPad]);
const binChunk = Buffer.concat([bin, binPad]);

const header = Buffer.alloc(12);
header.write('glTF', 0, 'ascii');
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);

const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(jsonChunk.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(binChunk.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4); // 'BIN'

mkdirSync('public', { recursive: true });
const out = Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]);
writeFileSync('public/ping.glb', out);

const tris = parts.reduce((a, [g]) => a + g.idx.length / 3, 0);
console.log(`public/ping.glb  ${(out.length / 1024).toFixed(0)}KB  ${parts.length} meshes  ${tris} triangles`);

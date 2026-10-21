/**
 * A small glTF 2.0 writer, and the primitives the models are built from.
 *
 * Shared by the two models in scripts/, so there is one implementation of the
 * binary container rather than a copy per model drifting out of step.
 *
 * Nothing here is a scan or a generated mesh: every model is primitives
 * placed by hand.
 */

/* ----------------------------------------------------------- primitives ---- */
/** Each builder returns { pos, nrm, idx } as plain arrays. */

export function sphere(r = 1, seg = 28, rings = 20) {
  const pos = [], nrm = [], idx = [];
  for (let y = 0; y <= rings; y++) {
    const phi = (y / rings) * Math.PI;
    for (let x = 0; x <= seg; x++) {
      const theta = (x / seg) * Math.PI * 2;
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

/**
 * `from` and `arc` cut a partial sphere by latitude: a cap for a hairline, a
 * band for a beard. Measured from the top, so from=0 is the crown.
 */
export function shell(r = 1, seg = 32, rings = 20, from = 0, arc = Math.PI) {
  const pos = [], nrm = [], idx = [];
  for (let y = 0; y <= rings; y++) {
    const phi = from + (y / rings) * arc;
    for (let x = 0; x <= seg; x++) {
      const theta = (x / seg) * Math.PI * 2;
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

export function cylinder(rTop = 1, rBot = 1, h = 1, seg = 24, caps = true) {
  const pos = [], nrm = [], idx = [];
  const half = h / 2;
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
 * head, not a full circle: closed, the lower half dips through the chest.
 */
export function torus(R = 1, r = 0.25, seg = 36, rings = 16, arc = Math.PI * 2, from = 0) {
  const pos = [], nrm = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const u = from + (i / seg) * arc;
    for (let j = 0; j <= rings; j++) {
      const v = (j / rings) * Math.PI * 2;
      const cx = Math.cos(u), sx = Math.sin(u);
      pos.push((R + r * Math.cos(v)) * cx, r * Math.sin(v), (R + r * Math.cos(v)) * sx);
      nrm.push(Math.cos(v) * cx, Math.sin(v), Math.cos(v) * sx);
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

export function box(w = 1, h = 1, d = 1) {
  const x = w / 2, y = h / 2, z = d / 2;
  const faces = [
    [[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z],[0,0,1]],
    [[x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z],[0,0,-1]],
    [[x,-y,z],[x,-y,-z],[x,y,-z],[x,y,z],[1,0,0]],
    [[-x,-y,-z],[-x,-y,z],[-x,y,z],[-x,y,-z],[-1,0,0]],
    [[-x,y,z],[x,y,z],[x,y,-z],[-x,y,-z],[0,1,0]],
    [[-x,-y,-z],[x,-y,-z],[x,-y,z],[-x,-y,z],[0,-1,0]],
  ];
  const pos = [], nrm = [], idx = [];
  for (const [a, b, c, d2, n] of faces) {
    const base = pos.length / 3;
    for (const v of [a, b, c, d2]) { pos.push(...v); nrm.push(...n); }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { pos, nrm, idx };
}

/** Euler XYZ to quaternion: glTF nodes store rotation as a quaternion. */
export function quat([x, y, z]) {
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

/* ------------------------------------------------------------- the writer -- */

/**
 * parts:     [geometry, materialName, translation?, scale?, rotationEuler?]
 * materials: { name: { color:[r,g,b,a], metallic?, roughness?, emissive? } }
 * Returns the .glb as a Buffer.
 */
export function buildGlb({ parts, materials, name = 'Model' }) {
  const chunks = [];
  let byteLength = 0;
  const bufferViews = [];
  const accessors = [];

  function push(data, target) {
    // Each view starts on a four-byte boundary, which float and int both need.
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
    const view = push(new Float32Array(arr), 34962);
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < arr.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        if (arr[i + k] < min[k]) min[k] = arr[i + k];
        if (arr[i + k] > max[k]) max[k] = arr[i + k];
      }
    }
    // POSITION accessors must carry min/max; loaders frame the model with it.
    accessors.push({ bufferView: view, componentType: 5126, count: arr.length / 3, type: 'VEC3', min, max });
    return accessors.length - 1;
  }

  function addIndices(arr) {
    const view = push(new Uint32Array(arr), 34963);
    accessors.push({ bufferView: view, componentType: 5125, count: arr.length, type: 'SCALAR' });
    return accessors.length - 1;
  }

  const matNames = Object.keys(materials);
  const matIndex = Object.fromEntries(matNames.map((n, i) => [n, i]));
  const gltfMaterials = matNames.map((n) => {
    const m = materials[n];
    const out = {
      name: n,
      pbrMetallicRoughness: {
        baseColorFactor: m.color,
        metallicFactor: m.metallic ?? 0.1,
        roughnessFactor: m.roughness ?? 0.6,
      },
    };
    if (m.emissive) out.emissiveFactor = m.emissive;
    // An open shell is a surface, not a solid: with back faces culled you see
    // its far interior through the silhouette and nothing where you expect it.
    if (m.doubleSided) out.doubleSided = true;
    return out;
  });

  const meshes = [];
  const nodes = [];
  for (const [geo, mat, translation, scale, rotation] of parts) {
    const p = addFloat3(geo.pos);
    const nn = addFloat3(geo.nrm);
    const i = addIndices(geo.idx);
    meshes.push({ primitives: [{ attributes: { POSITION: p, NORMAL: nn }, indices: i, material: matIndex[mat] }] });
    const node = { mesh: meshes.length - 1 };
    if (translation) node.translation = translation;
    if (scale) node.scale = scale;
    if (rotation) node.rotation = quat(rotation);
    nodes.push(node);
  }

  // One parent, so the whole model turns as a unit.
  nodes.push({ name, children: nodes.map((_, i) => i) });

  const gltf = {
    asset: { version: '2.0', generator: 'scripts/lib/glb.mjs' },
    scene: 0,
    scenes: [{ nodes: [nodes.length - 1] }],
    nodes,
    meshes,
    materials: gltfMaterials,
    accessors,
    bufferViews,
    buffers: [{ byteLength }],
  };

  const bin = Buffer.concat(chunks);
  const json = Buffer.from(JSON.stringify(gltf), 'utf8');
  const jsonChunk = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
  const binChunk = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4, 0)]);

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

  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]);
}

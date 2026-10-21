/**
 * A glTF model, rendered live in a slot on the page.
 *
 * three.js is imported dynamically, so the rest of the page is interactive
 * before any of it is fetched, and a visitor who never gets this far never
 * pays for it. Until the model is up the photograph stays on screen, and if
 * anything fails — no WebGL, a blocked file, a context loss — the photograph
 * simply stays. There is no state in which the hero is empty.
 *
 * He turns towards the pointer rather than spinning: a model that rotates on
 * its own reads as a product viewer, one that looks at you reads as a
 * character.
 */

export interface ModelOpts {
  /** Which .glb to load. */
  url: string;
  /** Camera placement, per model: a head needs a different frame to a robot. */
  camera?: [number, number, number];
  lookAt?: [number, number, number];
  /** Off for a model that is decoration rather than the centrepiece. */
  drag?: boolean;
  /**
   * Rim light, as [colour, intensity]. The strong cyan rim that makes the
   * robot read against a near-black page turns skin green, so a model with
   * a face asks for a cooler-but-weaker rim and a little front fill.
   */
  rim?: [number, number];
  fill?: number;
}

export async function mountModel(host: HTMLElement, opts: ModelOpts): Promise<void> {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // A cheap probe first. Constructing a WebGLRenderer on a machine without a
  // context throws, and that would leave the page with an exception in the
  // console for no gain.
  const probe = document.createElement('canvas');
  const supported = !!(probe.getContext('webgl2') || probe.getContext('webgl'));
  if (!supported) return;

  const THREE = await import('three');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');

  const canvas = document.createElement('canvas');
  canvas.className = 'model3d';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  let renderer: InstanceType<typeof THREE.WebGLRenderer>;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    canvas.remove();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const [cxp, cyp, czp] = opts.camera ?? [0, 1.18, 5.9];
  const [lxp, lyp, lzp] = opts.lookAt ?? [0, 0.92, 0];
  camera.position.set(cxp, cyp, czp);
  camera.lookAt(lxp, lyp, lzp);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x16202c, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(3, 5, 4);
  scene.add(key);
  // A rim from behind, so the model reads against a near-black page.
  const [rimColour, rimPower] = opts.rim ?? [0x22d3ee, 1.8];
  const rim = new THREE.DirectionalLight(rimColour, rimPower);
  rim.position.set(-4, 2, -3);
  scene.add(rim);
  if (opts.fill) {
    const fill = new THREE.DirectionalLight(0xffffff, opts.fill);
    fill.position.set(-2, 1, 5);
    scene.add(fill);
  }

  const root = new THREE.Group();
  scene.add(root);

  function size() {
    const r = host.getBoundingClientRect();
    const s = Math.max(1, Math.min(r.width, r.height || r.width));
    renderer.setSize(s, s, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }

  let model: InstanceType<typeof THREE.Object3D> | null = null;
  await new Promise<void>((resolve) => {
    new GLTFLoader().load(
      opts.url,
      (gltf) => {
        model = gltf.scene;
        root.add(model);
        resolve();
      },
      undefined,
      () => resolve(),
    );
  });

  if (!model) {
    canvas.remove();
    return;
  }

  // Only now is there something to look at, so only now does the photo go.
  host.classList.add('is-3d');
  size();

  // Two inputs, added together: a base you set by dragging him, and a small
  // lean towards the pointer on top. Drag alone would freeze him; follow
  // alone would undo every drag the moment you let go.
  let aimX = 0;
  let aimY = 0;
  let baseY = 0;
  let baseX = 0;
  let spinY = 0; // carried velocity, so a flick keeps turning
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  if (!reduced) {
    window.addEventListener(
      'pointermove',
      (e) => {
        aimX = (e.clientX / window.innerWidth - 0.5) * 2;
        aimY = (e.clientY / window.innerHeight - 0.5) * 2;
      },
      { passive: true },
    );
  }

  const canDrag = opts.drag !== false;
  if (canDrag) {
    canvas.style.pointerEvents = 'auto';
    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'grab';
  }

  if (canDrag) canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    spinY = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture(e.pointerId);
  });

  if (canDrag) canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    baseY += dx * 0.01;
    // Clamped, or he tips over and you are looking at the inside of his head.
    baseX = Math.max(-0.6, Math.min(0.6, baseX + dy * 0.006));
    spinY = dx * 0.01;
  });

  function endDrag(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    canvas.style.cursor = 'grab';
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  }
  if (canDrag) {
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
  }

  let raf = 0;
  let running = true;
  const start = performance.now();

  function frame(now: number) {
    if (!running) return;
    const t = (now - start) / 1000;
    if (!dragging) {
      // A flick keeps turning, then settles.
      baseY += spinY;
      spinY *= 0.94;
      if (Math.abs(spinY) < 0.0002) spinY = 0;
    }
    // Chase the pointer rather than snapping to it, and breathe a little.
    const wantY = baseY + aimX * 0.32;
    const wantX = baseX + aimY * 0.18;
    root.rotation.y += (wantY - root.rotation.y) * (dragging ? 0.5 : 0.08);
    root.rotation.x += (wantX - root.rotation.x) * (dragging ? 0.5 : 0.08);
    root.position.y = Math.sin(t * 1.1) * 0.06;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  if (reduced) {
    renderer.render(scene, camera);
  } else {
    raf = requestAnimationFrame(frame);
  }

  // Stop when he is off screen or the tab is hidden: a rAF loop rendering a
  // model nobody can see is just heat.
  const io = new IntersectionObserver((entries) => {
    const visible = entries.some((e) => e.isIntersecting) && !document.hidden;
    if (visible && !running && !reduced) {
      running = true;
      raf = requestAnimationFrame(frame);
    } else if (!visible && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  });
  io.observe(host);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running) {
      running = false;
      cancelAnimationFrame(raf);
    } else if (!document.hidden && !running && !reduced) {
      running = true;
      raf = requestAnimationFrame(frame);
    }
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    running = false;
    cancelAnimationFrame(raf);
    // Hand the hero back to the photograph rather than showing a blank square.
    host.classList.remove('is-3d');
  });

  window.addEventListener('resize', size, { passive: true });
}

/**
 * Ping, rendered live in the hero.
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

export async function mountPing3d(host: HTMLElement): Promise<void> {
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
  canvas.className = 'ping3d';
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
  camera.position.set(0, 1.18, 5.9);
  camera.lookAt(0, 0.92, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x16202c, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(3, 5, 4);
  scene.add(key);
  // A cyan rim from behind, so he reads against a near-black page.
  const rim = new THREE.DirectionalLight(0x22d3ee, 1.8);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

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
      '/ping.glb',
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

  let aimX = 0;
  let aimY = 0;
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

  let raf = 0;
  let running = true;
  const start = performance.now();

  function frame(now: number) {
    if (!running) return;
    const t = (now - start) / 1000;
    // Chase the pointer rather than snapping to it, and breathe a little.
    root.rotation.y += (aimX * 0.5 - root.rotation.y) * 0.06;
    root.rotation.x += (aimY * 0.28 - root.rotation.x) * 0.06;
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
